<script setup lang="ts">
const props = defineProps<{
  modelValue?: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const canvasRef = ref<HTMLCanvasElement>()
const isDrawing = ref(false)
const hasStrokes = ref(false)

function getCtx() {
  const canvas = canvasRef.value
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return ctx
}

function getPos(e: MouseEvent | TouchEvent) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  if ('touches' in e) {
    const t = e.touches[0]!
    return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
  }
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function startDraw(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  const ctx = getCtx()
  if (!ctx) return
  isDrawing.value = true
  hasStrokes.value = true
  const pos = getPos(e)
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
}

function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing.value) return
  e.preventDefault()
  const ctx = getCtx()
  if (!ctx) return
  const pos = getPos(e)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
}

function endDraw() {
  isDrawing.value = false
}

function clear() {
  const canvas = canvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  hasStrokes.value = false
  emit('update:modelValue', '')
}

function done() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dataUrl = canvas.toDataURL('image/png')
  emit('update:modelValue', dataUrl)
}

// Redraw from modelValue on mount
onMounted(() => {
  if (props.modelValue && props.modelValue.startsWith('data:')) {
    const img = new Image()
    img.onload = () => {
      const ctx = canvasRef.value?.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.value!.width, canvasRef.value!.height)
        ctx.drawImage(img, 0, 0)
        hasStrokes.value = true
      }
    }
    img.src = props.modelValue
  }
})
</script>

<template>
  <div class="space-y-1.5">
    <div class="text-xs font-medium text-neutral-600 dark:text-neutral-400">{{ label }}</div>

    <div v-if="modelValue" class="relative rounded-lg border border-neutral-200 dark:border-neutral-700 p-2 bg-white dark:bg-neutral-800">
      <img :src="modelValue" alt="Signature" class="max-h-14 w-auto" />
      <button
        class="absolute top-1 right-1 p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        @click="clear"
      >
        <UIcon name="i-lucide-x" class="size-3.5" />
      </button>
    </div>

    <div v-else class="space-y-1.5">
      <canvas
        ref="canvasRef"
        width="400"
        height="160"
        class="w-full h-20 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 cursor-crosshair touch-none"
        @mousedown="startDraw"
        @mousemove="draw"
        @mouseup="endDraw"
        @mouseleave="endDraw"
        @touchstart="startDraw"
        @touchmove="draw"
        @touchend="endDraw"
      />
      <div class="flex gap-1.5">
        <UButton
          variant="outline"
          color="neutral"
          size="xs"
          icon="i-lucide-eraser"
          :disabled="!hasStrokes"
          @click="clear"
        >
          Clear
        </UButton>
        <UButton
          variant="solid"
          color="primary"
          size="xs"
          icon="i-lucide-check"
          :disabled="!hasStrokes"
          @click="done"
        >
          Done
        </UButton>
      </div>
    </div>
  </div>
</template>
