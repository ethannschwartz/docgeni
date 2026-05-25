import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function useClaudeClient(): Anthropic {
  if (!client) {
    const config = useRuntimeConfig()
    client = new Anthropic({
      apiKey: config.anthropicApiKey
    })
  }
  return client
}
