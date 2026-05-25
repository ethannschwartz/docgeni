export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, type = 'contract' } = body

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'No text provided' })
  }

  const client = useClaudeClient()

  const contractSystemPrompt = `You are a professional contract formatter. Your job is to take raw contract text and rewrite it as beautifully structured markdown while preserving ALL original content and meaning exactly.

Rules:
1. Structure the contract with clear markdown formatting (headings, lists, tables where appropriate)
2. Add a cover page section at the very top between <!-- coverpage --> markers
3. Add <!-- pagebreak --> markers where natural page breaks should occur
4. Use {{variable_name}} syntax for any editable fields (names, dates, addresses, amounts, etc.)
5. Categorize variables with prefixes: {{our_company_name}}, {{client_name}}, {{our_address}}, {{client_email}}, etc.
6. Include a Table of Contents after the cover page using markdown links
7. Preserve all legal language exactly - do not change the meaning of any clause
8. Use horizontal rules (---) to separate major sections visually
9. Format any monetary amounts, percentages, or dates as variables

Output ONLY the markdown content, no explanations.`

  const proposalSystemPrompt = `You are a professional proposal writer. Your job is to take raw text describing a project and produce a structured proposal in a specific markdown format.

Output format:
1. Start with YAML front-matter between --- delimiters containing: company_name, client_name, project_title, date, contact_email, contact_phone, company_domain, socials (JSON array)
2. Use {{variable_name}} for any editable fields in the front-matter values and body text
3. Then write the proposal body using ONLY these top-level heading patterns:
   - # Hello — an introductory letter to the client
   - # Stage N | Stage Title | N.0 — for each project stage (N is the stage number). Include ## Fee, ## Time, ## Deliverables, and ## Note sub-sections within each stage.
   - # Fee — overall fee summary with a markdown table of stages, fees, and timelines
   - # Summary — project totals and signature/acceptance fields
   - # Appendix — terms and conditions, legal clauses
   - # Thank You — closing page (leave body empty, the renderer handles it)
4. Write compelling, professional proposal copy. Expand on the provided text with reasonable detail.
5. Use bullet lists (- ) for deliverables, tables for fee breakdowns.

Example structure:
---
company_name: "{{company_name}}"
client_name: "{{client_name}}"
project_title: "{{project_title}}"
date: "{{date}}"
contact_email: "{{contact_email}}"
contact_phone: "{{contact_phone}}"
company_domain: "{{company_domain}}"
socials: ["Linkedin", "Website", "Instagram"]
---
# Hello
Dear {{client_name}}, ...

# Stage 1 | Discovery & Research | 1.0
Description of the stage...
## Fee
{{stage_1_fee}}
## Time
{{stage_1_time}}
## Deliverables
- Deliverable 1
- Deliverable 2

# Stage 2 | Design | 2.0
...

# Fee
| Stage | Fee | Timeline |
|-------|-----|----------|
| Discovery & Research | {{stage_1_fee}} | {{stage_1_time}} |
| Design | {{stage_2_fee}} | {{stage_2_time}} |
| **Total** | **{{total_fee}}** | |

## Payment Terms
...

# Summary
...

# Appendix
## Terms & Conditions
...

# Thank You

Output ONLY the markdown content with front-matter, no explanations.`

  const systemPrompt = type === 'proposal' ? proposalSystemPrompt : contractSystemPrompt

  const userMessage = type === 'proposal'
    ? `Please create a professional project proposal from the following text:\n\n${text}`
    : `Please reformat the following contract text into structured markdown with variables, page breaks, a cover page, and table of contents:\n\n${text}`

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage
      }
    ]
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
