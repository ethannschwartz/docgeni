<script setup lang="ts">
defineProps<{
  pageNumber?: number
  totalPages?: number
}>()

const { generateCSS } = useContractTheme()
const themeCSS = computed(() => generateCSS())

if (import.meta.client) {
  watchEffect(() => {
    let el = document.getElementById('contract-theme-css')
    if (!el) {
      el = document.createElement('style')
      el.id = 'contract-theme-css'
      document.head.appendChild(el)
    }
    el.textContent = themeCSS.value
  })
}
</script>

<template>
  <div class="contract-page">
    <div class="contract-content">
      <slot />
    </div>
    <div
      v-if="pageNumber"
      class="absolute bottom-6 right-8 text-xs text-neutral-400"
    >
      Page {{ pageNumber }}<span v-if="totalPages"> of {{ totalPages }}</span>
    </div>
  </div>
</template>
