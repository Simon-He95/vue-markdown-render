<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRouter } from 'vue-router'
import { getUseMonaco } from '../../../src/components/CodeBlockNode/monaco'
import MarkdownRender from '../../../src/components/NodeRenderer'
import { removeCustomComponents, setCustomComponents } from '../../../src/utils/nodeComponents'
import KatexWorker from '../../../src/workers/katexRenderer.worker?worker&inline'
import { setKaTeXWorker } from '../../../src/workers/katexWorkerClient'
import MermaidWorker from '../../../src/workers/mermaidParser.worker?worker&inline'
import { setMermaidWorker } from '../../../src/workers/mermaidWorkerClient'
import ThinkingNode from '../components/ThinkingNode.vue'
import { streamContent } from '../const/markdown'
import 'katex/dist/katex.min.css'
// import MarkdownCodeBlockNode from '../../../src/components/MarkdownCodeBlockNode'

// 每隔 10 毫秒输出一部分内容
const content = ref<string>('')
const streamDelay = useLocalStorage<number>('vmr-settings-stream-delay', 16)
const streamChunkSize = useLocalStorage<number>('vmr-settings-stream-chunk-size', 1)
const normalizedChunkSize = computed(() => Math.max(1, Math.floor(streamChunkSize.value) || 1))

// 预加载 Monaco 编辑器
getUseMonaco()
setKaTeXWorker(new KatexWorker())
setMermaidWorker(new MermaidWorker())
const router = useRouter()

function goToTest() {
  // Prefer router navigation, fallback to full redirect if it fails.
  router.push('/test').catch(() => {
    window.location.href = '/test'
  })
}

// Keep persisted values within reasonable bounds on hydration.
watchEffect(() => {
  const parsedDelay = Number(streamDelay.value)
  const fallbackDelay = Number.isFinite(parsedDelay) ? parsedDelay : 16
  const boundedDelay = Math.min(200, Math.max(4, fallbackDelay))
  if (streamDelay.value !== boundedDelay)
    streamDelay.value = boundedDelay
})

watchEffect(() => {
  const parsedChunk = Number(streamChunkSize.value)
  const fallbackChunk = Number.isFinite(parsedChunk) ? parsedChunk : 1
  const normalizedChunk = Math.floor(fallbackChunk) || 1
  const boundedChunk = Math.min(16, Math.max(1, normalizedChunk))
  if (streamChunkSize.value !== boundedChunk)
    streamChunkSize.value = boundedChunk
})

// To avoid flashing sequences like ":::" during streaming (which later
// become an AdmonitionNode), we look ahead when encountering ":" and
// defer appending consecutive colons until a non-colon character is seen.
useInterval(streamDelay, {
  callback() {
    const cur = content.value.length
    if (cur >= streamContent.length)
      return
    const chunkSize = normalizedChunkSize.value
    const nextChunk = streamContent.slice(cur, cur + chunkSize)
    // Append chunk-sized slices so users can preview larger batches while streaming.
    content.value += nextChunk
  },
})

setCustomComponents('playground-demo', { thinking: ThinkingNode })
const parseOptions = {
  preTransformTokens: (tokens: any[]) => {
    // Example: Log tokens during parsing
    // console.log('Pre-transform tokens:', tokens)
    return tokens.map((token) => {
      if (token.content === '<') {
        token.content = ''
        if (token.children)
          token.children.length = 0
      }
      if (token.type === 'html_block' && /^<\w+/.test(token.content) && !token.content.includes('>')) {
        token.type = 'inline'
        token.children = []
      }
      if (token.type === 'inline' && /^<\w*/.test(token.content) && !token.content.includes('>')) {
        token.children.length = 0
      }
      if ((token.type === 'inline' || token.type === 'html_block') && token.content.startsWith('<thinking>')) {
        const loading = !token.content.endsWith('</thinking>')
        return {
          children: [
            {
              type: 'thinking',
              loading,
              // eslint-disable-next-line regexp/no-super-linear-backtracking
              content: token.content.replace('<thinking>', '').replace(/<\/*t*h*i*n*k*i*n*g*>*$/, ''),
            },
          ],
        }
      }
      return token
    })
  },
}

// 主题切换
const isDark = useDark()
const toggleTheme = useToggle(isDark)
// Code block theme selector (single dropdown)
const themes = [
  'andromeeda',
  'aurora-x',
  'ayu-dark',
  'catppuccin-frappe',
  'catppuccin-latte',
  'catppuccin-macchiato',
  'catppuccin-mocha',
  'dark-plus',
  'dracula',
  'dracula-soft',
  'everforest-dark',
  'everforest-light',
  'github-dark',
  'github-dark-default',
  'github-dark-dimmed',
  'github-dark-high-contrast',
  'github-light',
  'github-light-default',
  'github-light-high-contrast',
  'gruvbox-dark-hard',
  'gruvbox-dark-medium',
  'gruvbox-dark-soft',
  'gruvbox-light-hard',
  'gruvbox-light-medium',
  'gruvbox-light-soft',
  'houston',
  'kanagawa-dragon',
  'kanagawa-lotus',
  'kanagawa-wave',
  'laserwave',
  'light-plus',
  'material-theme',
  'material-theme-darker',
  'material-theme-lighter',
  'material-theme-ocean',
  'material-theme-palenight',
  'min-dark',
  'min-light',
  'monokai',
  'night-owl',
  'nord',
  'one-dark-pro',
  'one-light',
  'plastic',
  'poimandres',
  'red',
  'rose-pine',
  'rose-pine-dawn',
  'rose-pine-moon',
  'slack-dark',
  'slack-ochin',
  'snazzy-light',
  'solarized-dark',
  'solarized-light',
  'synthwave-84',
  'tokyo-night',
  'vesper',
  'vitesse-black',
  'vitesse-dark',
  'vitesse-light',
]
const selectedTheme = useLocalStorage<string>('vmr-settings-selected-theme', 'vitesse-dark')

// 格式化主题名称显示
function formatThemeName(themeName: string) {
  return themeName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// 设置面板显示状态
const showSettings = ref(false)

// Auto-scroll to bottom as content streams in
const messagesContainer = ref<HTMLElement | null>(null)
const autoScrollEnabled = ref(true) // Track if auto-scroll is enabled
const lastScrollTop = ref(0) // Track last scroll position to detect scroll direction
// Track the last user-driven scroll direction: 'none' (no user scroll yet), 'up', or 'down'
const lastUserScrollDirection = ref<'none' | 'up' | 'down'>('none')
// Timestamp of last user scroll event (ms)
const lastUserScrollTime = ref(0)
// Flag to ignore scroll events caused by our own programmatic scrolling
const isProgrammaticScroll = ref(false)
let lastKnownScrollHeight = 0
// Check if user is at the bottom of scroll area (fallback based on pixels)
function isAtBottom(element: HTMLElement, threshold = 50): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
}

// IntersectionObserver sentinel ref for robust bottom detection (better on mobile)
const bottomSentinel = ref<HTMLElement | null>(null)
let bottomObserver: IntersectionObserver | null = null

// ResizeObserver to detect content height changes (for async rendering like code highlighting, mermaid, etc.)
let contentResizeObserver: ResizeObserver | null = null
// MutationObserver to detect DOM changes (like table loading -> content)
let contentMutationObserver: MutationObserver | null = null

function setupBottomObserver() {
  if (!messagesContainer.value)
    return

  // If already observing, disconnect first
  if (bottomObserver) {
    bottomObserver.disconnect()
    bottomObserver = null
  }

  // Create observer that watches a tiny sentinel element positioned after the content.
  // When visible, we consider the user to be at (or very near) the bottom and can
  // re-enable auto-scroll. This approach is more reliable on mobile where scroll
  // metrics and visualViewport changes can be noisy.
  // We use a slight negative bottom rootMargin so the sentinel becomes "intersecting"
  // a little before the true bottom. This helps on mobile where layout/viewport
  // adjustments (keyboard, visualViewport) can delay reaching the exact scroll bottom.
  const BOTTOM_OBSERVER_ROOT_MARGIN = '0px 0px -120px 0px' // trigger ~120px before bottom

  bottomObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        // Re-enable auto-scroll only if the user hasn't recently scrolled up.
        // This prevents interrupting an intentional user scroll away from bottom.
        // If lastUserScrollDirection is 'up' and recent, don't re-enable immediately.
        const recentUser = Date.now() - lastUserScrollTime.value < 1000
        if (lastUserScrollDirection.value === 'up' && recentUser) {
          // Keep auto-scroll disabled for now.
          return
        }

        autoScrollEnabled.value = true
      }
    }
  }, {
    root: messagesContainer.value,
    rootMargin: BOTTOM_OBSERVER_ROOT_MARGIN,
    threshold: 0,
  })

  // Observe the sentinel if it exists. If sentinel isn't present yet, try again
  // after a microtask (it will be present after nextTick when rendering).
  nextTick(() => {
    if (bottomSentinel.value)
      bottomObserver?.observe(bottomSentinel.value)
  })
}

function teardownBottomObserver() {
  if (bottomObserver) {
    bottomObserver.disconnect()
    bottomObserver = null
  }
}

// Unified function to perform auto-scroll to bottom
let scrollCheckTimeoutId: number | null = null
let lastScrollAttemptTime = 0
function performAutoScrollIfNeeded(force = false) {
  if (!messagesContainer.value || !autoScrollEnabled.value)
    return

  const container = messagesContainer.value
  const nearBottom = isAtBottom(container, 150)
  const shouldScroll = force || nearBottom
  if (!shouldScroll)
    return

  const doImmediateScroll = () => {
    executeScroll()
    lastScrollAttemptTime = Date.now()
    // Run a follow-up on the next frame so late layout changes still snap to bottom.
    requestAnimationFrame(() => {
      executeScroll()
      lastScrollAttemptTime = Date.now()
    })
  }

  if (force) {
    if (scrollCheckTimeoutId !== null) {
      clearTimeout(scrollCheckTimeoutId)
      scrollCheckTimeoutId = null
    }
    doImmediateScroll()
    return
  }

  const now = Date.now()
  const timeSinceLastScroll = now - lastScrollAttemptTime

  if (timeSinceLastScroll > 16)
    doImmediateScroll()

  if (scrollCheckTimeoutId !== null)
    clearTimeout(scrollCheckTimeoutId)

  scrollCheckTimeoutId = window.setTimeout(() => {
    doImmediateScroll()
    scrollCheckTimeoutId = null
  }, 10)
}

function forceScrollWithFrames(frameCount = 2) {
  if (!autoScrollEnabled.value)
    return

  let remaining = Math.max(0, frameCount)
  const step = () => {
    performAutoScrollIfNeeded(true)
    if (remaining <= 0)
      return
    remaining -= 1
    requestAnimationFrame(step)
  }
  step()
}

function executeScroll() {
  if (!messagesContainer.value)
    return

  try {
    isProgrammaticScroll.value = true
    const targetScroll = messagesContainer.value.scrollHeight
    messagesContainer.value.scrollTo({ top: targetScroll, behavior: 'auto' })

    // Wait for scroll to settle, then update lastScrollTop
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (messagesContainer.value) {
          lastScrollTop.value = messagesContainer.value.scrollTop
          lastKnownScrollHeight = messagesContainer.value.scrollHeight
        }
        isProgrammaticScroll.value = false
      })
    })
  }
  catch {
    isProgrammaticScroll.value = false
  }
}

// Setup ResizeObserver to detect content height changes
function setupContentResizeObserver() {
  if (!messagesContainer.value)
    return

  // Disconnect existing observer if any
  if (contentResizeObserver) {
    contentResizeObserver.disconnect()
    contentResizeObserver = null
  }

  // Track the last known scroll height to detect when content grows
  let lastContentHeight = messagesContainer.value.scrollHeight

  contentResizeObserver = new ResizeObserver(() => {
    if (!messagesContainer.value)
      return

    const currentHeight = messagesContainer.value.scrollHeight
    // Only react to height increases (new content rendered)
    if (currentHeight > lastContentHeight)
      forceScrollWithFrames(3)
    lastContentHeight = currentHeight
  })

  // Observe the entire messages container for size changes
  contentResizeObserver.observe(messagesContainer.value)
}

// Setup MutationObserver to detect DOM changes (table content loading, etc.)
function setupContentMutationObserver() {
  if (!messagesContainer.value)
    return

  // Disconnect existing observer if any
  if (contentMutationObserver) {
    contentMutationObserver.disconnect()
    contentMutationObserver = null
  }

  contentMutationObserver = new MutationObserver((mutations) => {
    // Check if any mutation affected the content
    let shouldCheck = false
    for (const mutation of mutations) {
      // Check for childList changes (nodes added/removed)
      if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
        shouldCheck = true
        break
      }
      // Check for attribute changes that might affect layout (class, style)
      if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
        shouldCheck = true
        break
      }
    }

    if (shouldCheck) {
      // Use nextTick to ensure Vue has finished updating
      queueMicrotask(() => {
        forceScrollWithFrames(3)
      })
    }
  })

  // Observe the messages container and its entire subtree
  contentMutationObserver.observe(messagesContainer.value, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
}

function teardownContentResizeObserver() {
  if (contentResizeObserver) {
    contentResizeObserver.disconnect()
    contentResizeObserver = null
  }
}

function teardownContentMutationObserver() {
  if (contentMutationObserver) {
    contentMutationObserver.disconnect()
    contentMutationObserver = null
  }
  if (scrollCheckTimeoutId !== null) {
    clearTimeout(scrollCheckTimeoutId)
    scrollCheckTimeoutId = null
  }
}

// Handle scroll event to manage auto-scroll behavior
function handleContainerScroll() {
  if (!messagesContainer.value)
    return

  // Ignore scroll events initiated by our programmatic scrollTo calls
  if (isProgrammaticScroll.value)
    return

  const currentScrollTop = messagesContainer.value.scrollTop
  const currentScrollHeight = messagesContainer.value.scrollHeight

  // If scrollTop hasn't changed but we're being called, it might be due to content height changes.
  // In this case, check if we're still at bottom and don't treat it as user scroll.
  if (currentScrollTop === lastScrollTop.value) {
    // Content height changed but scroll position stayed the same
    // Don't update user scroll direction or disable auto-scroll
    // Just check if we're still at bottom
    if (isAtBottom(messagesContainer.value)) {
      autoScrollEnabled.value = true
    }
    lastKnownScrollHeight = currentScrollHeight
    return
  }

  // Check if scrollTop decreased due to content height shrinking (not user scroll)
  // This happens when loading placeholders are replaced with smaller actual content
  if (currentScrollTop < lastScrollTop.value && currentScrollHeight < lastKnownScrollHeight) {
    // Content shrank, causing scrollTop to decrease passively
    // Check if we're still at or near bottom - if so, don't disable auto-scroll
    if (isAtBottom(messagesContainer.value, 50)) {
      lastScrollTop.value = currentScrollTop
      lastKnownScrollHeight = currentScrollHeight
      return
    }
  }

  // Update timestamp and determine direction
  lastUserScrollTime.value = Date.now()
  if (currentScrollTop < lastScrollTop.value) {
    // User scrolled up
    lastUserScrollDirection.value = 'up'
    autoScrollEnabled.value = false
  }
  else if (currentScrollTop > lastScrollTop.value) {
    // User scrolled down
    lastUserScrollDirection.value = 'down'
    // If near bottom, re-enable auto-scroll
    if (isAtBottom(messagesContainer.value))
      autoScrollEnabled.value = true
  }

  // Update last scroll position for future comparisons
  lastScrollTop.value = currentScrollTop
  lastKnownScrollHeight = currentScrollHeight
}

// Track touch/pointer start positions to detect direction
const touchStartY = ref<number | null>(null)
const pointerStartY = ref<number | null>(null)

// Wheel: only disable auto-scroll when user scrolls up (deltaY < 0).
function handleWheel(e: WheelEvent) {
  try {
    if (!messagesContainer.value)
      return

    // Treat wheel as a user-driven scroll; record time and direction
    lastUserScrollTime.value = Date.now()
    if (e.deltaY < 0) {
      // Scrolling up
      lastUserScrollDirection.value = 'up'
      autoScrollEnabled.value = false
    }
    else if (e.deltaY > 0) {
      // Scrolling down
      lastUserScrollDirection.value = 'down'
      if (isAtBottom(messagesContainer.value))
        autoScrollEnabled.value = true
    }
  }
  catch {
    // ignore
  }
}

// Touch handlers: detect move direction between touchstart and touchmove
function handleTouchStart(e: TouchEvent) {
  if (e.touches && e.touches.length > 0) {
    touchStartY.value = e.touches[0].clientY
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!messagesContainer.value || touchStartY.value == null || !e.touches || e.touches.length === 0)
    return

  const currentY = e.touches[0].clientY
  const delta = currentY - touchStartY.value
  // Positive delta means finger moved down -> content scrolls up (towards top) -> user viewing earlier content
  lastUserScrollTime.value = Date.now()
  if (delta > 0) {
    lastUserScrollDirection.value = 'up'
    autoScrollEnabled.value = false
  }
  else if (delta < 0) {
    lastUserScrollDirection.value = 'down'
    if (isAtBottom(messagesContainer.value))
      autoScrollEnabled.value = true
  }
}

// Pointer handlers for scrollbar drag / pointer-based dragging
function handlePointerDown(e: PointerEvent) {
  pointerStartY.value = (e as PointerEvent).clientY
  // Attach move/up listeners to document to track the drag
  const move = (ev: PointerEvent) => {
    if (pointerStartY.value == null)
      return
    const delta = ev.clientY - pointerStartY.value
    lastUserScrollTime.value = Date.now()
    if (delta > 0) {
      lastUserScrollDirection.value = 'up'
      autoScrollEnabled.value = false
    }
    else if (delta < 0) {
      lastUserScrollDirection.value = 'down'
      if (messagesContainer.value && isAtBottom(messagesContainer.value))
        autoScrollEnabled.value = true
    }
  }

  const up = () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    pointerStartY.value = null
  }

  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', up)
}

// Keyboard interactions: only treat upward navigation as disabling; downward navigation may re-enable when near bottom.
function handleKeyDown(e: KeyboardEvent) {
  const upKeys = ['PageUp', 'ArrowUp', 'Home']
  const downKeys = ['PageDown', 'ArrowDown', 'End', 'Space']
  if (upKeys.includes(e.key)) {
    autoScrollEnabled.value = false
  }
  else if (downKeys.includes(e.key)) {
    if (messagesContainer.value && isAtBottom(messagesContainer.value))
      autoScrollEnabled.value = true
  }
}

onMounted(() => {
  // Initialize lastScrollTop and attach extra listeners
  if (messagesContainer.value) {
    lastScrollTop.value = messagesContainer.value.scrollTop
    lastKnownScrollHeight = messagesContainer.value.scrollHeight
    messagesContainer.value.addEventListener('wheel', handleWheel, { passive: true })
    messagesContainer.value.addEventListener('touchstart', handleTouchStart, { passive: true })
    messagesContainer.value.addEventListener('touchmove', handleTouchMove, { passive: true })
    messagesContainer.value.addEventListener('pointerdown', handlePointerDown)
    // keydown could be on document
    document.addEventListener('keydown', handleKeyDown)
    // Setup IntersectionObserver sentinel after mount
    setupBottomObserver()
    // Setup ResizeObserver to detect content height changes
    setupContentResizeObserver()
    // Setup MutationObserver to detect DOM changes (table loading -> content)
    setupContentMutationObserver()
  }
})

onUnmounted(() => {
  if (messagesContainer.value) {
    messagesContainer.value.removeEventListener('wheel', handleWheel)
    messagesContainer.value.removeEventListener('touchstart', handleTouchStart)
    messagesContainer.value.removeEventListener('touchmove', handleTouchMove)
    messagesContainer.value.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('keydown', handleKeyDown)
    teardownBottomObserver()
    teardownContentResizeObserver()
    teardownContentMutationObserver()
  }
  // cleanup any playground scoped custom components
  try {
    removeCustomComponents('playground-demo')
  }
  catch {
    // ignore
  }
})

watch(content, () => {
  if (!autoScrollEnabled.value)
    return

  forceScrollWithFrames(4)
}, { flush: 'post' })
</script>

<template>
  <div class="flex items-center justify-center p-4 app-container h-full bg-gray-50 dark:bg-gray-900">
    <!-- 设置按钮和面板 -->
    <div class="fixed top-4 right-4 z-10">
      <!-- 设置按钮 -->
      <button
        class="
          settings-toggle w-10 h-10 rounded-full
          bg-white/95 dark:bg-gray-800/95
          backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          shadow-lg dark:shadow-gray-900/20
          transition-all duration-200 flex items-center justify-center
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        "
        :class="{ 'ring-2 ring-blue-500/50': showSettings }"
        @click="showSettings = !showSettings"
      >
        <Icon
          icon="carbon:settings"
          class="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200"
          :class="{ 'rotate-90': showSettings }"
        />
      </button>

      <!-- 设置面板 -->
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 scale-95 translate-y-2"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-2"
      >
        <div
          v-if="showSettings"
          class="
            absolute top-12 right-0 mt-2
            bg-white/95 dark:bg-gray-800/95
            backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50
            rounded-xl shadow-xl dark:shadow-gray-900/30
            p-4 space-y-4 min-w-[220px]
            origin-top-right
          "
          @click.stop
        >
          <!-- 主题选择器 -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Code Theme
            </label>
            <div class="relative">
              <select
                v-model="selectedTheme"
                class="
                  w-full appearance-none px-3 py-2 pr-8
                  bg-gray-50 dark:bg-gray-700/50
                  border border-gray-200 dark:border-gray-600
                  rounded-lg text-sm font-medium
                  text-gray-900 dark:text-gray-100
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
                  transition-all duration-200 cursor-pointer
                "
                aria-label="Code block theme"
                @click.stop
                @change.stop
              >
                <option v-for="t in themes" :key="t" :value="t">
                  {{ formatThemeName(t) }}
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Icon
                  icon="carbon:chevron-down"
                  class="w-4 h-4 text-gray-400 dark:text-gray-500"
                />
              </div>
            </div>
          </div>

          <!-- 流式速度控制 -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Stream Delay
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="streamDelay"
                type="range"
                min="4"
                max="200"
                step="4"
                class="flex-1 cursor-pointer"
              >
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                {{ streamDelay }}ms
              </span>
            </div>
          </div>

          <!-- 流式字符数量控制 -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Chunk Size
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="streamChunkSize"
                type="range"
                min="1"
                max="16"
                step="1"
                class="flex-1 cursor-pointer"
              >
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                {{ normalizedChunkSize }}
              </span>
            </div>
          </div>

          <!-- 分割线 -->
          <div class="border-t border-gray-200 dark:border-gray-700" />

          <!-- 主题切换 -->
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Dark Mode
            </label>
            <button
              class="
                relative w-12 h-6 rounded-full
                focus:outline-none focus:ring-2 focus:ring-blue-500/50
                hover:shadow-lg active:scale-95
                transition-all duration-200 ease-out
              "
              :style="{
                backgroundColor: isDark ? '#3b82f6' : '#e5e7eb',
                transition: 'background-color 0.35s ease-out, box-shadow 0.2s ease, transform 0.1s ease',
              }"
              @click.stop="toggleTheme()"
            >
              <!-- 滑动圆点 -->
              <div
                class="
                  absolute top-0.5 w-5 h-5 bg-white rounded-full
                  flex items-center justify-center
                  shadow-md hover:shadow-lg
                "
                :style="{
                  left: isDark ? '26px' : '2px',
                  transform: `scale(${isDark ? 1.02 : 1})`,
                  transition: 'left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s ease-out, box-shadow 0.2s ease',
                }"
              >
                <!-- 图标根据状态显示 -->
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  leave-active-class="transition-all duration-200 ease-in"
                  enter-from-class="opacity-0 scale-0 rotate-90"
                  enter-to-class="opacity-100 scale-100 rotate-0"
                  leave-from-class="opacity-100 scale-100 rotate-0"
                  leave-to-class="opacity-0 scale-0 rotate-90"
                  mode="out-in"
                >
                  <Icon
                    v-if="isDark"
                    key="moon"
                    icon="carbon:moon"
                    class="w-3 h-3 text-blue-600 drop-shadow-sm"
                  />
                  <Icon
                    v-else
                    key="sun"
                    icon="carbon:sun"
                    class="w-3 h-3 text-yellow-500 drop-shadow-sm"
                  />
                </Transition>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Chatbot-style container -->
    <div class="chatbot-container max-w-5xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl dark:shadow-gray-900/50 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="chatbot-header px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Icon icon="carbon:chat" class="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                vue-renderer-markdown
              </h1>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Streaming markdown demo
              </p>
            </div>
          </div>

          <div class="flex">
            <!-- GitHub Star Button -->
            <a
              href="https://github.com/Simon-He95/vue-markdown-render"
              target="_blank"
              rel="noopener noreferrer"
              class="
              github-star-btn flex items-center gap-2 px-3 py-1.5
              bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600
              text-white text-sm font-medium rounded-lg
              transition-all duration-200
              shadow-md hover:shadow-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
            "
            >
              <Icon icon="carbon:star" class="w-4 h-4" />
              <span>Star</span>
            </a>

            <!-- Test Page Button -->
            <button
              class="ml-2 test-page-btn flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              title="Go to Test page"
              @click="goToTest"
            >
              <Icon icon="carbon:rocket" class="w-4 h-4" />
              <span>Test</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Messages area with scroll -->
      <main ref="messagesContainer" class="chatbot-messages flex-1 overflow-y-auto mr-[1px] mb-4" @scroll="handleContainerScroll">
        <MarkdownRender
          :content="content"
          :code-block-dark-theme="selectedTheme || undefined"
          :code-block-light-theme="selectedTheme || undefined"
          :themes="themes"
          :is-dark="isDark"
          :parse-options="parseOptions"
          custom-id="playground-demo"
          class="p-6"
        />
        <!-- Sentinel observed by IntersectionObserver to detect reaching bottom reliably on mobile -->
        <div ref="bottomSentinel" aria-hidden="true" class="w-full h-1 pointer-events-none" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  transition: background-color 0.3s ease;
  overflow: hidden;
}

.chatbot-container {
  transition: all 0.3s ease;
  overscroll-behavior: contain;
  height: calc(var(--app-viewport-vh, 1vh) * 100 - 2rem);
  max-height: calc(var(--app-viewport-vh, 1vh) * 100 - 2rem);
}

.github-star-btn:active {
  transform: scale(0.95);
}

.chatbot-messages {
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

.chatbot-messages::-webkit-scrollbar {
  width: 8px;
}

.chatbot-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chatbot-messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.dark .chatbot-messages::-webkit-scrollbar-thumb {
  background: #475569;
}

.chatbot-messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark .chatbot-messages::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.settings-toggle {
  backdrop-filter: blur(8px);
}

.settings-toggle:active {
  transform: scale(0.95);
}

/* 主题选择器自定义样式 */
.theme-selector select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.theme-selector select option {
  padding: 8px 12px;
  background-color: white;
  color: #374151;
}

.dark .theme-selector select option {
  background-color: #1f2937;
  color: #f3f4f6;
}

/* 设置面板动画 */
.settings-panel {
  transform-origin: top right;
}

/* 代码块加载时的流光闪烁效果 */
:deep(.code-block-container.is-rendering) {
  position: relative;
  animation: renderingGlow 2s ease-in-out infinite;
}

@keyframes renderingGlow {
  0% {
    box-shadow:
      0 0 10px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.2);
  }
  25% {
    box-shadow:
      0 0 15px rgba(139, 92, 246, 0.5),
      0 0 30px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow:
      0 0 20px rgba(236, 72, 153, 0.5),
      0 0 40px rgba(236, 72, 153, 0.3);
  }
  75% {
    box-shadow:
      0 0 15px rgba(16, 185, 129, 0.5),
      0 0 30px rgba(16, 185, 129, 0.3);
  }
  100% {
    box-shadow:
      0 0 10px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.2);
  }
}

/* Mermaid 块加载时的流光闪烁效果 */
:deep(.is-rendering) {
  position: relative;
  animation: renderingGlow 2s ease-in-out infinite;
}
</style>
