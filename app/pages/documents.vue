<script setup lang="ts">
const router = useRouter()
const { documents, deleteDocument, duplicateDocument, updateDocument, loadFromStorage } = useDocuments()

onMounted(() => {
  loadFromStorage()
})

const sortedDocuments = computed(() =>
  [...documents.value].sort((a, b) => b.updatedAt - a.updatedAt)
)

// Inline rename state
const renamingId = ref<string | null>(null)
const renameValue = ref('')

function startRename(id: string, currentTitle: string) {
  renamingId.value = id
  renameValue.value = currentTitle
}

function commitRename(id: string) {
  if (renameValue.value.trim()) {
    updateDocument(id, { title: renameValue.value.trim() })
  }
  renamingId.value = null
}

// Delete confirmation
const deletingId = ref<string | null>(null)

function confirmDelete(id: string) {
  deletingId.value = id
}

function executeDelete() {
  if (deletingId.value) {
    deleteDocument(deletingId.value)
    deletingId.value = null
  }
}

function openDocument(id: string) {
  router.push({ path: '/', query: { id } })
}

function handleDuplicate(id: string) {
  duplicateDocument(id)
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function snippetFromMarkdown(md: string): string {
  // Strip YAML front matter, HTML comments, and markdown formatting
  return md
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/<!--.*?-->/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/\{\{\w+\}\}/g, '___')
    .trim()
    .slice(0, 120)
}
</script>

<template>
  <div class="overflow-y-auto py-8 px-4 h-full">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Documents
        </h1>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          to="/"
        >
          New document
        </UButton>
      </div>

      <!-- Empty state -->
      <div
        v-if="sortedDocuments.length === 0"
        class="text-center py-20"
      >
        <UIcon name="i-lucide-file-text" class="size-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
        <p class="text-neutral-500 mb-4">No documents yet</p>
        <UButton to="/" color="primary" variant="soft">
          Create your first document
        </UButton>
      </div>

      <!-- Document grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="doc in sortedDocuments"
          :key="doc.id"
          class="group relative border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
          @click="openDocument(doc.id)"
        >
          <!-- Type badge -->
          <div class="flex items-center gap-2 mb-2">
            <span
              class="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
              :class="doc.type === 'proposal'
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
            >
              {{ doc.type }}
            </span>
            <span class="text-xs text-neutral-400 ml-auto">
              {{ formatDate(doc.updatedAt) }}
            </span>
          </div>

          <!-- Title (inline editable) -->
          <div @click.stop>
            <input
              v-if="renamingId === doc.id"
              v-model="renameValue"
              class="w-full font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent border-b border-primary-400 outline-none mb-1"
              @keydown.enter="commitRename(doc.id)"
              @blur="commitRename(doc.id)"
              @vue:mounted="($event: any) => $event.el.focus()"
            />
            <h3 v-else class="font-semibold text-neutral-900 dark:text-neutral-100 truncate mb-1">
              {{ doc.title }}
            </h3>
          </div>

          <!-- Snippet -->
          <p class="text-xs text-neutral-500 line-clamp-2 mb-3">
            {{ snippetFromMarkdown(doc.markdown) }}
          </p>

          <!-- Actions -->
          <div
            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop
          >
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="startRename(doc.id, doc.title)"
            />
            <UButton
              icon="i-lucide-copy"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="handleDuplicate(doc.id)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="confirmDelete(doc.id)"
            />
          </div>
        </div>
      </div>

      <!-- Delete confirmation modal -->
      <UModal :open="!!deletingId" @update:open="(v: boolean) => { if (!v) deletingId = null }">
        <template #content>
          <div class="p-6">
            <h3 class="text-lg font-semibold mb-2">Delete document?</h3>
            <p class="text-neutral-500 mb-6">This action cannot be undone.</p>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="deletingId = null">
                Cancel
              </UButton>
              <UButton color="error" @click="executeDelete">
                Delete
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
