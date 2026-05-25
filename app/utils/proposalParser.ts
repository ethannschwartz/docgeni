import type { ProposalFrontMatter, ProposalPage, ParsedProposal, StageMeta } from '~/types/document'

const defaultFrontMatter: ProposalFrontMatter = {
  company_name: '',
  client_name: '',
  project_title: '',
  project_subject: '',
  date: '',
  contact_email: '',
  contact_phone: '',
  company_domain: '',
  signer_name: '',
  signer_role: '',
  socials: []
}

export function parseFrontMatter(raw: string): ProposalFrontMatter {
  const fm: Record<string, string | string[]> = { ...defaultFrontMatter }

  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (!match) continue
    const key = match[1]!
    const value = match[2]!
    const trimmed = value.trim()

    if (trimmed.startsWith('[')) {
      try {
        fm[key] = JSON.parse(trimmed.replace(/'/g, '"'))
      } catch {
        fm[key] = trimmed
      }
    } else {
      fm[key] = trimmed.replace(/^["']|["']$/g, '')
    }
  }

  return fm as ProposalFrontMatter
}

/** Extract ```meta blocks from stage content */
function extractStageMeta(content: string): { body: string, meta: StageMeta } {
  const meta: StageMeta = { fee: '', time: '', deliverables: '', note: '' }
  let body = content

  // Try ```meta block first
  const metaMatch = body.match(/```meta\s*\n([\s\S]*?)```/)
  if (metaMatch) {
    const metaBlock = metaMatch[1]!
    body = body.replace(metaMatch[0]!, '').trim()

    // Parse simple key: value pairs and multiline values
    const lines = metaBlock.split('\n')
    let currentKey = ''
    for (const line of lines) {
      const kvMatch = line.match(/^\s*(\w+)\s*:\s*(.*)$/)
      if (kvMatch) {
        currentKey = kvMatch[1]!.toLowerCase()
        const val = kvMatch[2]!.trim()
        if (val === '|') {
          // Multiline value follows
          if (currentKey in meta) (meta as Record<string, string>)[currentKey] = ''
        } else {
          if (currentKey in meta) (meta as Record<string, string>)[currentKey] = val
        }
      } else if (currentKey && line.trim()) {
        // Continuation of multiline value
        const existing = (meta as Record<string, string>)[currentKey] || ''
        ;(meta as Record<string, string>)[currentKey] = existing ? existing + '\n' + line.trim() : line.trim()
      }
    }
    return { body, meta }
  }

  // Fallback: extract from ## Fee, ## Time, ## Deliverables, ## Note sub-sections
  const sections = body.split(/(?=^## )/m)
  const bodyParts: string[] = []

  for (const section of sections) {
    const headMatch = section.match(/^## (\w+)\s*\n?([\s\S]*)/)
    if (!headMatch) {
      bodyParts.push(section)
      continue
    }
    const heading = headMatch[1]!.toLowerCase()
    const sectionBody = (headMatch[2] ?? '').trim()

    if (heading === 'fee') meta.fee = sectionBody
    else if (heading === 'time') meta.time = sectionBody
    else if (heading === 'deliverables') meta.deliverables = sectionBody
    else if (heading === 'note') meta.note = sectionBody
    else bodyParts.push(section)
  }

  return { body: bodyParts.join('').trim(), meta }
}

export function parseProposalMarkdown(markdown: string): ParsedProposal {
  let content = markdown
  let frontMatter = { ...defaultFrontMatter }

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (fmMatch) {
    frontMatter = parseFrontMatter(fmMatch[1]!)
    content = content.slice(fmMatch[0]!.length)
  }

  const pages: ProposalPage[] = []
  pages.push({ type: 'cover', content: '' })

  const sections = content.split(/(?=^# )/m).filter(s => s.trim())

  for (const section of sections) {
    const headingMatch = section.match(/^# (.+)\n?([\s\S]*)/)
    if (!headingMatch) continue

    const heading = headingMatch[1]!.trim()
    const body = (headingMatch[2] ?? '').trim()

    if (/^hello$/i.test(heading)) {
      pages.push({ type: 'hello', title: heading, content: body })
    } else if (/^stage\s+(\d+)/i.test(heading)) {
      const stageMatch = heading.match(/^Stage\s+(\d+)\s*\|\s*(.+?)\s*\|\s*(\S+)/i)
      const { body: stageBody, meta } = extractStageMeta(body)
      pages.push({
        type: 'stage',
        title: stageMatch ? stageMatch[2]!.trim() : heading,
        stageNumber: stageMatch ? parseInt(stageMatch[1]!) : undefined,
        stageVersion: stageMatch ? stageMatch[3]! : undefined,
        content: stageBody,
        meta
      })
    } else if (/^fee$/i.test(heading)) {
      pages.push({ type: 'fee', title: heading, content: body })
    } else if (/^summary$/i.test(heading)) {
      pages.push({ type: 'summary', title: heading, content: body })
    } else if (/^appendix$/i.test(heading)) {
      pages.push({ type: 'appendix', title: heading, content: body })
    } else if (/^thank\s*you$/i.test(heading)) {
      pages.push({ type: 'thankyou', title: heading, content: body })
    } else {
      pages.push({ type: 'appendix', title: heading, content: body })
    }
  }

  if (!pages.some(p => p.type === 'thankyou')) {
    pages.push({ type: 'thankyou', content: '' })
  }

  return { frontMatter, pages }
}
