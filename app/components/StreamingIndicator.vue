<script setup lang="ts">
const props = defineProps<{
  progress: number
  isGenerating: boolean
}>()
</script>

<template>
  <div v-if="isGenerating" class="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm">
    <div class="flex items-center gap-3 mb-3">
      <div class="relative size-8">
        <div class="absolute inset-0 rounded-full border-2 border-primary-200 dark:border-primary-900" />
        <div
          class="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"
        />
      </div>
      <div>
        <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Generating contract</p>
        <p class="text-xs text-neutral-500">Claude is reformatting your document...</p>
      </div>
    </div>
    <UProgress :value="progress" size="xs" color="primary" />
  </div>
</template>
