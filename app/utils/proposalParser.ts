import type { ProposalFrontMatter, ProposalPage, ParsedProposal } from '~/types/document'

const defaultFrontMatter: ProposalFrontMatter = {
  company_name: '',
  client_name: '',
  project_title: '',
  date: '',
  contact_email: '',
  contact_phone: '',
  company_domain: '',
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

    // Handle array values like ["Linkedin", "Website", "Instagram"]
    if (trimmed.startsWith('[')) {
      try {
        fm[key] = JSON.parse(trimmed.replace(/'/g, '"'))
      } catch {
        fm[key] = trimmed
      }
    } else {
      // Strip surrounding quotes
      fm[key] = trimmed.replace(/^["']|["']$/g, '')
    }
  }

  return fm as ProposalFrontMatter
}

export function parseProposalMarkdown(markdown: string): ParsedProposal {
  let content = markdown
  let frontMatter = { ...defaultFrontMatter }

  // Extract YAML front-matter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (fmMatch) {
    frontMatter = parseFrontMatter(fmMatch[1]!)
    content = content.slice(fmMatch[0]!.length)
  }

  const pages: ProposalPage[] = []

  // Auto-prepend cover page
  pages.push({ type: 'cover', content: '' })

  // Split by top-level headings (# )
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
      pages.push({
        type: 'stage',
        title: stageMatch ? stageMatch[2]!.trim() : heading,
        stageNumber: stageMatch ? parseInt(stageMatch[1]!) : undefined,
        stageVersion: stageMatch ? stageMatch[3]! : undefined,
        content: body
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
      // Unknown heading — treat as appendix content
      pages.push({ type: 'appendix', title: heading, content: body })
    }
  }

  // If no thank you page exists, auto-append one
  if (!pages.some(p => p.type === 'thankyou')) {
    pages.push({ type: 'thankyou', content: '' })
  }

  return { frontMatter, pages }
}
