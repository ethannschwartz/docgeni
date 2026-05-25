<script setup lang="ts">
const emit = defineEmits<{
  fileSelected: [file: File]
}>()

const isDragging = ref(false)
const fileInput = ref<HTMLInputElement>()

const acceptedTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain'
]

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) validateAndEmit(file)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) validateAndEmit(file)
}

function validateAndEmit(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['pdf', 'docx', 'doc', 'txt'].includes(ext || '')) {
    return
  }
  emit('fileSelected', file)
}
</script>

<template>
  <div
    class="relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer group"
    :class="isDragging
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 scale-[1.01]'
      : 'border-neutral-300 dark:border-neutral-700 hover:border-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.docx,.doc,.txt"
      class="hidden"
      @change="handleFileSelect"
    >

    <div class="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        class="size-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
        :class="isDragging
          ? 'bg-primary-100 dark:bg-primary-900/50'
          : 'bg-neutral-100 dark:bg-neutral-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30'"
      >
        <UIcon
          :name="isDragging ? 'i-lucide-file-down' : 'i-lucide-upload'"
          class="size-8 transition-colors duration-300"
          :class="isDragging ? 'text-primary-500' : 'text-neutral-400 group-hover:text-primary-500'"
        />
      </div>

      <h3 class="text-lg font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
        {{ isDragging ? 'Drop your contract here' : 'Upload a contract' }}
      </h3>
      <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm">
        Drag and drop a PDF, Word document, or text file to have it reformatted as a professional contract
      </p>
      <div class="flex gap-2">
        <UBadge variant="subtle" color="neutral" size="sm">PDF</UBadge>
        <UBadge variant="subtle" color="neutral" size="sm">DOCX</UBadge>
        <UBadge variant="subtle" color="neutral" size="sm">TXT</UBadge>
      </div>
    </div>
  </div>
</template>
