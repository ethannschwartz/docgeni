<script setup lang="ts">
import { splitMarkdownIntoSections, rebuildMarkdown } from '~/composables/useSectionEditor'

const markdown = useState<string>('editorMarkdown')
const { editingIndex, isEditing, editError, editSection } = useSectionEditor()

const parsed = computed(() => splitMarkdownIntoSections(markdown.value))

// Track which section has the AI input open
const aiInputOpen = ref<number | null>(null)
const aiInstructions = ref<Record<number, string>>({})

function toggleAiInput(index: number) {
  if (aiInputOpen.value === index) {
    aiInputOpen.value = null
  } else {
    aiInputOpen.value = index
    if (!aiInstructions.value[index]) aiInstructions.value[index] = ''
  }
}

async function submitAiEdit(index: number) {
  const instruction = aiInstructions.value[index]?.trim()
  if (!instruction) return
  await editSection(index, instruction)
  aiInstructions.value[index] = ''
  aiInputOpen.value = null
}

function updateSectionBody(index: number, newBody: string) {
  const { frontMatter, sections } = splitMarkdownIntoSections(markdown.value)
  sections[index] = { ...sections[index]!, body: newBody }
  markdown.value = rebuildMarkdown(frontMatter, sections)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Front-matter card -->
    <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4">
      <div class="flex items-center gap-2 mb-2">
        <UIcon name="i-lucide-settings-2" class="text-neutral-400" />
        <span class="text-sm font-medium text-neutral-500">Front Matter</span>
      </div>
      <p class="text-xs text-neutral-400">Edit variables in the sidebar panel.</p>
    </div>

    <!-- Section cards -->
    <div
      v-for="(section, index) in parsed.sections"
      :key="index"
      class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden"
      :class="{ 'ring-2 ring-primary-500/50': editingIndex === index }"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          # {{ section.heading }}
        </h3>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-sparkles"
            variant="ghost"
            color="primary"
            size="xs"
            :disabled="isEditing"
            :loading="editingIndex === index"
            @click="toggleAiInput(index)"
          >
            AI Edit
          </UButton>
        </div>
      </div>

      <!-- AI Edit input -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-32"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-32"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="aiInputOpen === index" class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-primary-50/50 dark:bg-primary-950/20 overflow-hidden">
          <div class="flex gap-2">
            <input
              v-model="aiInstructions[index]"
              type="text"
              placeholder="e.g. Make this more concise, split fee into monthly payments..."
              class="flex-1 text-sm px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              :disabled="isEditing"
              @keydown.enter="submitAiEdit(index)"
            />
            <UButton
              icon="i-lucide-send"
              size="xs"
              color="primary"
              :disabled="isEditing || !aiInstructions[index]?.trim()"
              :loading="editingIndex === index"
              @click="submitAiEdit(index)"
            />
          </div>
        </div>
      </Transition>

      <!-- Section body -->
      <div class="p-4">
        <textarea
          :value="section.body"
          class="w-full min-h-[120px] text-sm font-mono bg-transparent resize-y focus:outline-none text-neutral-800 dark:text-neutral-200"
          :disabled="editingIndex === index"
          @input="updateSectionBody(index, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <!-- Error -->
      <div v-if="editError && editingIndex === index" class="px-4 pb-3">
        <p class="text-xs text-red-500">{{ editError }}</p>
      </div>
    </div>
  </div>
</template>
