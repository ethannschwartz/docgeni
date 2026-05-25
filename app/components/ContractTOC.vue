<script setup lang="ts">
import { extractHeadings } from '~/utils/contractParser'

const props = defineProps<{
  markdown: string
}>()

const headings = computed(() => extractHeadings(props.markdown))
</script>

<template>
  <ContractPage>
    <h2 class="text-2xl font-bold mb-8 text-neutral-900 dark:text-neutral-100">
      Table of Contents
    </h2>
    <nav class="space-y-1">
      <a
        v-for="heading in headings"
        :key="heading.id"
        :href="`#${heading.id}`"
        class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group"
        :class="{
          'pl-3': heading.level === 1,
          'pl-8': heading.level === 2,
          'pl-14': heading.level === 3
        }"
      >
        <span
          class="text-sm flex-1"
          :class="{
            'font-semibold text-neutral-900 dark:text-neutral-100': heading.level === 1,
            'font-medium text-neutral-700 dark:text-neutral-300': heading.level === 2,
            'text-neutral-500 dark:text-neutral-400': heading.level === 3
          }"
        >
          {{ heading.text }}
        </span>
        <span class="flex-1 border-b border-dotted border-neutral-300 dark:border-neutral-700 mx-2" />
        <UIcon name="i-lucide-chevron-right" class="size-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    </nav>
  </ContractPage>
</template>
