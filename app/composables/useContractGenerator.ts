export function useContractGenerator() {
  const markdown = useState('editorMarkdown', () => '')
  const isGenerating = ref(false)
  const error = ref<string | null>(null)
  const progress = ref(0)

  async function generateFromText(text: string, type: 'contract' | 'proposal' = 'contract') {
    markdown.value = ''
    isGenerating.value = true
    error.value = null
    progress.value = 0

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type })
      })

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`)
      }

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

          if (data === '[DONE]') {
            isGenerating.value = false
            progress.value = 100
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              error.value = parsed.error
              isGenerating.value = false
              return
            }
            if (parsed.text) {
              markdown.value += parsed.text
              progress.value = Math.min(95, progress.value + 0.5)
            }
          } catch {}
        }
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to generate contract'
    } finally {
      isGenerating.value = false
    }
  }

  async function uploadAndGenerate(file: File, type: 'contract' | 'proposal' = 'contract') {
    isGenerating.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)

      const parseResponse = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData
      })

      if (!parseResponse.ok) {
        throw new Error('Failed to parse document')
      }

      const { text: parsedText } = await parseResponse.json()
      await generateFromText(parsedText, type)
    } catch (e: any) {
      error.value = e.message || 'Failed to process file'
      isGenerating.value = false
    }
  }

  return { markdown, isGenerating, error, progress, generateFromText, uploadAndGenerate }
}
