export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sectionMarkdown, instruction, type = 'contract', fullContext } = body

  if (!sectionMarkdown || !instruction) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sectionMarkdown or instruction' })
  }

  const client = useClaudeClient()

  const systemPrompt = `You are a professional ${type === 'proposal' ? 'proposal' : 'contract'} editor. The user will give you a single section of a ${type} document and an editing instruction. Rewrite ONLY that section following their instruction.

Rules:
- Preserve the # heading exactly as-is (do not change the heading text or numbering)
- Preserve all {{variable_name}} placeholders exactly — do not remove, rename, or add variables
- Preserve any ## sub-headings structure if present (e.g. ## Fee, ## Time, ## Deliverables, ## Note for proposals)
- Output ONLY the rewritten section markdown — no explanations, no code fences
- Maintain the same professional tone and formatting style as the original
- Use the same markdown conventions (bullet lists with -, tables with |, ### sub-headings for contracts)`

  const contextNote = fullContext
    ? `\n\nFor reference, here is the full document context (do NOT output this — only rewrite the section above):\n\n${fullContext}`
    : ''

  const userMessage = `Here is the section to edit:\n\n${sectionMarkdown}\n\nInstruction: ${instruction}${contextNote}`

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const data = JSON.stringify({ text: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
        controller.close()
      }
    }
  })

  return sendStream(event, readable)
})
