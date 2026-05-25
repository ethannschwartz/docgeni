export interface ContractVariable {
  name: string
  displayName: string
  value: string
  category: 'our' | 'client' | 'general'
}

export function useContractVariables() {
  const variables = useState<ContractVariable[]>('contractVariables', () => [])

  function extractVariables(markdown: string) {
    // Extract from entire markdown including YAML front-matter values
    const matches = markdown.matchAll(/\{\{(\w+)\}\}/g)
    const seen = new Set<string>()
    const extracted: ContractVariable[] = []

    // Preserve existing filled values
    const existingValues = new Map(variables.value.map(v => [v.name, v.value]))

    for (const match of matches) {
      const name = match[1]!
      if (seen.has(name)) continue
      seen.add(name)

      let category: ContractVariable['category'] = 'general'
      if (name.startsWith('our_')) category = 'our'
      else if (name.startsWith('client_')) category = 'client'

      extracted.push({
        name,
        displayName: name.replace(/^(our_|client_)/, '').replace(/_/g, ' '),
        value: existingValues.get(name) || '',
        category
      })
    }

    variables.value = extracted
  }

  function applyVariables(markdown: string): string {
    let result = markdown
    for (const variable of variables.value) {
      if (variable.value) {
        const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g')
        result = result.replace(regex, variable.value)
      }
    }
    return result
  }

  function renderWithHighlights(markdown: string): string {
    return markdown.replace(
      /\{\{(\w+)\}\}/g,
      (_, name) => {
        const variable = variables.value.find(v => v.name === name)
        const display = variable?.value || name.replace(/_/g, ' ')
        return `<span class="contract-variable" data-variable="${name}">${display}</span>`
      }
    )
  }

  const ourVariables = computed(() => variables.value.filter(v => v.category === 'our'))
  const clientVariables = computed(() => variables.value.filter(v => v.category === 'client'))
  const generalVariables = computed(() => variables.value.filter(v => v.category === 'general'))

  return {
    variables,
    extractVariables,
    applyVariables,
    renderWithHighlights,
    ourVariables,
    clientVariables,
    generalVariables
  }
}
