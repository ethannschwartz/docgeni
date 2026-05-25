export interface ContractPage {
  content: string
  type: 'cover' | 'toc' | 'content'
}

export function parseContractPages(markdown: string): ContractPage[] {
  const pages: ContractPage[] = []

  // Extract cover page
  const coverMatch = markdown.match(/<!-- coverpage -->([\s\S]*?)<!-- coverpage -->/)
  if (coverMatch) {
    pages.push({ content: coverMatch[1].trim(), type: 'cover' })
    markdown = markdown.replace(coverMatch[0], '')
  }

  // Split remaining content by page breaks
  const sections = markdown.split(/<!-- pagebreak -->/).filter(s => s.trim())

  for (const section of sections) {
    // Check if this section is a TOC
    const isTOC = section.includes('## Table of Contents') || section.includes('## Contents')
    pages.push({
      content: section.trim(),
      type: isTOC ? 'toc' : 'content'
    })
  }

  return pages
}

export function extractHeadings(markdown: string): { level: number; text: string; id: string }[] {
  const headings: { level: number; text: string; id: string }[] = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].replace(/\{\{.*?\}\}/g, '').trim()
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      headings.push({ level, text, id })
    }
  }

  return headings
}
