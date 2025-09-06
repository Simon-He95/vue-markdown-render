<script setup lang="ts">
import { Icon } from '@iconify/vue'
import mermaid from 'mermaid'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { isDark } from '../../utils/isDark'
import { Button } from '../button'

const props = withDefaults(
  defineProps<{
    node: {
      type: 'code_block'
      language: string
      code: string
    }
    maxHeight?: string | null
  }>(),
  {
    maxHeight: '500px',
  },
)

const { t } = useI18n()
const copyText = ref(t('common.copy'))
const mermaidContainer = ref<HTMLElement>()
const mermaidWrapper = ref<HTMLElement>()
const mermaidContent = ref<HTMLElement>()
const modalContent = ref<HTMLElement>()
const modalCloneWrapper = ref<HTMLElement | null>(null)
const fixedCode = computed(() => {
  return props.node.code
    .replace(/\]::([^:])/g, ']:::$1') // 将 :: 更改为 ::: 来应用类样式
    .replace(/:::subgraphNode$/gm, '::subgraphNode')
})

// Zoom state
const zoom = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// 避免直接渲染画面报错
const showSource = ref(true)
const isRendering = ref(false)
const renderQueue = ref<Promise<void> | null>(null)
const RENDER_DEBOUNCE_DELAY = 300
const CONTENT_STABLE_DELAY = 500
const lastContentLength = ref(0)
const isContentGenerating = ref(false)
let contentStableTimer: number | null = null

const containerHeight = ref<string>('360px') // 初始值与 min-h 保持一致
let resizeObserver: ResizeObserver | null = null

/**
 * 健壮地计算并更新容器高度，优先使用viewBox，并提供getBBox作为后备
 * @param newContainerWidth - 可选的容器宽度，由ResizeObserver提供以确保精确
 */
function updateContainerHeight(newContainerWidth?: number) {
  if (!mermaidContainer.value || !mermaidContent.value)
    return

  const svgElement = mermaidContent.value.querySelector('svg')
  if (!svgElement)
    return

  let intrinsicWidth = 0
  let intrinsicHeight = 0

  // 1. 尝试从SVG属性解析尺寸
  const viewBox = svgElement.getAttribute('viewBox')
  const attrWidth = svgElement.getAttribute('width')
  const attrHeight = svgElement.getAttribute('height')

  // 优先使用 viewBox，因为它通常最能反映内容的真实比例
  if (viewBox) {
    const parts = viewBox.split(' ')
    if (parts.length === 4) {
      intrinsicWidth = Number.parseFloat(parts[2])
      intrinsicHeight = Number.parseFloat(parts[3])
    }
  }

  // 如果 viewBox 解析失败或不存在，尝试回退到 width/height 属性
  if (!intrinsicWidth || !intrinsicHeight) {
    if (attrWidth && attrHeight) {
      intrinsicWidth = Number.parseFloat(attrWidth)
      intrinsicHeight = Number.parseFloat(attrHeight)
    }
  }

  // 2. 如果从属性解析失败，使用 getBBox() 作为最终后备方案
  if (Number.isNaN(intrinsicWidth) || Number.isNaN(intrinsicHeight) || intrinsicWidth <= 0 || intrinsicHeight <= 0) {
    try {
      // getBBox() 可以精确测量SVG内容的实际渲染边界
      const bbox = svgElement.getBBox()
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        intrinsicWidth = bbox.width
        intrinsicHeight = bbox.height
      }
    }
    catch (e) {
      // 在某些罕见情况下（如SVG display:none），getBBox可能会报错
      console.error('Failed to get SVG BBox:', e)
      // 在这里可以决定是否要回退到一个默认高度，或者什么都不做
      return
    }
  }

  // 3. 如果成功获取尺寸，则计算并应用高度
  if (intrinsicWidth > 0 && intrinsicHeight > 0) {
    const aspectRatio = intrinsicHeight / intrinsicWidth
    // 如果外部传入了宽度，则使用它，否则自己获取
    const containerWidth = newContainerWidth ?? mermaidContainer.value.clientWidth
    let newHeight = containerWidth * aspectRatio
    if (newHeight > intrinsicHeight)
      newHeight = intrinsicHeight // 高保真，不超过内容的固有高度
    containerHeight.value = `${newHeight}px`
  }
}

// Modal pseudo-fullscreen state (fixed overlay)
const isModalOpen = ref(false)

const transformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${zoom.value})`,
}))

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isModalOpen.value) {
    closeModal()
  }
}

function openModal() {
  isModalOpen.value = true
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)

  nextTick(() => {
    if (mermaidContainer.value && modalContent.value) {
      // clone the container for modal and add fullscreen to the clone (not original)
      const clone = mermaidContainer.value.cloneNode(true) as HTMLElement
      clone.classList.add('fullscreen')

      // find the wrapper inside the clone using the data attribute and keep a ref
      const wrapper = clone.querySelector(
        '[data-mermaid-wrapper]',
      ) as HTMLElement | null
      if (wrapper) {
        modalCloneWrapper.value = wrapper
        // apply current transform to the clone so it matches the original state
        wrapper.style.transform = (transformStyle.value as any).transform
      }

      // clear any previous content and append the clone
      modalContent.value.innerHTML = ''
      modalContent.value.appendChild(clone)
    }
  })
}

function closeModal() {
  isModalOpen.value = false
  // remove the cloned modal content and clear clone ref
  if (modalContent.value) {
    modalContent.value.innerHTML = ''
  }
  modalCloneWrapper.value = null
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

function checkContentStability() {
  if (!showSource.value) {
    return
  }

  const currentLength = fixedCode.value.length

  // 只要长度不一致，就认为内容在变化
  if (currentLength !== lastContentLength.value) {
    isContentGenerating.value = true
    lastContentLength.value = currentLength

    if (contentStableTimer) {
      clearTimeout(contentStableTimer)
    }

    contentStableTimer = setTimeout(() => {
      if (
        isContentGenerating.value
        && showSource.value
        && fixedCode.value.trim()
      ) {
        isContentGenerating.value = false
        showSource.value = false
      }
    }, CONTENT_STABLE_DELAY)
  }
}

// keep modal clone in sync with transform changes
watch(
  transformStyle,
  (newStyle) => {
    if (isModalOpen.value && modalCloneWrapper.value) {
      modalCloneWrapper.value.style.transform = (newStyle as any).transform
    }
  },
  { immediate: true },
)

// Zoom controls
function zoomIn() {
  if (zoom.value < 3) {
    zoom.value += 0.1
  }
}

function zoomOut() {
  if (zoom.value > 0.5) {
    zoom.value -= 0.1
  }
}

function resetZoom() {
  zoom.value = 1
  translateX.value = 0
  translateY.value = 0
}

// Drag functionality
function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  if (e instanceof MouseEvent) {
    dragStart.value = {
      x: e.clientX - translateX.value,
      y: e.clientY - translateY.value,
    }
  }
  else {
    dragStart.value = {
      x: e.touches[0].clientX - translateX.value,
      y: e.touches[0].clientY - translateY.value,
    }
  }
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value)
    return

  let clientX: number
  let clientY: number

  if (e instanceof MouseEvent) {
    clientX = e.clientX
    clientY = e.clientY
  }
  else {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  }

  translateX.value = clientX - dragStart.value.x
  translateY.value = clientY - dragStart.value.y
}

function stopDrag() {
  isDragging.value = false
}

// Wheel zoom functionality
function handleWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    if (!mermaidContainer.value)
      return

    const rect = mermaidContainer.value.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    const containerCenterX = rect.width / 2
    const containerCenterY = rect.height / 2
    const offsetX = mouseX - containerCenterX
    const offsetY = mouseY - containerCenterY
    const contentMouseX = (offsetX - translateX.value) / zoom.value
    const contentMouseY = (offsetY - translateY.value) / zoom.value
    const sensitivity = 0.01
    const delta = -event.deltaY * sensitivity
    const newZoom = Math.min(Math.max(zoom.value + delta, 0.5), 3)

    if (newZoom !== zoom.value) {
      translateX.value = offsetX - contentMouseX * newZoom
      translateY.value = offsetY - contentMouseY * newZoom
      zoom.value = newZoom
    }
  }
}

// Copy functionality
async function copyCode() {
  try {
    await navigator.clipboard.writeText(fixedCode.value)
    copyText.value = t('common.copySuccess')
    setTimeout(() => {
      copyText.value = t('common.copy')
    }, 2000)
  }
  catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Export SVG
async function exportSvg() {
  try {
    const svgElement = mermaidContent.value?.querySelector('svg')
    if (!svgElement) {
      console.error('SVG element not found')
      return
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `mermaid-diagram-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  catch (error) {
    console.error('Failed to export SVG:', error)
  }
}

// 优化的 mermaid 渲染函数
async function initMermaid() {
  if (isRendering.value) {
    return renderQueue.value
  }

  if (!mermaidContent.value) {
    await nextTick()
    if (!mermaidContent.value) {
      console.warn('Mermaid container not ready')
      return
    }
  }

  isRendering.value = true

  renderQueue.value = (async () => {
    if (mermaidContent.value) {
      mermaidContent.value.style.opacity = '0'
    }

    try {
      const id = `mermaid-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`

      mermaid.initialize({
        theme: isDark.value ? 'dark' : 'default',
        securityLevel: 'loose',
        startOnLoad: false,
      })

      const { svg, bindFunctions } = await mermaid.render(
        id,
        fixedCode.value,
        mermaidContent.value,
      )

      if (mermaidContent.value) {
        mermaidContent.value.innerHTML = svg
        bindFunctions?.(mermaidContent.value)
        updateContainerHeight()
      }
    }
    catch (error) {
      console.error('Failed to render mermaid diagram:', error)
      if (mermaidContent.value) {
        const errorDiv = document.createElement('div')
        errorDiv.className = 'text-red-500 p-4'
        errorDiv.textContent = 'Failed to render diagram: '

        const errorSpan = document.createElement('span')
        errorSpan.textContent
          = error instanceof Error ? error.message : 'Unknown error'
        errorDiv.appendChild(errorSpan)

        mermaidContent.value.innerHTML = ''
        mermaidContent.value.appendChild(errorDiv)
      }
      containerHeight.value = '360px'
    }
    finally {
      await nextTick()
      if (mermaidContent.value) {
        mermaidContent.value.style.opacity = '1'
      }
      isRendering.value = false
      renderQueue.value = null
    }
  })()

  return renderQueue.value
}

const debouncedInitMermaid = debounce(initMermaid, RENDER_DEBOUNCE_DELAY)

// Watch for code changes
watch(
  () => fixedCode.value,
  () => {
    debouncedInitMermaid()
    checkContentStability()
  },
)

// Watch for dark mode changes with debounce
watch(isDark, debouncedInitMermaid)

// Watch for source toggle with proper timing
watch(
  () => showSource.value,
  async (newValue) => {
    if (!newValue) {
      await nextTick()
      await initMermaid()
    }
  },
)

// 监听容器元素的变化，并设置ResizeObserver
watch(
  mermaidContainer,
  (newEl) => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    console.log('mermaidContainer resized, scheduling height update')

    if (newEl) {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries && entries.length > 0) {
          // 直接使用ResizeObserver回调中提供的精确宽度
          // const newWidth = entries[0].contentRect.width
          // updateContainerHeight(newWidth)

          // 使用 requestAnimationFrame 确保在下一次重绘前执行更新
          // 这给了DOM充足的时间来完成SVG的内部布局更新
          requestAnimationFrame(() => {
            const newWidth = entries[0].contentRect.width
            updateContainerHeight(newWidth)
          })
        }
      })
      resizeObserver.observe(newEl)
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await nextTick()
  await initMermaid()
  lastContentLength.value = fixedCode.value.length
  // initialize
})

onUnmounted(() => {
  if (contentStableTimer) {
    clearTimeout(contentStableTimer)
  }
  // 在组件卸载时，确保观察者被彻底清理，防止内存泄漏
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div class="my-4 rounded-lg border border-border overflow-hidden shadow-sm">
    <div
      class="flex justify-between items-center p-2 bg-gray-100 dark:bg-zinc-800 text-xs"
    >
      <span class="text-gray-600 dark:text-gray-400 font-mono font-bold">Mermaid</span>
      <div class="flex items-center space-x-2">
        <button
          class="px-2 py-1 rounded-md transition-colors"
          :class="[
            !showSource
              ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700',
          ]"
          @click="showSource = false"
        >
          <div class="flex items-center space-x-1">
            <Icon icon="lucide:eye" class="w-4 h-4" />
            <span>Preview</span>
          </div>
        </button>
        <button
          class="px-2 py-1 rounded-md transition-colors"
          :class="[
            showSource
              ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700',
          ]"
          @click="showSource = true"
        >
          <div class="flex items-center space-x-1">
            <Icon icon="lucide:code" class="w-4 h-4" />
            <span>Source</span>
          </div>
        </button>
      </div>
      <div class="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors w-4 h-3"
          @click="copyCode"
        >
          <Icon icon="lucide:copy" class="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors w-4 h-3"
          @click="exportSvg"
        >
          <Icon icon="lucide:download" class="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors w-4 h-3"
          @click="openModal"
        >
          <Icon
            :icon="isModalOpen ? 'lucide:minimize-2' : 'lucide:maximize-2'"
            class="w-3 h-3"
          />
        </Button>
      </div>
    </div>
    <div v-if="showSource" class="p-4 bg-gray-50 dark:bg-zinc-900">
      <pre class="text-sm font-mono whitespace-pre-wrap">{{ fixedCode }}</pre>
    </div>
    <div v-else class="relative">
      <div class="absolute top-2 right-2 z-10 rounded-lg">
        <div class="flex items-center gap-1 backdrop-blur rounded-lg">
          <button
            class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
            @click="zoomIn"
          >
            <Icon icon="lucide:zoom-in" class="w-3 h-3" />
          </button>
          <button
            class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
            @click="zoomOut"
          >
            <Icon icon="lucide:zoom-out" class="w-3 h-3" />
          </button>
          <button
            class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
            @click="resetZoom"
          >
            {{ Math.round(zoom * 100) }}%
          </button>
        </div>
      </div>
      <div
        ref="mermaidContainer"
        class="min-h-[360px] bg-gray-50 dark:bg-zinc-900 relative transition-all duration-100 overflow-hidden block"
        :style="{ height: containerHeight }"
        @wheel="handleWheel"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        @touchstart="startDrag"
        @touchmove="onDrag"
        @touchend="stopDrag"
      >
        <div
          ref="mermaidWrapper"
          data-mermaid-wrapper
          class="absolute inset-0 cursor-grab"
          :class="{ 'cursor-grabbing': isDragging }"
          :style="transformStyle"
        >
          <div
            ref="mermaidContent"
            class="mermaid w-full text-center flex items-center justify-center min-h-full"
          />
        </div>
      </div>
      <!-- Modal pseudo-fullscreen overlay (teleported to body) -->
      <teleport to="body">
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          @click.self="closeModal"
        >
          <div
            class="relative w-full h-full max-w-full max-h-full bg-white dark:bg-zinc-900 rounded shadow-lg overflow-hidden"
          >
            <div class="absolute top-2 right-2 z-50 flex items-center">
              <button
                class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
                @click="zoomIn"
              >
                <Icon icon="lucide:zoom-in" class="w-3 h-3" />
              </button>
              <button
                class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
                @click="zoomOut"
              >
                <Icon icon="lucide:zoom-out" class="w-3 h-3" />
              </button>
              <button
                class="px-2 py-1 text-xs rounded text-muted-foreground hover:bg-slate-200 dark:hover:bg-background transition-colors"
                @click="resetZoom"
              >
                {{ Math.round(zoom * 100) }}%
              </button>
              <Button size="icon" variant="ghost" @click="closeModal">
                <Icon icon="lucide:x" class="w-4 h-4" />
              </Button>
            </div>
            <div
              ref="modalContent"
              class="w-full h-full flex items-center justify-center p-4 overflow-auto"
            />
          </div>
        </div>
      </teleport>
    </div>
  </div>
</template>

<style scoped>
.mermaid {
  font-family: inherit;
  transition: opacity 0.2s ease-in-out;
}

.mermaid :deep(svg) {
  width: 100%;
  height: auto;
  display: block;
}

.fullscreen {
  width: 100%;
  max-height: 100% !important;
}
</style>
