import type { ContractFrontMatter, ContractSection, ParsedContract } from '~/types/document'

const defaultFrontMatter: ContractFrontMatter = {
  client_name: '',
  document_type: '',
  date: '',
  supplier_name: '',
  doc_ref: '',
}

export function parseContractFrontMatter(raw: string): ContractFrontMatter {
  const fm: Record<string, string> = { ...defaultFrontMatter }

  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+)\s*:\s*(.+)$/)
    if (!match) continue
    const key = match[1]!
    const value = match[2]!.trim().replace(/^["']|["']$/g, '')
    fm[key] = value
  }

  return fm as ContractFrontMatter
}

export function parseContractMarkdown(markdown: string): ParsedContract {
  let content = markdown
  let frontMatter = { ...defaultFrontMatter }

  // Extract YAML front-matter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/)
  if (fmMatch) {
    frontMatter = parseContractFrontMatter(fmMatch[1]!)
    content = content.slice(fmMatch[0]!.length)
  }

  const sections: ContractSection[] = []

  // Split on top-level headings (# ...)
  const rawSections = content.split(/(?=^# )/m).filter(s => s.trim())

  for (const raw of rawSections) {
    const headingMatch = raw.match(/^# (.+)\n?([\s\S]*)/)
    if (!headingMatch) continue

    const heading = headingMatch[1]!.trim()
    const body = (headingMatch[2] ?? '').trim()

    // Detect signing sections
    const isSigning = /signing/i.test(heading)

    sections.push({
      heading,
      content: body,
      type: isSigning ? 'signing' : 'content',
    })
  }

  return { frontMatter, sections }
}
