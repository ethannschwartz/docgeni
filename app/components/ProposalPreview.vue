<script setup lang="ts">
import { parseProposalMarkdown } from '~/utils/proposalParser'
import { renderProposalHtml } from '~/utils/proposalRenderer'

const props = defineProps<{
  markdown: string
  isStreaming?: boolean
}>()

const { variables } = useContractVariables()
const iframeRef = ref<HTMLIFrameElement>()
const iframeHeight = ref('400px')

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

function updateIframeContent() {
  nextTick(() => {
    const iframe = iframeRef.value
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(renderedHtml.value)
    doc.close()

    // After writing, measure the actual body height and size the iframe to fit
    nextTick(() => {
      setTimeout(() => {
        const body = doc.body
        if (body) {
          iframeHeight.value = body.scrollHeight + 'px'
        }
      }, 100)
    })
  })
}

// Write HTML to iframe whenever it changes
watch(renderedHtml, updateIframeContent, { immediate: true })

onMounted(updateIframeContent)
</script>

<template>
  <div class="proposal-preview">
    <iframe
      ref="iframeRef"
      class="proposal-preview__iframe"
      :style="{ height: iframeHeight }"
      sandbox="allow-same-origin"
      frameborder="0"
      scrolling="no"
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
  width: 100%;
  border: none;
  border-radius: 4px;
  background: #C0C0C0;
  display: block;
  overflow: hidden;
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
