export interface ElementStyle {
  fontFamily: string
  fontSize: string
  fontWeight: string
  color: string
  lineHeight: string
  marginBottom: string
  letterSpacing?: string
  textTransform?: string
  borderColor?: string
  backgroundColor?: string
  padding?: string
}

export interface ContractTheme {
  h1: ElementStyle
  h2: ElementStyle
  h3: ElementStyle
  body: ElementStyle
  listItem: ElementStyle
  table: ElementStyle
  blockquote: ElementStyle
  divider: { color: string; style: string; width: string }
  coverPage: {
    backgroundColor: string
    titleColor: string
    subtitleColor: string
    accentColor: string
  }
}

const defaultTheme: ContractTheme = {
  h1: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
    lineHeight: '1.2',
    marginBottom: '16px',
    letterSpacing: '-0.02em'
  },
  h2: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '22px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.3',
    marginBottom: '12px',
    letterSpacing: '-0.01em'
  },
  h3: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    lineHeight: '1.4',
    marginBottom: '8px'
  },
  body: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '14px',
    fontWeight: '400',
    color: '#4b5563',
    lineHeight: '1.7',
    marginBottom: '12px'
  },
  listItem: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '14px',
    fontWeight: '400',
    color: '#4b5563',
    lineHeight: '1.6',
    marginBottom: '6px'
  },
  table: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '13px',
    fontWeight: '400',
    color: '#374151',
    lineHeight: '1.5',
    marginBottom: '16px',
    borderColor: '#e5e7eb',
    padding: '8px 12px'
  },
  blockquote: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '14px',
    fontWeight: '400',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '12px',
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '12px 16px'
  },
  divider: {
    color: '#e5e7eb',
    style: 'solid',
    width: '1px'
  },
  coverPage: {
    backgroundColor: '#1e3a5f',
    titleColor: '#ffffff',
    subtitleColor: '#93c5fd',
    accentColor: '#3b82f6'
  }
}

export function useContractTheme() {
  const theme = useState<ContractTheme>('contractTheme', () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('contract-theme')
      if (saved) {
        try {
          return JSON.parse(saved) as ContractTheme
        } catch {}
      }
    }
    return structuredClone(defaultTheme)
  })

  function saveTheme() {
    if (import.meta.client) {
      localStorage.setItem('contract-theme', JSON.stringify(theme.value))
    }
  }

  function resetTheme() {
    theme.value = structuredClone(defaultTheme)
    saveTheme()
  }

  function generateCSS(): string {
    const t = theme.value
    return `
      .contract-content h1 { font-family: ${t.h1.fontFamily}; font-size: ${t.h1.fontSize}; font-weight: ${t.h1.fontWeight}; color: ${t.h1.color}; line-height: ${t.h1.lineHeight}; margin-bottom: ${t.h1.marginBottom}; letter-spacing: ${t.h1.letterSpacing || 'normal'}; }
      .contract-content h2 { font-family: ${t.h2.fontFamily}; font-size: ${t.h2.fontSize}; font-weight: ${t.h2.fontWeight}; color: ${t.h2.color}; line-height: ${t.h2.lineHeight}; margin-bottom: ${t.h2.marginBottom}; letter-spacing: ${t.h2.letterSpacing || 'normal'}; }
      .contract-content h3 { font-family: ${t.h3.fontFamily}; font-size: ${t.h3.fontSize}; font-weight: ${t.h3.fontWeight}; color: ${t.h3.color}; line-height: ${t.h3.lineHeight}; margin-bottom: ${t.h3.marginBottom}; }
      .contract-content p { font-family: ${t.body.fontFamily}; font-size: ${t.body.fontSize}; font-weight: ${t.body.fontWeight}; color: ${t.body.color}; line-height: ${t.body.lineHeight}; margin-bottom: ${t.body.marginBottom}; }
      .contract-content li { font-family: ${t.listItem.fontFamily}; font-size: ${t.listItem.fontSize}; font-weight: ${t.listItem.fontWeight}; color: ${t.listItem.color}; line-height: ${t.listItem.lineHeight}; margin-bottom: ${t.listItem.marginBottom}; }
      .contract-content table { font-family: ${t.table.fontFamily}; font-size: ${t.table.fontSize}; border-color: ${t.table.borderColor}; margin-bottom: ${t.table.marginBottom}; width: 100%; border-collapse: collapse; }
      .contract-content th, .contract-content td { border: 1px solid ${t.table.borderColor}; padding: ${t.table.padding}; color: ${t.table.color}; }
      .contract-content th { font-weight: 600; background: #f9fafb; }
      .contract-content blockquote { font-family: ${t.blockquote.fontFamily}; font-size: ${t.blockquote.fontSize}; color: ${t.blockquote.color}; line-height: ${t.blockquote.lineHeight}; margin-bottom: ${t.blockquote.marginBottom}; border-left: 3px solid ${t.blockquote.borderColor}; background: ${t.blockquote.backgroundColor}; padding: ${t.blockquote.padding}; border-radius: 0 6px 6px 0; }
      .contract-content hr { border: none; border-top: ${t.divider.width} ${t.divider.style} ${t.divider.color}; margin: 24px 0; }
      .contract-content ul, .contract-content ol { padding-left: 24px; margin-bottom: 12px; }
    `
  }

  watch(theme, saveTheme, { deep: true })

  return { theme, resetTheme, generateCSS, defaultTheme }
}
