<script setup lang="ts">
import { parseProposalMarkdown } from '~/utils/proposalParser'
import { renderProposalHtml } from '~/utils/proposalRenderer'

const props = defineProps<{
  markdown: string
  isStreaming?: boolean
}>()

const { variables } = useContractVariables()
const iframeRef = ref<HTMLIFrameElement>()

// Build filled vars map from the variables composable
const filledVars = computed(() => {
  const map: Record<string, string> = {}
  for (const v of variables.value) {
    if (v.value) map[v.name] = v.value
  }
  return map
})

const renderedHtml = computed(() => {
  if (!props.markdown) return ''
  const parsed = parseProposalMarkdown(props.markdown)
  return renderProposalHtml(parsed, filledVars.value)
})

const pageCount = computed(() => {
  if (!props.markdown) return 0
  return parseProposalMarkdown(props.markdown).pages.length
})

// Dynamic iframe height: each page is 297mm + 24px gap + 24px body padding top/bottom
const iframeHeight = computed(() => {
  const pages = pageCount.value
  if (!pages) return '400px'
  // 297mm ≈ 1123px at 96dpi, 24px gap between pages, 24px padding top + bottom
  return `${pages * 1123 + (pages - 1) * 24 + 48}px`
})

// Write HTML to iframe whenever it changes
watch(renderedHtml, (html) => {
  nextTick(() => {
    const iframe = iframeRef.value
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
  })
}, { immediate: true })

// Also write on mount
onMounted(() => {
  nextTick(() => {
    const iframe = iframeRef.value
    if (!iframe || !renderedHtml.value) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(renderedHtml.value)
    doc.close()
  })
})
</script>

<template>
  <div class="proposal-preview">
    <iframe
      ref="iframeRef"
      class="proposal-preview__iframe"
      :style="{ height: iframeHeight }"
      sandbox="allow-same-origin"
      frameborder="0"
    />
    <div v-if="isStreaming" class="proposal-preview__streaming">
      <div class="streaming-dot" />
      <span>Generating...</span>
    </div>
  </div>
</template>

<style scoped>
.proposal-preview {
  position: relative;
}

.proposal-preview__iframe {
  width: calc(210mm + 48px + 2px);
  border: none;
  border-radius: 4px;
  background: #C0C0C0;
  display: block;
}

.proposal-preview__streaming {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  color: var(--color-neutral-500);
}

.streaming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-500);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
</style>
