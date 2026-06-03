export interface MarkdownSection {
  heading: string
  body: string
}

export function splitMarkdownIntoSections(markdown: string): { frontMatter: string; sections: MarkdownSection[] } {
  let content = markdown
  let frontMatter = ''

  const fmMatch = content.match(/^(---\s*\n[\s\S]*?\n---\s*\n?)/)
  if (fmMatch) {
    frontMatter = fmMatch[1]!
    content = content.slice(fmMatch[0]!.length)
  }

  const sections: MarkdownSection[] = []
  const rawSections = content.split(/(?=^# )/m).filter(s => s.trim())

  for (const raw of rawSections) {
    const headingMatch = raw.match(/^# (.+)\n?([\s\S]*)/)
    if (!headingMatch) continue
    sections.push({
      heading: headingMatch[1]!.trim(),
      body: (headingMatch[2] ?? '').trim(),
    })
  }

  return { frontMatter, sections }
}

export function rebuildMarkdown(frontMatter: string, sections: MarkdownSection[]): string {
  const parts = [frontMatter.trimEnd()]
  for (const s of sections) {
    parts.push(`# ${s.heading}\n\n${s.body}`)
  }
  return parts.join('\n\n')
}

export function useSectionEditor() {
  const markdown = useState<string>('editorMarkdown')
  const editingIndex = ref<number | null>(null)
  const isEditing = ref(false)
  const editError = ref<string | null>(null)
  const { documentType } = useProposalState()

  async function editSection(sectionIndex: number, instruction: string) {
    const { frontMatter, sections } = splitMarkdownIntoSections(markdown.value)
    const section = sections[sectionIndex]
    if (!section) return

    const sectionMarkdown = `# ${section.heading}\n\n${section.body}`
    const fullContext = markdown.value

    editingIndex.value = sectionIndex
    isEditing.value = true
    editError.value = null

    let result = ''

    try {
      const response = await fetch('/api/edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionMarkdown,
          instruction,
          type: documentType.value,
          fullContext,
        }),
      })

      if (!response.ok) throw new Error(`Edit failed: ${response.statusText}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()

          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              editError.value = parsed.error
              return
            }
            if (parsed.text) {
              result += parsed.text
              // Live-update the section during streaming
              const updated = parseStreamedSection(result, section.heading)
              sections[sectionIndex] = updated
              markdown.value = rebuildMarkdown(frontMatter, sections)
            }
          } catch {}
        }
      }
    } catch (e: any) {
      editError.value = e.message || 'Failed to edit section'
    } finally {
      isEditing.value = false
      editingIndex.value = null
    }
  }

  return { editingIndex, isEditing, editError, editSection }
}

/** Parse streamed AI output back into a section, preserving the original heading if AI omits it */
function parseStreamedSection(text: string, fallbackHeading: string): MarkdownSection {
  const match = text.match(/^# (.+)\n?([\s\S]*)/)
  if (match) {
    return { heading: match[1]!.trim(), body: (match[2] ?? '').trim() }
  }
  return { heading: fallbackHeading, body: text.trim() }
}
