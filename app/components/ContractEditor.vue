<script setup lang="ts">
import { parseContractPages } from '~/utils/contractParser'

const props = defineProps<{
  markdown: string
  isStreaming?: boolean
}>()

const emit = defineEmits<{
  'update:markdown': [value: string]
}>()

const { renderWithHighlights } = useContractVariables()

const pages = computed(() => parseContractPages(props.markdown))

// Convert markdown to simple HTML for display
function markdownToHtml(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 id="$1">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Blockquotes
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Line breaks to paragraphs
    .split('\n\n')
    .map(block => {
      block = block.trim()
      if (!block) return ''
      if (block.startsWith('<h') || block.startsWith('<hr') || block.startsWith('<blockquote') || block.startsWith('<li') || block.startsWith('<table')) {
        // Wrap consecutive <li> in <ul>
        if (block.includes('<li>')) {
          return `<ul>${block}</ul>`
        }
        return block
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  // Handle tables
  html = html.replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
    const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('')
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
  })

  // Render variable highlights
  html = renderWithHighlights(html)

  return html
}
</script>

<template>
  <div class="contract-editor space-y-8">
    <template v-for="(page, index) in pages" :key="index">
      <!-- Cover page -->
      <ContractCoverPage
        v-if="page.type === 'cover'"
        :content="page.content"
      />

      <!-- TOC page -->
      <ContractTOC
        v-else-if="page.type === 'toc'"
        :markdown="markdown"
      />

      <!-- Content page -->
      <ContractPage
        v-else
        :page-number="index + 1"
        :total-pages="pages.length"
      >
        <div
          class="prose prose-neutral max-w-none"
          :class="{ 'streaming-cursor': isStreaming && index === pages.length - 1 }"
          v-html="markdownToHtml(page.content)"
        />
      </ContractPage>
    </template>

    <!-- Empty state while streaming first content -->
    <ContractPage v-if="!markdown && isStreaming">
      <div class="flex items-center justify-center h-64">
        <div class="text-center">
          <div class="size-12 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-sparkles" class="size-6 text-primary-500 animate-pulse" />
          </div>
          <p class="text-sm text-neutral-500">Generating your contract...</p>
        </div>
      </div>
    </ContractPage>
  </div>
</template>
