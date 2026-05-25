export type DocumentType = 'contract' | 'proposal'

export interface ProposalFrontMatter {
  company_name: string
  client_name: string
  project_title: string
  date: string
  contact_email: string
  contact_phone: string
  company_domain: string
  socials: string[]
  [key: string]: string | string[]
}

export interface ProposalPage {
  type: 'cover' | 'hello' | 'stage' | 'fee' | 'summary' | 'appendix' | 'thankyou'
  title?: string
  stageNumber?: number
  stageVersion?: string
  content: string
}

export interface ParsedProposal {
  frontMatter: ProposalFrontMatter
  pages: ProposalPage[]
}
