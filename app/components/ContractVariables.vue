<script setup lang="ts">
const { variables, ourVariables, clientVariables, generalVariables } = useContractVariables()

const groups = computed(() => [
  { label: 'Our Details', icon: 'i-lucide-building-2', items: ourVariables.value, color: 'primary' as const },
  { label: 'Client Details', icon: 'i-lucide-user', items: clientVariables.value, color: 'success' as const },
  { label: 'General', icon: 'i-lucide-settings', items: generalVariables.value, color: 'neutral' as const }
].filter(g => g.items.length > 0))
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
          <label class="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 block capitalize">
            {{ variable.displayName }}
          </label>
          <UInput
            v-model="variable.value"
            :placeholder="variable.displayName"
            size="sm"
          />
        </div>
      </div>
    </div>
  </div>
</template>
