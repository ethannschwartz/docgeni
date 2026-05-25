<script setup lang="ts">
import { parseProposalMarkdown } from '~/utils/proposalParser'
import { renderProposalHtml } from '~/utils/proposalRenderer'
import { parseContractMarkdown } from '~/utils/contractParser'
import { renderContractHtml } from '~/utils/contractRenderer'

const route = useRoute()
const router = useRouter()
const { markdown, isGenerating, error, progress, uploadAndGenerate, generateFromText } = useContractGenerator()
const { variables, extractVariables } = useContractVariables()
const { documentType } = useProposalState()
const { createDocument, updateDocument, getDocument, loadFromStorage } = useDocuments()

const sidebarOpen = ref(true)
const showRawMarkdown = ref(false)
const currentDocId = useState<string | null>('currentDocId', () => null)
const autoSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Load documents from localStorage on mount, then load doc if ?id= present
onMounted(() => {
  loadFromStorage()
  const id = route.query.id as string | undefined
  if (id) {
    loadDocumentById(id)
  }
})

// Watch for route query changes (e.g. navigating back with a different id)
watch(() => route.query.id, (id) => {
  if (id && typeof id === 'string') {
    loadDocumentById(id)
  }
})

function loadDocumentById(id: string) {
  const doc = getDocument(id)
  if (!doc) return
  currentDocId.value = id
  documentType.value = doc.type
  markdown.value = doc.markdown
  variables.value = doc.variables.map(v => ({ ...v }))
}

// Auto-save: debounced watch on markdown + variables
watch([markdown, variables], () => {
  if (!currentDocId.value || isGenerating.value) return
  if (autoSaveTimer.value) clearTimeout(autoSaveTimer.value)
  autoSaveTimer.value = setTimeout(() => {
    if (currentDocId.value && markdown.value) {
      updateDocument(currentDocId.value, {
        markdown: markdown.value,
        variables: variables.value.map(v => ({ ...v })),
        type: documentType.value,
      })
    }
  }, 1000)
}, { deep: true })

// Re-extract variables when markdown changes
watch(markdown, (val) => {
  if (val) extractVariables(val)
})

// After generation completes, auto-create a saved document
watch(isGenerating, (generating, wasGenerating) => {
  if (wasGenerating && !generating && markdown.value && !currentDocId.value) {
    const title = extractTitle(markdown.value, documentType.value)
    const doc = createDocument({
      title,
      type: documentType.value,
      markdown: markdown.value,
      variables: variables.value.map(v => ({ ...v })),
    })
    currentDocId.value = doc.id
    router.replace({ query: { id: doc.id } })
  }
})

function extractTitle(md: string, type: string): string {
  const match = md.match(/^#\s+(.+)$/m)
  if (match?.[1]) return match[1].replace(/\{\{.*?\}\}/g, '').trim() || `Untitled ${type}`
  return `Untitled ${type}`
}

function handleSave() {
  if (!markdown.value) return
  if (currentDocId.value) {
    updateDocument(currentDocId.value, {
      markdown: markdown.value,
      variables: variables.value.map(v => ({ ...v })),
      type: documentType.value,
    })
  } else {
    const title = extractTitle(markdown.value, documentType.value)
    const doc = createDocument({
      title,
      type: documentType.value,
      markdown: markdown.value,
      variables: variables.value.map(v => ({ ...v })),
    })
    currentDocId.value = doc.id
    router.replace({ query: { id: doc.id } })
  }
}

function handleNewDocument() {
  currentDocId.value = null
  markdown.value = ''
  variables.value = []
  router.replace({ query: {} })
}

function handleFileSelected(file: File) {
  currentDocId.value = null
  uploadAndGenerate(file, documentType.value)
}

// Build filled vars map for proposal rendering
const filledVars = computed(() => {
  const map: Record<string, string> = {}
  for (const v of variables.value) {
    if (v.value) map[v.name] = v.value
  }
  return map
})

async function handleExportPdf() {
  if (documentType.value === 'proposal') {
    // For proposals, send the complete rendered HTML
    const parsed = parseProposalMarkdown(markdown.value)
    const completeHtml = renderProposalHtml(parsed, filledVars.value)

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completeHtml })
      })

      if (!response.ok) throw new Error('PDF export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'proposal.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('PDF export failed:', e)
    }
    return
  }

  // Contract export — same approach as proposals: send complete rendered HTML
  const parsed = parseContractMarkdown(markdown.value)
  const completeHtml = renderContractHtml(parsed, filledVars.value)

  try {
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completeHtml })
    })

    if (!response.ok) throw new Error('PDF export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contract.pdf'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('PDF export failed:', e)
  }
}

// Demo contract
function loadDemoContract() {
  currentDocId.value = null
  documentType.value = 'contract'
  markdown.value = `---
client_name: "{{client_name}}"
document_type: "Service agreement"
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
| Services | Software development, technical consulting, maintenance |
| Consulting hours | {{consulting_hours}} per month |
| Planning timeline | {{planning_days}} business days |
| Final delivery | {{delivery_date}} |
| Total fee | {{total_fee}} |

# 0b. Payment schedule

| Milestone | Amount | Due date |
|-----------|--------|----------|
| Project Kickoff | {{milestone_1_amount}} | {{milestone_1_date}} |
| Mid-project Review | {{milestone_2_amount}} | {{milestone_2_date}} |
| Final Delivery | {{milestone_3_amount}} | {{milestone_3_date}} |

# 1. Process

### Commencement of Work

- Upon confirmation of the purchase order, work will commence within {{planning_days}} business days
- The Provider will deliver an initial project plan outlining milestones and deliverables
- Weekly progress reports will be provided every Friday

### Deliverables

- Custom application development as specified in the project plan
- Up to {{consulting_hours}} hours per month of technical consultation
- Ongoing maintenance and bug fixes during the term of this agreement

### Feedback Opportunities

- The Client will have the opportunity to review and provide feedback at each milestone
- All deliverables are subject to the acceptance criteria outlined in the project plan

# 2. Compensation

### Fees

- The Client agrees to pay the Provider a total fee of **{{total_fee}}** for the services described herein
- All invoices are due within **{{payment_terms}}** of receipt
- Late payments shall accrue interest at a rate of {{interest_rate}} per month

### Payment Schedule

- Payments are tied to project milestones as outlined in the payment schedule
- The Provider reserves the right to pause work if payments are more than 14 days overdue

# 3. Term and termination

### Term

- This Agreement shall commence on {{effective_date}} and continue for a period of {{contract_duration}}, unless terminated earlier in accordance with this section

### Termination for Convenience

- Either party may terminate this Agreement by providing {{notice_period}} written notice to the other party

### Termination for Cause

- Either party may terminate this Agreement immediately if the other party materially breaches any provision and fails to cure within **30 days** of written notice
- Either party may terminate if the other becomes insolvent or files for bankruptcy
- Either party may terminate if the other engages in willful misconduct or gross negligence

# 4. Confidentiality

- Both parties agree to maintain the confidentiality of all proprietary information disclosed during the course of this Agreement
- This obligation shall survive termination for a period of **{{confidentiality_period}}**
- Confidential information does not include information that is publicly available, independently developed, or rightfully received from a third party

# 5. Intellectual property

### Ownership

- All intellectual property created by the Provider under this Agreement shall be the exclusive property of the **Client** upon full payment

### Pre-existing IP

- Each party retains ownership of their pre-existing intellectual property
- The Provider grants the Client a non-exclusive, perpetual license to use any pre-existing IP incorporated into the deliverables

# 6. Warranty and liability

### Warranty

- The Provider warrants that all services will be performed in a professional and workmanlike manner
- The Provider warrants that deliverables will conform to the specifications outlined in the project plan for a period of **30 days** following delivery

### Limitation of Liability

- Neither party shall be liable for any indirect, incidental, or consequential damages
- The Provider\u2019s total liability under this Agreement shall not exceed the total fees paid by the Client

# 7. Document Signing`
  extractVariables(markdown.value)
}

// Demo proposal
function loadDemoProposal() {
  currentDocId.value = null
  documentType.value = 'proposal'
  markdown.value = `---
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

Thank you for taking the time to discuss your upcoming project with us. We're excited about the opportunity to work together and bring your vision to life.

This proposal outlines our recommended approach, broken into clear stages with transparent pricing. We believe in collaborative partnerships built on trust, creativity, and results.

We look forward to getting started.

# Stage 1 | Discovery & Research | 1.0

In the discovery phase, we'll dive deep into understanding your brand, your audience, and your goals. This foundational work ensures every subsequent decision is informed and intentional.

We'll conduct stakeholder interviews, competitive analysis, and user research to build a comprehensive project brief.

## Fee
{{stage_1_fee}}

## Time
{{stage_1_time}}

## Deliverables
- Stakeholder interview synthesis
- Competitive landscape analysis
- User persona development
- Project brief & strategy document

## Note
This stage sets the foundation for all subsequent work and typically takes 2-3 weeks.

# Stage 2 | Design & Prototyping | 2.0

With the research in hand, we'll move into the design phase. This includes wireframing, visual design, and interactive prototyping.

Our iterative design process includes two rounds of revisions at each fidelity level to ensure we arrive at a solution you love.

## Fee
{{stage_2_fee}}

## Time
{{stage_2_time}}

## Deliverables
- Low-fidelity wireframes
- High-fidelity visual designs
- Interactive prototype
- Design system foundations

## Note
Includes two rounds of revisions per design phase.

# Stage 3 | Development & Launch | 3.0

We'll bring the approved designs to life with clean, performant code. Our development process includes thorough QA and a supported launch.

## Fee
{{stage_3_fee}}

## Time
{{stage_3_time}}

## Deliverables
- Front-end development
- CMS integration
- Performance optimization
- Launch support & handover

## Note
One round of consolidated feedback included.

# Fee

| Stage | Description | Cost |
|-------|-------------|------|
| 1.0 | Discovery & Research | {{stage_1_fee}} |
| 2.0 | Design & Prototyping | {{stage_2_fee}} |
| 3.0 | Development & Launch | {{stage_3_fee}} |
| **Total** | | **{{total_fee}}** |

**Payment Terms:** 50% deposit upon project commencement, 25% upon design approval, 25% upon project completion. All invoices are due within 14 days of receipt.

**All costs exclude:** VAT, third-party licensing fees, stock imagery, and hosting costs unless otherwise specified.

# Summary

**Total Fee:** {{total_fee}}

**Estimated Timeline:** {{total_time}}

This proposal is valid for 30 days from the date of issue.

# Appendix

## Terms & Conditions

1. All prices are exclusive of VAT unless otherwise stated
2. Additional work outside the agreed scope will be quoted separately
3. Content and assets are to be provided by the client unless otherwise agreed
4. Hosting and domain costs are not included unless specified
5. Either party may terminate the agreement with 14 days written notice

## Intellectual Property

All intellectual property created during this project will be transferred to the client upon final payment. We retain the right to showcase the work in our portfolio unless otherwise agreed.

# Thank you`
  extractVariables(markdown.value)
}
</script>

<template>
  <div class="flex h-full">
    <!-- Main content area -->
    <div class="flex-1 overflow-y-auto py-8 px-4">
      <div class="max-w-[240mm] mx-auto">
        <!-- Upload state -->
        <div v-if="!markdown && !isGenerating" class="space-y-6">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Document Generator
            </h1>
            <p class="text-neutral-500 max-w-md mx-auto">
              Upload text to generate a professional contract or proposal with editable variables and PDF export.
            </p>
          </div>

          <!-- Document type toggle -->
          <div class="flex justify-center gap-2 mb-4">
            <UButton
              :variant="documentType === 'contract' ? 'solid' : 'outline'"
              :color="documentType === 'contract' ? 'primary' : 'neutral'"
              icon="i-lucide-file-text"
              @click="documentType = 'contract'"
            >
              Contract
            </UButton>
            <UButton
              :variant="documentType === 'proposal' ? 'solid' : 'outline'"
              :color="documentType === 'proposal' ? 'primary' : 'neutral'"
              icon="i-lucide-presentation"
              @click="documentType = 'proposal'"
            >
              Proposal
            </UButton>
          </div>

          <FileDropZone @file-selected="handleFileSelected" />

          <div class="flex items-center gap-4">
            <div class="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
            <span class="text-xs text-neutral-400 uppercase tracking-wider">or</span>
            <div class="flex-1 border-t border-neutral-200 dark:border-neutral-800" />
          </div>

          <div class="flex justify-center gap-3">
            <UButton
              variant="outline"
              color="neutral"
              icon="i-lucide-file-text"
              @click="loadDemoContract"
            >
              Demo contract
            </UButton>
            <UButton
              variant="outline"
              color="neutral"
              icon="i-lucide-presentation"
              @click="loadDemoProposal"
            >
              Demo proposal
            </UButton>
          </div>
        </div>

        <!-- Streaming indicator -->
        <StreamingIndicator :progress="progress" :is-generating="isGenerating" />

        <!-- Error -->
        <div v-if="error" class="mb-6">
          <UAlert
            title="Error"
            :description="error"
            color="error"
            icon="i-lucide-alert-circle"
          />
        </div>

        <!-- Document display -->
        <div v-if="markdown || isGenerating">
          <!-- Toolbar -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <UButton
                :icon="sidebarOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="sidebarOpen = !sidebarOpen"
              />
              <UButton
                :icon="showRawMarkdown ? 'i-lucide-eye' : 'i-lucide-code'"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="showRawMarkdown = !showRawMarkdown"
              >
                {{ showRawMarkdown ? 'Preview' : 'Markdown' }}
              </UButton>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="handleNewDocument"
              >
                New
              </UButton>
              <UButton
                icon="i-lucide-save"
                variant="soft"
                color="primary"
                size="sm"
                :disabled="isGenerating"
                @click="handleSave"
              >
                {{ currentDocId ? 'Saved' : 'Save' }}
              </UButton>
              <UButton
                icon="i-lucide-download"
                variant="soft"
                color="primary"
                size="sm"
                :disabled="isGenerating"
                @click="handleExportPdf"
              >
                Export PDF
              </UButton>
            </div>
          </div>

          <!-- Raw markdown toggle -->
          <div v-if="showRawMarkdown" class="mb-8">
            <textarea
              v-model="markdown"
              class="w-full h-[600px] p-4 font-mono text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <!-- Proposal preview -->
          <ProposalPreview
            v-else-if="documentType === 'proposal'"
            :markdown="markdown"
            :is-streaming="isGenerating"
          />

          <!-- Contract preview -->
          <ContractPreview
            v-else
            :markdown="markdown"
            :is-streaming="isGenerating"
          />
        </div>
      </div>
    </div>

    <!-- Variables sidebar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out overflow-hidden"
      enter-from-class="!w-0 !min-w-0 !p-0 opacity-0"
      enter-to-class="w-96 opacity-100"
      leave-active-class="transition-all duration-200 ease-in overflow-hidden"
      leave-from-class="w-96 opacity-100"
      leave-to-class="!w-0 !min-w-0 !p-0 opacity-0"
    >
      <aside
        v-if="sidebarOpen && markdown"
        class="w-96 overflow-y-auto border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shrink-0"
      >
        <ContractVariables />
      </aside>
    </Transition>
  </div>
</template>
