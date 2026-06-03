<script setup lang="ts">
const { variables, ourVariables, clientVariables, generalVariables } = useContractVariables()
const { documentType } = useProposalState()

const signatureDataUrl = useState<string>('proposalSignature', () => '')
const sigFileInput = ref<HTMLInputElement>()

const groups = computed(() => [
  { label: 'Our Details', icon: 'i-lucide-building-2', items: ourVariables.value, color: 'primary' as const },
  { label: 'Client Details', icon: 'i-lucide-user', items: clientVariables.value, color: 'success' as const },
  { label: 'General', icon: 'i-lucide-settings', items: generalVariables.value, color: 'neutral' as const }
].filter(g => g.items.length > 0))

function handleSignatureUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    signatureDataUrl.value = reader.result as string
    // Store as a special variable so the renderer can access it
    const existing = variables.value.find(v => v.name === 'signer_signature_svg')
    if (existing) {
      existing.value = reader.result as string
    } else {
      variables.value.push({
        name: 'signer_signature_svg',
        displayName: 'signature',
        value: reader.result as string,
        category: 'our'
      })
    }
  }
  reader.readAsDataURL(file)
}

function removeSignature() {
  signatureDataUrl.value = ''
  const idx = variables.value.findIndex(v => v.name === 'signer_signature_svg')
  if (idx !== -1) variables.value.splice(idx, 1)
  if (sigFileInput.value) sigFileInput.value.value = ''
}

// Sync signatureDataUrl on mount from existing variables
onMounted(() => {
  const existing = variables.value.find(v => v.name === 'signer_signature_svg')
  if (existing?.value) signatureDataUrl.value = existing.value
})

// Also watch variables for when a saved document is loaded
watch(variables, (vars) => {
  const existing = vars.find(v => v.name === 'signer_signature_svg')
  signatureDataUrl.value = existing?.value || ''
}, { deep: true })
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2 mb-2">
      <UIcon name="i-lucide-brackets" class="size-5 text-primary-500" />
      <h3 class="font-semibold text-neutral-900 dark:text-neutral-100">Variables</h3>
      <UBadge :label="String(variables.length)" variant="subtle" size="sm" />
    </div>

    <div v-if="variables.length === 0" class="text-sm text-neutral-500 py-4 text-center">
      No variables detected yet. Generate a contract to see editable fields.
    </div>

    <!-- Signature upload (proposals) -->
    <div v-if="documentType === 'proposal' && variables.length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-pen-line" class="size-4 text-neutral-500" />
        <span class="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Signature
        </span>
      </div>
      <div v-if="signatureDataUrl" class="relative rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-800">
        <img :src="signatureDataUrl" alt="Signature" class="max-h-16 w-auto" />
        <button
          class="absolute top-1 right-1 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
          @click="removeSignature"
        >
          <UIcon name="i-lucide-x" class="size-4" />
        </button>
      </div>
      <div v-else>
        <input
          ref="sigFileInput"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          class="hidden"
          @change="handleSignatureUpload"
        />
        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-upload"
          block
          @click="sigFileInput?.click()"
        >
          Upload signature image
        </UButton>
        <p class="text-xs text-neutral-400 mt-1">PNG, JPG, or SVG</p>
      </div>
    </div>

    <div v-for="group in groups" :key="group.label" class="space-y-3">
      <div class="flex items-center gap-2">
        <UIcon :name="group.icon" class="size-4 text-neutral-500" />
        <span class="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {{ group.label }}
        </span>
      </div>

      <div class="space-y-2">
        <div
          v-for="variable in group.items"
          :key="variable.name"
          class="group"
        >
          <template v-if="variable.name !== 'signer_signature_svg'">
            <label class="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block capitalize">
              {{ variable.displayName }}
            </label>
            <UInput
              v-model="variable.value"
              :placeholder="variable.displayName"
              size="lg"
              class="w-full"
              variant="subtle"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
