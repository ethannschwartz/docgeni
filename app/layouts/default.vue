<script setup lang="ts">
const route = useRoute()
const colorMode = useColorMode()
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' }
})
</script>

<template>
  <div class="min-h-screen flex flex-col h-screen bg-neutral-50 dark:bg-neutral-950">
    <header class="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
      <div class="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-lg">
            <UIcon name="i-lucide-file-text" class="text-primary-500 size-5" />
            DocGen
          </NuxtLink>
          <nav class="flex items-center gap-1">
            <UButton
              to="/"
              variant="ghost"
              :color="route.path === '/' ? 'primary' : 'neutral'"
              size="sm"
            >
              Editor
            </UButton>
            <UButton
              to="/theme"
              variant="ghost"
              :color="route.path === '/theme' ? 'primary' : 'neutral'"
              size="sm"
            >
              Theme
            </UButton>
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isDark = !isDark"
          />
        </div>
      </div>
    </header>
    <div class="grow overflow-hidden">
      <slot />
    </div>
  </div>
</template>
