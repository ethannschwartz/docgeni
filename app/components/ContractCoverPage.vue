<script setup lang="ts">
const props = defineProps<{
  content: string
}>()

const { theme } = useContractTheme()
const cover = computed(() => theme.value.coverPage)

// Parse cover page markdown for title, subtitle, etc.
const parsed = computed(() => {
  const lines = props.content.split('\n').filter(l => l.trim())
  const title = lines.find(l => l.startsWith('# '))?.replace('# ', '') || 'Contract'
  const subtitle = lines.find(l => l.startsWith('## '))?.replace('## ', '') || ''
  const details = lines.filter(l => !l.startsWith('#') && l.trim())
  return { title, subtitle, details }
})
</script>

<template>
  <div
    class="contract-page flex flex-col justify-between !p-0 overflow-hidden"
  >
    <div
      class="flex-1 flex flex-col justify-center items-center px-16 py-20 text-center relative"
      :style="{ backgroundColor: cover.backgroundColor }"
    >
      <!-- Decorative accent -->
      <div
        class="absolute top-0 left-0 w-full h-2"
        :style="{ backgroundColor: cover.accentColor }"
      />
      <div
        class="absolute bottom-0 left-0 right-0 h-48 opacity-10"
        :style="{
          background: `linear-gradient(to top, ${cover.accentColor}, transparent)`
        }"
      />

      <div class="relative z-10">
        <div
          class="w-16 h-1 rounded-full mx-auto mb-8"
          :style="{ backgroundColor: cover.accentColor }"
        />

        <h1
          class="text-4xl font-bold mb-4 leading-tight max-w-lg"
          :style="{ color: cover.titleColor }"
          v-html="parsed.title.replace(/\{\{(\w+)\}\}/g, '<span class=\'contract-variable\'>$1</span>')"
        />

        <p
          v-if="parsed.subtitle"
          class="text-xl mb-8 opacity-80"
          :style="{ color: cover.subtitleColor }"
        >
          {{ parsed.subtitle }}
        </p>

        <div
          class="w-12 h-px mx-auto mb-8"
          :style="{ backgroundColor: cover.subtitleColor }"
        />

        <div class="space-y-2">
          <p
            v-for="(detail, i) in parsed.details"
            :key="i"
            class="text-sm opacity-70"
            :style="{ color: cover.subtitleColor }"
            v-html="detail.replace(/\{\{(\w+)\}\}/g, '<span class=\'contract-variable\'>$1</span>')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
