export type DocumentType = 'contract' | 'proposal'

export interface SavedDocumentVariable {
  name: string
  displayName: string
  value: string
  category: 'our' | 'client' | 'general'
}

export interface SavedDocument {
  id: string
  title: string
  type: DocumentType
  markdown: string
  variables: SavedDocumentVariable[]
  createdAt: number
  updatedAt: number
}

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
  signer_signature_svg?: string
  socials: string[]
  [key: string]: string | string[] | undefined
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

// ── Contract types ──

export interface ContractFrontMatter {
  client_name: string
  document_type: string
  date: string
  supplier_name: string
  doc_ref: string
  brand_mark_svg?: string
  signer_name?: string
  signer_position?: string
  signer_company?: string
  signed_date?: string
  signed_datetime?: string
  signer_signature_svg?: string
  [key: string]: string | undefined
}

export interface ContractSection {
  heading: string
  content: string
  type: 'content' | 'signing'
}

export interface ParsedContract {
  frontMatter: ContractFrontMatter
  sections: ContractSection[]
}
