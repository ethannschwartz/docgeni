<script setup lang="ts">
import { parseProposalMarkdown } from '~/utils/proposalParser'
import { renderProposalHtml } from '~/utils/proposalRenderer'

const { markdown, isGenerating, error, progress, uploadAndGenerate, generateFromText } = useContractGenerator()
const { variables, extractVariables } = useContractVariables()
const { documentType } = useProposalState()

const sidebarOpen = ref(true)
const showRawMarkdown = ref(false)

// Re-extract variables when markdown changes
watch(markdown, (val) => {
  if (val) extractVariables(val)
})

function handleFileSelected(file: File) {
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

  // Contract export (existing logic)
  const pagesEl = document.querySelector('.contract-editor')
  if (!pagesEl) return

  const { generateCSS } = useContractTheme()

  try {
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: pagesEl.innerHTML,
        css: generateCSS()
      })
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
  documentType.value = 'contract'
  markdown.value = `<!-- coverpage -->
# Service Agreement

## Between {{our_company_name}} and {{client_name}}

Effective Date: {{effective_date}}

Prepared by: {{our_contact_name}}

{{our_company_address}}
<!-- coverpage -->

<!-- pagebreak -->

## Table of Contents

- [1. Services](#1-services)
- [2. Compensation](#2-compensation)
- [3. Term and Termination](#3-term-and-termination)
- [4. Confidentiality](#4-confidentiality)
- [5. Intellectual Property](#5-intellectual-property)

<!-- pagebreak -->

# 1. Services

## 1.1 Scope of Work

{{our_company_name}} (hereinafter referred to as the "Provider") agrees to provide the following services to {{client_name}} (hereinafter referred to as the "Client"):

- **Software Development**: Custom application development as specified in Exhibit A
- **Technical Consulting**: Up to {{consulting_hours}} hours per month of technical consultation
- **Maintenance & Support**: Ongoing maintenance and bug fixes during the term of this agreement

## 1.2 Deliverables

The Provider shall deliver the following:

1. Initial project plan within {{planning_days}} business days of contract execution
2. Weekly progress reports every Friday
3. Final deliverable by {{delivery_date}}

> **Note**: All deliverables are subject to the acceptance criteria outlined in Exhibit B.

---

# 2. Compensation

## 2.1 Fees

The Client agrees to pay the Provider a total fee of **{{total_fee}}** for the services described herein.

| Milestone | Amount | Due Date |
|-----------|--------|----------|
| Project Kickoff | {{milestone_1_amount}} | {{milestone_1_date}} |
| Mid-project Review | {{milestone_2_amount}} | {{milestone_2_date}} |
| Final Delivery | {{milestone_3_amount}} | {{milestone_3_date}} |

## 2.2 Payment Terms

All invoices are due within **{{payment_terms}}** of receipt. Late payments shall accrue interest at a rate of {{interest_rate}} per month.

<!-- pagebreak -->

# 3. Term and Termination

## 3.1 Term

This Agreement shall commence on {{effective_date}} and continue for a period of {{contract_duration}}, unless terminated earlier in accordance with this section.

## 3.2 Termination for Convenience

Either party may terminate this Agreement by providing {{notice_period}} written notice to the other party.

## 3.3 Termination for Cause

Either party may terminate this Agreement immediately if the other party:

- Materially breaches any provision and fails to cure within **30 days** of written notice
- Becomes insolvent or files for bankruptcy
- Engages in willful misconduct or gross negligence

---

# 4. Confidentiality

Both parties agree to maintain the confidentiality of all proprietary information disclosed during the course of this Agreement. This obligation shall survive termination for a period of **{{confidentiality_period}}**.

---

# 5. Intellectual Property

## 5.1 Ownership

All intellectual property created by the Provider under this Agreement shall be the exclusive property of the **Client** upon full payment.

## 5.2 Pre-existing IP

Each party retains ownership of their pre-existing intellectual property. The Provider grants the Client a non-exclusive, perpetual license to use any pre-existing IP incorporated into the deliverables.

<!-- pagebreak -->

# 6. Signatures

This Agreement is executed as of the date first written above.

**Provider: {{our_company_name}}**

Signature: ________________________

Name: {{our_signatory_name}}

Title: {{our_signatory_title}}

Date: {{signing_date}}

---

**Client: {{client_name}}**

Signature: ________________________

Name: {{client_signatory_name}}

Title: {{client_signatory_title}}

Date: {{signing_date}}`
  extractVariables(markdown.value)
}

// Demo proposal
function loadDemoProposal() {
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

          <!-- Contract visual editor -->
          <ContractEditor
            v-else
            :markdown="markdown"
            :is-streaming="isGenerating"
            @update:markdown="markdown = $event"
          />
        </div>
      </div>
    </div>

    <!-- Variables sidebar -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="w-0 opacity-0"
      enter-to-class="w-80 opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="w-80 opacity-100"
      leave-to-class="w-0 opacity-0"
    >
      <aside
        v-if="sidebarOpen && markdown"
        class="w-80 overflow-y-auto border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shrink-0"
      >
        <ContractVariables />
      </aside>
    </Transition>
  </div>
</template>
