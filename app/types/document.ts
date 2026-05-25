export type DocumentType = 'contract' | 'proposal'

export interface ProposalFrontMatter {
  company_name: string
  client_name: string
  project_title: string
  project_subject: string
  date: string
  contact_email: string
  contact_phone: string
  company_domain: string
  signer_name: string
  signer_role: string
  socials: string[]
  [key: string]: string | string[]
}

export interface StageMeta {
  fee: string
  time: string
  deliverables: string
  note: string
}

export interface ProposalPage {
  type: 'cover' | 'hello' | 'stage' | 'fee' | 'summary' | 'appendix' | 'thankyou'
  title?: string
  stageNumber?: number
  stageVersion?: string
  content: string
  meta?: StageMeta
}

export interface ParsedProposal {
  frontMatter: ProposalFrontMatter
  pages: ProposalPage[]
}
