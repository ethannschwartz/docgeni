import type { SavedDocument, DocumentType, SavedDocumentVariable } from '~/types/document'

const STORAGE_KEY = 'docgen:documents'

export function useDocuments() {
  const documents = useState<SavedDocument[]>('savedDocuments', () => [])

  function loadFromStorage() {
    if (import.meta.server) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        documents.value = JSON.parse(raw)
      }
    } catch {
      // ignore corrupt data
    }
  }

  function saveToStorage() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents.value))
  }

  function createDocument(doc: {
    title: string
    type: DocumentType
    markdown: string
    variables: SavedDocumentVariable[]
  }): SavedDocument {
    const now = Date.now()
    const saved: SavedDocument = {
      id: crypto.randomUUID(),
      title: doc.title,
      type: doc.type,
      markdown: doc.markdown,
      variables: doc.variables,
      createdAt: now,
      updatedAt: now,
    }
    documents.value = [saved, ...documents.value]
    saveToStorage()
    return saved
  }

  function updateDocument(id: string, updates: Partial<Pick<SavedDocument, 'title' | 'markdown' | 'variables' | 'type'>>) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx === -1) return
    const existing = documents.value[idx]!
    documents.value[idx] = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }
    documents.value = [...documents.value]
    saveToStorage()
  }

  function deleteDocument(id: string) {
    documents.value = documents.value.filter(d => d.id !== id)
    saveToStorage()
  }

  function getDocument(id: string): SavedDocument | undefined {
    return documents.value.find(d => d.id === id)
  }

  function duplicateDocument(id: string): SavedDocument | undefined {
    const doc = getDocument(id)
    if (!doc) return
    return createDocument({
      title: `${doc.title} (copy)`,
      type: doc.type,
      markdown: doc.markdown,
      variables: doc.variables,
    })
  }

  return { documents, createDocument, updateDocument, deleteDocument, getDocument, duplicateDocument, loadFromStorage }
}
