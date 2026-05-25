import type { DocumentType } from '~/types/document'

export function useProposalState() {
  const documentType = useState<DocumentType>('documentType', () => 'contract')

  return { documentType }
}
