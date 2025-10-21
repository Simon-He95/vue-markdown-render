<script setup lang="ts">
import type { Highlighter } from 'shiki'
import { computed, nextTick, ref, watch } from 'vue'
import { useSafeI18n } from '../../composables/useSafeI18n'
import { hideTooltip, showTooltipForAnchor } from '../../composables/useSingletonTooltip'
import { getLanguageIcon, languageMap } from '../../utils'
import MermaidBlockNode from '../MermaidBlockNode'
import { registerHighlight } from './highlight'
import { useIncrementalHighlight } from './incrementalHighlight'

const props = withDefaults(
  defineProps<{
    node: {
      type: 'code_block'
      language: string
      code: string
      raw: string
      diff?: boolean
      originalCode?: string
      updatedCode?: string
    }
    loading?: boolean
    darkTheme?: string
    lightTheme?: string
    isDark?: boolean
    isShowPreview?: boolean
    enableFontSizeControl?: boolean
    /** Minimum width for the code block container (px or CSS unit string) */
    minWidth?: string | number
    /** Maximum width for the code block container (px or CSS unit string) */
    maxWidth?: string | number
    themes?: string[]
    /** Header visibility and controls */
    showHeader?: boolean
    showCopyButton?: boolean
    showExpandButton?: boolean
    showPreviewButton?: boolean
    showFontSizeButtons?: boolean
  }>(),
  {
    isShowPreview: true,
    darkTheme: undefined,
    lightTheme: undefined,
    loading: true,
    enableFontSizeControl: true,
    minWidth: undefined,
    maxWidth: undefined,
    // Header configuration: allow consumers to toggle built-in buttons and header visibility
    showHeader: true,
    showCopyButton: true,
    showExpandButton: true,
    showPreviewButton: true,
    showFontSizeButtons: true,
  },
)

const emits = defineEmits(['previewCode', 'copy'])
const { t } = useSafeI18n()

const codeLanguage = ref<string>(props.node.language || '')
const copyText = ref(false)
const isExpanded = ref(false)
const isCollapsed = ref(false)
const codeBlockContent = ref<HTMLElement | null>(null)

// Auto-scroll state management
const autoScrollEnabled = ref(true) // Start with auto-scroll enabled
const lastScrollTop = ref(0) // Track last scroll position to detect scroll direction

// Font size control
const codeFontMin = 10
const codeFontMax = 36
const codeFontStep = 1
const defaultCodeFontSize = ref<number>(14)
const codeFontSize = ref<number>(defaultCodeFontSize.value)

const fontBaselineReady = computed(() => {
  const a = defaultCodeFontSize.value
  const b = codeFontSize.value
  return typeof a === 'number' && Number.isFinite(a) && a > 0 && typeof b === 'number' && Number.isFinite(b) && b > 0
})

// 计算用于显示的语言名称
const displayLanguage = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return languageMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1)
})

const isMermaid = computed(
  () => codeLanguage.value.trim().toLowerCase() === 'mermaid',
)

// Computed property for language icon
const languageIcon = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return getLanguageIcon(lang.split(':')[0])
})

// Check if the language is previewable (HTML or SVG)
const isPreviewable = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return props.isShowPreview && (lang === 'html' || lang === 'svg')
})

// Compute inline style for container to respect optional min/max width
const containerStyle = computed(() => {
  const s: Record<string, string> = {}
  const fmt = (v: string | number | undefined) => {
    if (v == null)
      return undefined
    return typeof v === 'number' ? `${v}px` : String(v)
  }
  const min = fmt(props.minWidth)
  const max = fmt(props.maxWidth)
  if (min)
    s.minWidth = min
  if (max)
    s.maxWidth = max
  return s
})

// Computed style for code block content with font size
const contentStyle = computed(() => {
  return {
    fontSize: `${codeFontSize.value}px`,
  }
})

const highlighter = ref<Highlighter | null>(null)
const highlightedCode = ref<string>('')
const { highlightIncrementally } = useIncrementalHighlight()

if (typeof window !== 'undefined') {
  watch(() => props.themes, async (newThemes) => {
    // Ensure singleton highlighter exists and optionally loads requested themes
    highlighter.value = await registerHighlight({
      themes: newThemes as any,
    })
    if (!props.loading && highlighter.value) {
      const theme = props.themes && props.themes.length > 0 ? (props.isDark ? props.themes[0] : props.themes[1] || props.themes[0]) : (props.isDark ? props.darkTheme || 'vitesse-dark' : props.lightTheme || 'vitesse-light')
      const lang = props.node.language.split(':')[0] // 支持 language:variant 形式

      // Use incremental highlighting
      const result = await highlightIncrementally(highlighter.value, props.node.code, lang, theme)
      highlightedCode.value = result.html
    }
  }, { immediate: true })
}

watch(() => [props.node.code, props.node.language], async ([code, lang]) => {
  if (lang !== codeLanguage.value)
    codeLanguage.value = lang
  if (!highlighter.value)
    return
  if (!code)
    return
  const theme = props.themes && props.themes.length > 0 ? (props.isDark ? props.themes[0] : props.themes[1] || props.themes[0]) : (props.isDark ? props.darkTheme || 'vitesse-dark' : props.lightTheme || 'vitesse-light')
  lang = lang.split(':')[0] // 支持 language:variant 形式

  // Use incremental highlighting
  const result = await highlightIncrementally(highlighter.value, code, lang, theme)
  highlightedCode.value = result.html
})

// Watch for theme changes (dark/light mode)
watch(() => props.isDark, async () => {
  if (!highlighter.value || !props.node.code)
    return
  const theme = props.themes && props.themes.length > 0 ? (props.isDark ? props.themes[0] : props.themes[1] || props.themes[0]) : (props.isDark ? props.darkTheme || 'vitesse-dark' : props.lightTheme || 'vitesse-light')
  const lang = props.node.language.split(':')[0]

  // Use incremental highlighting (will do full re-render due to theme change)
  const result = await highlightIncrementally(highlighter.value, props.node.code, lang, theme)
  highlightedCode.value = result.html
})

// Auto-scroll to bottom when content changes (if not expanded and auto-scroll is enabled)
watch(() => props.node.code, async () => {
  if (isExpanded.value || !autoScrollEnabled.value)
    return

  await nextTick()
  const content = codeBlockContent.value
  if (!content)
    return

  // Check if content has scrollbar (scrollHeight > clientHeight)
  if (content.scrollHeight > content.clientHeight) {
    // Scroll to bottom
    content.scrollTop = content.scrollHeight
  }
})

// Check if user is at the bottom of scroll area
// Increased threshold to 50px to better detect "near bottom" state
function isAtBottom(element: HTMLElement, threshold = 50): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
}

// Handle scroll event to detect user interaction
function handleScroll() {
  const content = codeBlockContent.value
  if (!content || isExpanded.value)
    return

  const currentScrollTop = content.scrollTop

  // Detect scroll direction: if user scrolls up (scrollTop decreased), disable auto-scroll immediately
  if (currentScrollTop < lastScrollTop.value) {
    // User is scrolling up - disable auto-scroll
    autoScrollEnabled.value = false
  }
  else if (isAtBottom(content)) {
    // User is scrolling down and near bottom - re-enable auto-scroll
    autoScrollEnabled.value = true
  }

  // Update last scroll position
  lastScrollTop.value = currentScrollTop
}

// Copy code functionality
async function copy() {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(props.node.code)
    }
    copyText.value = true
    emits('copy', props.node.code)
    setTimeout(() => {
      copyText.value = false
    }, 1000)
  }
  catch (err) {
    console.error('Copy failed:', err)
  }
}

// Tooltip helpers
function shouldSkipEventTarget(el: EventTarget | null) {
  const btn = el as HTMLButtonElement | null
  return !btn || btn.disabled
}

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
function onBtnHover(e: Event, text: string, place: TooltipPlacement = 'top') {
  if (shouldSkipEventTarget(e.currentTarget))
    return
  const ev = e as MouseEvent
  const origin = ev?.clientX != null && ev?.clientY != null ? { x: ev.clientX, y: ev.clientY } : undefined
  showTooltipForAnchor(e.currentTarget as HTMLElement, text, place, false, origin)
}

function onBtnLeave() {
  hideTooltip()
}

function onCopyHover(e: Event) {
  if (shouldSkipEventTarget(e.currentTarget))
    return
  const txt = copyText.value ? (t('common.copied') || 'Copied') : (t('common.copy') || 'Copy')
  const ev = e as MouseEvent
  const origin = ev?.clientX != null && ev?.clientY != null ? { x: ev.clientX, y: ev.clientY } : undefined
  showTooltipForAnchor(e.currentTarget as HTMLElement, txt, 'top', false, origin)
}

// Expand/collapse functionality
function toggleExpand() {
  isExpanded.value = !isExpanded.value
  const content = codeBlockContent.value
  if (!content)
    return

  if (isExpanded.value) {
    content.style.maxHeight = 'none'
    content.style.overflow = 'visible'
  }
  else {
    content.style.maxHeight = '500px'
    content.style.overflow = 'auto'
    // When collapsing, re-enable auto-scroll and scroll to bottom
    autoScrollEnabled.value = true
    nextTick(() => {
      if (content.scrollHeight > content.clientHeight) {
        content.scrollTop = content.scrollHeight
      }
    })
  }
}

// Header collapse/fold functionality
function toggleHeaderCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// Font size controls
function increaseCodeFont() {
  const after = Math.min(codeFontMax, codeFontSize.value + codeFontStep)
  codeFontSize.value = after
}

function decreaseCodeFont() {
  const after = Math.max(codeFontMin, codeFontSize.value - codeFontStep)
  codeFontSize.value = after
}

function resetCodeFont() {
  codeFontSize.value = defaultCodeFontSize.value
}

// Preview functionality
function previewCode() {
  if (!isPreviewable.value)
    return

  const lowerLang = (codeLanguage.value || props.node.language).toLowerCase()
  const artifactType = lowerLang === 'html' ? 'text/html' : 'image/svg+xml'
  const artifactTitle
    = lowerLang === 'html'
      ? 'HTML Preview'
      : 'SVG Preview'

  emits('previewCode', {
    type: artifactType,
    content: props.node.code,
    title: artifactTitle,
  })
}
</script>

<template>
  <MermaidBlockNode v-if="isMermaid" :node="(node as any)" :is-dark="props.isDark" :loading="props.loading" />
  <div
    v-else
    :style="containerStyle"
    class="code-block-container my-4 rounded-lg border border-gray-200 dark:border-gray-700/30 overflow-hidden shadow-sm bg-white dark:bg-gray-900"
  >
    <div
      v-if="props.showHeader"
      class="code-block-header flex justify-between items-center px-4 py-2.5 border-b border-gray-400/5"
      style="color: var(--vscode-editor-foreground);background-color: var(--vscode-editor-background);"
    >
      <!-- left slot / fallback language label -->
      <slot name="header-left">
        <div class="flex items-center space-x-2">
          <span class="icon-slot h-4 w-4 flex-shrink-0" v-html="languageIcon" />
          <span class="text-sm font-medium font-mono">{{ displayLanguage }}</span>
        </div>
      </slot>

      <!-- right slot / fallback action buttons -->
      <slot name="header-right">
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
            :aria-pressed="isCollapsed"
            @click="toggleHeaderCollapse"
            @mouseenter="onBtnHover($event, isCollapsed ? (t('common.expand') || 'Expand') : (t('common.collapse') || 'Collapse'))"
            @focus="onBtnHover($event, isCollapsed ? (t('common.expand') || 'Expand') : (t('common.collapse') || 'Collapse'))"
            @mouseleave="onBtnLeave"
            @blur="onBtnLeave"
          >
            <svg :style="{ rotate: isCollapsed ? '0deg' : '90deg' }" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 18l6-6l-6-6" /></svg>
          </button>
          <template v-if="props.showFontSizeButtons && props.enableFontSizeControl">
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="Number.isFinite(codeFontSize) ? codeFontSize <= codeFontMin : false"
              @click="decreaseCodeFont()"
              @mouseenter="onBtnHover($event, t('common.decrease') || 'Decrease')"
              @focus="onBtnHover($event, t('common.decrease') || 'Decrease')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" /></svg>
            </button>
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="!fontBaselineReady || codeFontSize === defaultCodeFontSize"
              @click="resetCodeFont()"
              @mouseenter="onBtnHover($event, t('common.reset') || 'Reset')"
              @focus="onBtnHover($event, t('common.reset') || 'Reset')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></g></svg>
            </button>
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="Number.isFinite(codeFontSize) ? codeFontSize >= codeFontMax : false"
              @click="increaseCodeFont()"
              @mouseenter="onBtnHover($event, t('common.increase') || 'Increase')"
              @focus="onBtnHover($event, t('common.increase') || 'Increase')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7v14" /></svg>
            </button>
          </template>

          <button
            v-if="props.showCopyButton"
            type="button"
            class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
            :aria-label="copyText ? (t('common.copied') || 'Copied') : (t('common.copy') || 'Copy')"
            @click="copy"
            @mouseenter="onCopyHover($event)"
            @focus="onCopyHover($event)"
            @mouseleave="onBtnLeave"
            @blur="onBtnLeave"
          >
            <svg v-if="!copyText" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></g></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 6L9 17l-5-5" /></svg>
          </button>

          <button
            v-if="props.showExpandButton"
            type="button"
            class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
            :aria-pressed="isExpanded"
            @click="toggleExpand"
            @mouseenter="onBtnHover($event, isExpanded ? (t('common.collapse') || 'Collapse') : (t('common.expand') || 'Expand'))"
            @focus="onBtnHover($event, isExpanded ? (t('common.collapse') || 'Collapse') : (t('common.expand') || 'Expand'))"
            @mouseleave="onBtnLeave"
            @blur="onBtnLeave"
          >
            <svg v-if="isExpanded" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="0.75rem" height="0.75rem" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6v6m0-6l-7 7M3 21l7-7m-1 7H3v-6" /></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="0.75rem" height="0.75rem" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m14 10l7-7m-1 7h-6V4M3 21l7-7m-6 0h6v6" /></svg>
          </button>

          <button
            v-if="isPreviewable && props.showPreviewButton"
            type="button"
            class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
            :aria-label="t('common.preview') || 'Preview'"
            @click="previewCode"
            @mouseenter="onBtnHover($event, t('common.preview') || 'Preview')"
            @focus="onBtnHover($event, t('common.preview') || 'Preview')"
            @mouseleave="onBtnLeave"
            @blur="onBtnLeave"
          >
            <svg data-v-3d59cc65="" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" width="1em" height="1em" viewBox="0 0 24 24" class="w-3 h-3"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></g></svg>
          </button>
        </div>
      </slot>
    </div>
    <div
      v-show="!isCollapsed"
      ref="codeBlockContent"
      class="code-block-content"
      :style="contentStyle"
      @scroll="handleScroll"
      v-html="highlightedCode"
    />
  </div>
</template>

<style scoped>
.code-block-container {
  contain: content;
  /* 新增：显著减少离屏 codeblock 的布局/绘制与样式计算 */
  content-visibility: auto;
  contain-intrinsic-size: 320px 180px;
}

.code-block-content {
  max-height: 500px;
  overflow: auto;
  transition: max-height 0.3s ease;
}

:deep(.code-block-content pre){
  padding: 1rem;
}

.code-action-btn {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.code-action-btn:hover {
  opacity: 1;
}

.code-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
