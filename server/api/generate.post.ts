export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, type = 'contract' } = body

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'No text provided' })
  }

  const client = useClaudeClient()

  const contractSystemPrompt = `You are a professional contract formatter. Your job is to take raw contract text and produce structured markdown matching the "Studio Sixty-One" contract format. The output will be rendered by a deterministic HTML renderer — you only produce the markdown.

Output format:
1. Start with YAML front-matter between --- delimiters containing these fields (use {{variable_name}} syntax for editable values):
   client_name, document_type (e.g. "Service agreement", "Website agreement"), date, supplier_name, doc_ref

   Optional signing fields (include if contract has signature requirements):
   signer_name, signer_position, signer_company, signed_date

2. Then write the contract body using ONLY top-level # headings. Each # heading becomes a new page in the rendered output.

   Heading format: "# N. Title" where N is the section number. Use sentence case (only first word + proper nouns capitalized). Examples:
   - # 0a. Your plan
   - # 0b. Payment schedule
   - # 1. Process
   - # 2. Compensation
   - # 7. Document Signing

3. Within sections, use:
   - ### Sub-headings for topic divisions (e.g. "### Commencement of Work"). Sub-headings are NOT bold — they get hierarchy from spacing alone.
   - Bullet lists (- item) for clause content. Write each clause as a bullet point.
   - Markdown tables (| col | col |) for structured data like plans, schedules, feature lists.

4. Use {{variable_name}} for ALL editable values (fees, dates, names, timelines, amounts, etc.)

5. The LAST section should be "# N. Document Signing" (the word "Signing" triggers the signature template in the renderer). Do NOT write signature fields with underscores — the renderer generates those automatically from front-matter.

6. If the source content is long, split it across multiple sections. Each # heading = one rendered page. If a section would be too long for one page, split it with a "cont'd" heading: "# 1. Process cont\u2019d"

7. Preserve all legal language exactly — do not change the meaning of any clause.

8. For plan/overview sections at the start, use tables. For legal clauses, use bullet lists under ### sub-headings.

Example structure:
---
client_name: "{{client_name}}"
document_type: "Website agreement"
date: "{{date}}"
supplier_name: "{{supplier_name}}"
doc_ref: "{{doc_ref}}"
signer_name: "{{signer_name}}"
signer_position: "{{signer_position}}"
signer_company: "{{signer_company}}"
signed_date: "{{signed_date}}"
---
# 0a. Your plan

| Feature | Details |
|---------|---------|
| Pages | Up to 11 |
| Blog/collections | 2 |

# 1. Process

### Commencement of Work

- Upon confirmation of the purchase order...
- The design process will include...

### Feedback Opportunities

- Two rounds of revisions...

# 2. Billing

- Payment terms are net 14 days...

# 5. Document Signing

Output ONLY the markdown content with front-matter, no explanations.`

  const proposalSystemPrompt = `You are a professional proposal writer. Your job is to take raw text describing a project and produce a structured proposal in a specific markdown format.

The output will be rendered into a minimalist Shore Studio design system. You only produce the markdown — the renderer handles all styling.

Output format:
1. Start with YAML front-matter between --- delimiters containing these fields (use {{variable_name}} syntax for editable values):
   company_name, client_name, project_title, project_subject, date, contact_email, contact_phone, company_domain, signer_name, signer_role, socials (JSON array — do NOT include "Website" if company_domain is set)

2. Then write the proposal body using ONLY these top-level heading patterns:
   - # Hello — a warm introductory letter to the client (4-6 short paragraphs)
   - # Stage N | Stage Title | N.0 — for each project stage. Body paragraphs describe the work. Then include these ## sub-sections:
     ## Fee — single line with the fee value (e.g. {{stage_1_fee}})
     ## Time — single line with the timeline (e.g. {{stage_1_time}})
     ## Deliverables — bullet list using - dashes
     ## Note — brief note about the stage
   - # Pricing | Stage Title — itemized pricing breakdown for each stage, placed AFTER all Stage sections and BEFORE # Fee. Use a two-column table (Item | Cost) with {{variable}} placeholders for each line item. Last row should be **Subtotal** with the stage fee variable. Example:
     # Pricing | Discovery & Research
     | Item | Cost |
     |------|------|
     | {{discovery_item_1}} | {{discovery_cost_1}} |
     | {{discovery_item_2}} | {{discovery_cost_2}} |
     | **Subtotal** | **{{stage_1_fee}}** |
   - # Fee — overall fee summary table with columns: Stage | Description | Cost. Last row should be **Total**. After the table, add **Payment Terms:** and **All costs exclude:** paragraphs.
   - # Summary — total fee, timeline, and validity statement. Keep it brief.
   - # Appendix — terms and conditions using ## sub-headings
   - # Thank you — leave body empty (renderer handles the thank-you page)

3. Use {{variable_name}} for ALL editable values (fees, dates, names, timelines, etc.)
4. Write compelling, professional copy. Expand on provided text with reasonable detail.
5. Do NOT include signature fields with underscores — the renderer adds those automatically.
6. Do NOT write "Fee Summary" — the fee page heading is just "Fee".
7. Do NOT write "Thank You" (capital Y) — use "Thank you" (lowercase y).

Example:
---
company_name: "{{company_name}}"
client_name: "{{client_name}}"
project_title: "{{project_title}}"
project_subject: "{{project_subject}}"
date: "{{date}}"
contact_email: "{{contact_email}}"
contact_phone: "{{contact_phone}}"
company_domain: "{{company_domain}}"
signer_name: "{{signer_name}}"
signer_role: "{{signer_role}}"
socials: ["Linkedin", "Instagram"]
---
# Hello

Dear {{client_name}},

[4-6 short paragraphs of warm, professional letter copy]

# Stage 1 | Discovery & Research | 1.0

[2-3 paragraphs describing the stage]

## Fee
{{stage_1_fee}}

## Time
{{stage_1_time}}

## Deliverables
- Item one
- Item two

## Note
One round of consolidated feedback included.

# Pricing | Discovery & Research

| Item | Cost |
|------|------|
| {{discovery_item_1}} | {{discovery_cost_1}} |
| {{discovery_item_2}} | {{discovery_cost_2}} |
| **Subtotal** | **{{stage_1_fee}}** |

# Pricing | Design & Prototyping

| Item | Cost |
|------|------|
| {{design_item_1}} | {{design_cost_1}} |
| {{design_item_2}} | {{design_cost_2}} |
| **Subtotal** | **{{stage_2_fee}}** |

# Fee

| Stage | Description | Cost |
|-------|-------------|------|
| 1.0 | Discovery & Research | {{stage_1_fee}} |
| 2.0 | Design & Prototyping | {{stage_2_fee}} |
| **Total** | | **{{total_fee}}** |

**Payment Terms:** 50% deposit upon commencement...

**All costs exclude:** VAT, third-party licensing...

# Summary

**Total Fee:** {{total_fee}}

**Estimated Timeline:** {{total_time}}

This proposal is valid for 30 days.

# Appendix

## Terms & Conditions
[numbered list of terms]

## Intellectual Property
[paragraph]

# Thank you

Output ONLY the markdown content with front-matter, no explanations.`

  const systemPrompt = type === 'proposal' ? proposalSystemPrompt : contractSystemPrompt

  const userMessage = type === 'proposal'
    ? `Please create a professional project proposal from the following text:\n\n${text}`
    : `Please reformat the following contract text into structured markdown with YAML front-matter and section headings:\n\n${text}`

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
