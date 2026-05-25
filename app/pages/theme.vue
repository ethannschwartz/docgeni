<script setup lang="ts">
const { theme, resetTheme, generateCSS } = useContractTheme()

if (import.meta.client) {
  watchEffect(() => {
    let el = document.getElementById('contract-theme-css')
    if (!el) {
      el = document.createElement('style')
      el.id = 'contract-theme-css'
      document.head.appendChild(el)
    }
    el.textContent = generateCSS()
  })
}

const fontOptions = [
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Georgia', value: "'Georgia', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Helvetica Neue', value: "'Helvetica Neue', Helvetica, sans-serif" }
]

const fontSizeOptions = ['11px', '12px', '13px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px']
const weightOptions = ['300', '400', '500', '600', '700', '800']
const lineHeightOptions = ['1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '2.0']

// Preview markdown
const previewMarkdown = `# Service Agreement

## Section 1: Introduction

This agreement outlines the terms and conditions between **{{our_company_name}}** and **{{client_name}}** for the provision of professional services.

### 1.1 Purpose

The purpose of this document is to establish:

- Clear deliverables and timelines
- Payment terms and conditions
- Intellectual property rights

> **Important**: All parties must review and agree to these terms before commencement of work.

---

| Item | Description | Amount |
|------|-------------|--------|
| Phase 1 | Discovery & Planning | $5,000 |
| Phase 2 | Development | $15,000 |
| Phase 3 | Testing & Launch | $5,000 |

1. Initial consultation completed
2. Statement of work approved
3. Contract signed by both parties`

type ThemeElement = 'h1' | 'h2' | 'h3' | 'body' | 'listItem' | 'table' | 'blockquote'

const elements: { key: ThemeElement; label: string; icon: string }[] = [
  { key: 'h1', label: 'Heading 1', icon: 'i-lucide-heading-1' },
  { key: 'h2', label: 'Heading 2', icon: 'i-lucide-heading-2' },
  { key: 'h3', label: 'Heading 3', icon: 'i-lucide-heading-3' },
  { key: 'body', label: 'Body Text', icon: 'i-lucide-type' },
  { key: 'listItem', label: 'List Items', icon: 'i-lucide-list' },
  { key: 'table', label: 'Tables', icon: 'i-lucide-table' },
  { key: 'blockquote', label: 'Blockquotes', icon: 'i-lucide-quote' }
]

const activeElement = ref<ThemeElement>('h1')
const activeStyle = computed(() => theme.value[activeElement.value])

// Simple markdown to HTML for preview
function previewToHtml(md: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\{\{(\w+)\}\}/g, '<span class="contract-variable">$1</span>')

  // Tables
  html = html.replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
    const headers = header.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('')
    const rows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
  })

  html = html.split('\n\n').map(block => {
    block = block.trim()
    if (!block) return ''
    if (block.startsWith('<')) {
      if (block.includes('<li>')) return `<ul>${block}</ul>`
      return block
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`
  }).join('\n')

  return html
}
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Controls sidebar -->
    <div class="w-96 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-y-auto">
      <div class="p-5">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Theme Editor</h2>
          <UButton variant="ghost" color="neutral" size="xs" @click="resetTheme">
            Reset
          </UButton>
        </div>

        <!-- Element selector -->
        <div class="space-y-1 mb-6">
          <button
            v-for="el in elements"
            :key="el.key"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="activeElement === el.key
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'"
            @click="activeElement = el.key"
          >
            <UIcon :name="el.icon" class="size-4" />
            {{ el.label }}
          </button>
        </div>

        <div class="border-t border-neutral-200 dark:border-neutral-800 pt-5 space-y-4">
          <!-- Font Family -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Font Family</label>
            <select
              v-model="activeStyle.fontFamily"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>

          <!-- Font Size -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Font Size</label>
            <select
              v-model="activeStyle.fontSize"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="s in fontSizeOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <!-- Font Weight -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Font Weight</label>
            <select
              v-model="activeStyle.fontWeight"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="w in weightOptions" :key="w" :value="w">{{ w }}</option>
            </select>
          </div>

          <!-- Color -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="activeStyle.color"
                type="color"
                class="size-8 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700"
              >
              <UInput v-model="activeStyle.color" size="sm" class="flex-1" />
            </div>
          </div>

          <!-- Line Height -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Line Height</label>
            <select
              v-model="activeStyle.lineHeight"
              class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="l in lineHeightOptions" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>

          <!-- Margin Bottom -->
          <div>
            <label class="text-xs font-medium text-neutral-500 mb-1 block">Margin Bottom</label>
            <UInput v-model="activeStyle.marginBottom" size="sm" placeholder="12px" />
          </div>
        </div>

        <!-- Cover Page Theme -->
        <div class="border-t border-neutral-200 dark:border-neutral-800 mt-6 pt-5">
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Cover Page</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-neutral-500 mb-1 block">Background</label>
              <div class="flex items-center gap-2">
                <input v-model="theme.coverPage.backgroundColor" type="color" class="size-8 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700">
                <UInput v-model="theme.coverPage.backgroundColor" size="sm" class="flex-1" />
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-neutral-500 mb-1 block">Accent Color</label>
              <div class="flex items-center gap-2">
                <input v-model="theme.coverPage.accentColor" type="color" class="size-8 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700">
                <UInput v-model="theme.coverPage.accentColor" size="sm" class="flex-1" />
              </div>
            </div>
          </div>
        </div>

        <!-- Divider styles -->
        <div class="border-t border-neutral-200 dark:border-neutral-800 mt-6 pt-5">
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Dividers</h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs font-medium text-neutral-500 mb-1 block">Color</label>
              <div class="flex items-center gap-2">
                <input v-model="theme.divider.color" type="color" class="size-8 rounded cursor-pointer border border-neutral-200 dark:border-neutral-700">
                <UInput v-model="theme.divider.color" size="sm" class="flex-1" />
              </div>
            </div>
            <div>
              <label class="text-xs font-medium text-neutral-500 mb-1 block">Width</label>
              <UInput v-model="theme.divider.width" size="sm" placeholder="1px" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live preview -->
    <div class="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-950 py-8 px-4">
      <div class="max-w-[240mm] mx-auto">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-medium text-neutral-500">Live Preview</h3>
          <UBadge variant="subtle" color="primary" size="sm">Updates in real-time</UBadge>
        </div>
        <div class="contract-page">
          <div class="contract-content" v-html="previewToHtml(previewMarkdown)" />
        </div>
      </div>
    </div>
  </div>
</template>
