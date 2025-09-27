<script setup lang="ts">
// Avoid static import of `vue-use-monaco` for types so the runtime bundle
// doesn't get a reference. Define minimal local types we need here.
import type { WatchStopHandle } from 'vue'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useSafeI18n } from '../../composables/useSafeI18n'
// Tooltip is provided as a singleton via composable to avoid many DOM nodes
import { hideTooltip, showTooltipForAnchor } from '../../composables/useSingletonTooltip'
import { getLanguageIcon, languageMap } from '../../utils'
import MermaidBlockNode from '../MermaidBlockNode'
import PreCodeNode from '../PreCodeNode'
import { getIconify, getUseMonaco } from './utils'

interface MonacoOptions {
  fontSize?: number
  MAX_HEIGHT?: number | string
  [k: string]: any
}
type MonacoTheme = any

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
    darkTheme?: MonacoTheme
    lightTheme?: MonacoTheme
    isShowPreview?: boolean
    monacoOptions?: MonacoOptions
    enableFontSizeControl?: boolean
    /** Minimum width for the code block container (px or CSS unit string) */
    minWidth?: string | number
    /** Maximum width for the code block container (px or CSS unit string) */
    maxWidth?: string | number
    themes?: MonacoTheme[]
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
const codeEditor = ref<HTMLElement | null>(null)
const container = ref<HTMLElement | null>(null)
const copyText = ref(false)
// local tooltip logic removed; use shared `showTooltipForAnchor` / `hideTooltip`

const codeLanguage = ref(props.node.language || '')
const isExpanded = ref(false)
const isCollapsed = ref(false)
const editorCreated = ref(false)
let expandRafId: number | null = null
let resizeObserver: ResizeObserver | null = null
const heightBeforeCollapse = ref<number | null>(null)
let resumeGuardFrames = 0

const Icon = getIconify()

// Lazy-load `vue-use-monaco` helpers at runtime so consumers who don't install
// `vue-use-monaco` won't have the editor code bundled. We provide safe no-op
// fallbacks for the minimal API we use.
let createEditor: ((el: HTMLElement, code: string, lang: string) => void) | null = null
let createDiffEditor: ((el: HTMLElement, original: string, modified: string, lang: string) => void) | null = null
let updateCode: (code: string, lang: string) => void = () => {}
let updateDiffCode: (original: string, modified: string, lang: string) => void = () => {}
let getEditor: () => any = () => null
let getEditorView: () => any = () => ({ getModel: () => ({ getLineCount: () => 1 }), getOption: () => 14, updateOptions: () => {} })
let getDiffEditorView: () => any = () => ({ getModel: () => ({ getLineCount: () => 1 }), getOption: () => 14, updateOptions: () => {} })
let cleanupEditor: () => void = () => {}
let detectLanguage: (code: string) => string = () => props.node.language || 'plaintext'
let setTheme: (theme: MonacoTheme) => Promise<void> = async () => {}
const isDiff = computed(() => props.node.diff)
const usePreCodeRender = ref(false)
;(async () => {
  try {
    const mod = await getUseMonaco()
    // `useMonaco` and `detectLanguage` should be available
    const useMonaco = (mod as any).useMonaco
    const det = (mod as any).detectLanguage
    if (typeof det === 'function')
      detectLanguage = det
    if (typeof useMonaco === 'function') {
      const theme = getPreferredColorScheme()
      if (theme && props.themes && Array.isArray(props.themes) && !props.themes.includes(theme)) {
        throw new Error('Preferred theme not in provided themes array')
      }
      const helpers = useMonaco({
        wordWrap: 'on',
        wrappingIndent: 'same',
        themes: props.themes,
        theme,
        ...(props.monacoOptions || {}),
        onThemeChange() {
          syncEditorCssVars()
        },
      })
      createEditor = helpers.createEditor || createEditor
      createDiffEditor = helpers.createDiffEditor || createDiffEditor
      updateCode = helpers.updateCode || updateCode
      updateDiffCode = helpers.updateDiff || updateDiffCode
      getEditor = helpers.getEditor || getEditor
      getEditorView = helpers.getEditorView || getEditorView
      getDiffEditorView = helpers.getDiffEditorView || getDiffEditorView
      cleanupEditor = helpers.cleanupEditor || cleanupEditor
      setTheme = helpers.setTheme || setTheme
      if (!editorCreated.value && codeEditor.value && createEditor) {
        editorCreated.value = true
        isDiff.value
          ? createDiffEditor(codeEditor.value as HTMLElement, props.node.originalCode || '', props.node.updatedCode || '', codeLanguage.value)
          : createEditor(codeEditor.value as HTMLElement, props.node.code, codeLanguage.value)
      }
    }
  }
  catch {
    console.warn('vue-use-monaco not available; code blocks will not be rendered with Monaco editor')
    // 使用 PreCodeNode 渲染
    usePreCodeRender.value = true
  }
})()

const codeFontMin = 10
const codeFontMax = 36
const codeFontStep = 1
const defaultCodeFontSize = Number(props.monacoOptions?.fontSize ?? 14)
const codeFontSize = ref<number>(defaultCodeFontSize)
// Keep computed height tight to content. Extra padding caused visible bottom gap.
const CONTENT_PADDING = 0
// Fine-tuned to avoid bottom gap at default font size
const LINE_EXTRA_PER_LINE = 1.5
const PIXEL_EPSILON = 1

function measureLineHeightFromDom(): number | null {
  try {
    const root = codeEditor.value as HTMLElement | null
    if (!root)
      return null
    const lineEl = root.querySelector('.view-lines .view-line') as HTMLElement | null
    if (lineEl) {
      const h = Math.ceil(lineEl.getBoundingClientRect().height)
      if (h > 0)
        return h
    }
  }
  catch {}
  return null
}

function getLineHeightSafe(editor: any): number {
  try {
    const monacoEditor = getEditor()
    const key = monacoEditor?.EditorOption?.lineHeight
    if (key != null) {
      const v = editor?.getOption?.(key)
      if (typeof v === 'number' && v > 0)
        return v
    }
  }
  catch {}
  const domH = measureLineHeightFromDom()
  if (domH && domH > 0)
    return domH
  const fs = codeFontSize.value || 14
  // Conservative fallback close to Monaco's default ratio
  return Math.max(12, Math.round(fs * 1.35))
}
function increaseCodeFont() {
  codeFontSize.value = Math.min(codeFontMax, codeFontSize.value + codeFontStep)
}
function decreaseCodeFont() {
  codeFontSize.value = Math.max(codeFontMin, codeFontSize.value - codeFontStep)
}
function resetCodeFont() {
  codeFontSize.value = defaultCodeFontSize
}

function computeContentHeight(): number | null {
  // Prefer Monaco's contentHeight when available; fallback to lineCount * lineHeight
  try {
    const ed = isDiff.value ? getDiffEditorView() : getEditorView()
    if (!ed)
      return null
    if (isDiff.value && ed?.getOriginalEditor && ed?.getModifiedEditor) {
      const o = ed.getOriginalEditor?.()
      const m = ed.getModifiedEditor?.()
      const oh = (o?.getContentHeight?.() as number) || 0
      const mh = (m?.getContentHeight?.() as number) || 0
      const h = Math.max(oh, mh)
      if (h > 0)
        return Math.ceil(h + PIXEL_EPSILON)
      // fallback per-editor line count
      const olc = o?.getModel?.()?.getLineCount?.() || 1
      const mlc = m?.getModel?.()?.getLineCount?.() || 1
      const lc = Math.max(olc, mlc)
      const lh = Math.max(getLineHeightSafe(o), getLineHeightSafe(m))
      return Math.ceil(lc * (lh + LINE_EXTRA_PER_LINE) + CONTENT_PADDING + PIXEL_EPSILON)
    }
    else if (ed?.getContentHeight) {
      const h = ed.getContentHeight()
      if (h > 0)
        return Math.ceil(h + PIXEL_EPSILON)
    }
    // generic fallback
    const model = ed?.getModel?.()
    let lineCount = 1
    if (model && typeof model.getLineCount === 'function') {
      lineCount = model.getLineCount()
    }
    const lh = getLineHeightSafe(ed)
    return Math.ceil(lineCount * (lh + LINE_EXTRA_PER_LINE) + CONTENT_PADDING + PIXEL_EPSILON)
  }
  catch {
    return null
  }
}

// Copy computed CSS variables from the editor DOM up to the component root so
// the header (which lives alongside the editor but outside its inner DOM)
// can use variables like --vscode-editor-foreground / --vscode-editor-background.
function syncEditorCssVars() {
  const editorEl = codeEditor.value as HTMLElement | null
  const rootEl = container.value as HTMLElement | null
  if (!editorEl || !rootEl)
    return
    // Monaco usually applies theme variables on an element with class
    // 'monaco-editor' or on the editor root; try to read from either.
  const src = editorEl.querySelector('.monaco-editor') || editorEl
  const styles = window.getComputedStyle(src as Element)
  const fg = styles.getPropertyValue('--vscode-editor-foreground') || ''
  const bg = styles.getPropertyValue('--vscode-editor-background') || ''
  const hoverBg = styles.getPropertyValue('--vscode-editor-hoverHighlightBackground') || ''
  if (fg && bg) {
    rootEl.style.setProperty('--vscode-editor-foreground', fg.trim())
    rootEl.style.setProperty('--vscode-editor-background', bg.trim())
    rootEl.style.setProperty('--vscode-editor-selectionBackground', hoverBg.trim())
    return true
  }
}

let resizeSyncHandler: (() => void) | null = null

function updateExpandedHeight() {
  try {
    const container = codeEditor.value
    if (!container)
      return
    const h = computeContentHeight()
    if (h != null && h > 0) {
      container.style.height = `${Math.ceil(h)}px`
      container.style.maxHeight = 'none'
    }
  }
  catch {}
}

function updateCollapsedHeight() {
  try {
    const container = codeEditor.value
    if (!container)
      return
    const max = getMaxHeightValue()
    if (resumeGuardFrames > 0) {
      resumeGuardFrames--
      if (heightBeforeCollapse.value != null) {
        const h = Math.min(heightBeforeCollapse.value, max)
        container.style.height = `${Math.ceil(h)}px`
        container.style.maxHeight = `${Math.ceil(max)}px`
        container.style.overflow = 'auto'
        return
      }
    }
    const h0 = computeContentHeight()
    // 1) 有实时内容高度 -> 采用并记忆原始内容高度（未裁剪前），用于下一次恢复
    if (h0 != null && h0 > 0) {
      const h = Math.min(h0, max)
      container.style.height = `${Math.ceil(h)}px`
      container.style.maxHeight = `${Math.ceil(max)}px`
      container.style.overflow = 'auto'
      return
    }

    // 2) 使用折叠前的内容高度（不更新记忆值）
    if (heightBeforeCollapse.value != null) {
      const h = Math.min(heightBeforeCollapse.value, max)
      container.style.height = `${Math.ceil(h)}px`
      container.style.maxHeight = `${Math.ceil(max)}px`
      container.style.overflow = 'auto'
      return
    }

    // 3) 使用当前 DOM 高度（不更新记忆值）
    const rectH = Math.ceil((container.getBoundingClientRect?.().height) || 0)
    if (rectH > 0) {
      const h = Math.min(rectH, max)
      container.style.height = `${Math.ceil(h)}px`
      container.style.maxHeight = `${Math.ceil(max)}px`
      container.style.overflow = 'auto'
      return
    }

    // 4) 兜底：若有先前行高/字体，可估一个最小高度；否则保持现状，避免强制跳到 MAX
    const prev = Number.parseFloat(container.style.height)
    if (!Number.isNaN(prev) && prev > 0) {
      container.style.height = `${Math.ceil(Math.min(prev, max))}px`
    }
    else {
      // 实在没有历史高度，才退到 max（极少数首次场景）
      container.style.height = `${Math.ceil(max)}px`
    }
    container.style.maxHeight = `${Math.ceil(max)}px`
    container.style.overflow = 'auto'
  }
  catch {}
}

function getMaxHeightValue(): number {
  const maxH = props.monacoOptions?.MAX_HEIGHT ?? 500
  if (typeof maxH === 'number')
    return maxH
  const m = String(maxH).match(/^(\d+(?:\.\d+)?)/)
  return m ? Number.parseFloat(m[1]) : 500
}

// removed legacy canExpand logic; height is derived directly from content

// 初始化语言检测：若未指定语言则立即检测一次，避免不必要的编辑器创建
if (!props.node.language) {
  codeLanguage.value = detectLanguage(props.node.code)
}

// Check if the language is previewable (HTML or SVG)
const isPreviewable = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return props.isShowPreview && (lang === 'html' || lang === 'svg')
})

// Check if the code block is a Mermaid diagram
const isMermaid = computed(
  () => codeLanguage.value.trim().toLowerCase() === 'mermaid',
)

watch(
  () => props.node.language,
  (newLanguage) => {
    if (!newLanguage)
      codeLanguage.value = detectLanguage(props.node.code)
    else
      codeLanguage.value = newLanguage
  },
)

// 如果外部仅提供代码但语言为空，代码变化时也重新检测一次语言
watch(
  () => props.node.code,
  (newCode, oldCode) => {
    if (newCode !== oldCode && !props.node.language)
      codeLanguage.value = detectLanguage(newCode)
  },
)

// 计算用于显示的语言名称
const displayLanguage = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return languageMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1)
})

// Computed property for language icon
const languageIcon = computed(() => {
  const lang = codeLanguage.value.trim().toLowerCase()
  return getLanguageIcon(lang.split(':')[0])
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

// 复制代码
async function copy() {
  try {
    await navigator.clipboard.writeText(props.node.code)
    copyText.value = true
    emits('copy', props.node.code)
    setTimeout(() => {
      copyText.value = false
    }, 1000)
  }
  catch (err) {
    console.error('复制失败:', err)
  }
}

// Tooltip helpers: use the global singleton tooltip so there's only one DOM node
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

function toggleExpand() {
  isExpanded.value = !isExpanded.value
  const editor = isDiff.value ? getDiffEditorView() : getEditorView()
  const container = codeEditor.value
  if (!editor || !container)
    return

  if (isExpanded.value) {
    // Expanded: enable automaticLayout and explicitly size container by lines
    setAutomaticLayout(true)
    container.style.maxHeight = 'none'
    container.style.overflow = 'visible'
    updateExpandedHeight()
    applyEditorScrollbarOptions(true)
  }
  else {
    stopExpandAutoResize()
    // Collapsed: cap height via maxHeight and let internal scroll
    setAutomaticLayout(false)
    container.style.overflow = 'auto'
    updateCollapsedHeight()
    applyEditorScrollbarOptions(false)
  }
}

function toggleHeaderCollapse() {
  isCollapsed.value = !isCollapsed.value
  if (isCollapsed.value) {
    if (codeEditor.value) {
      const rectH = Math.ceil((codeEditor.value.getBoundingClientRect?.().height) || 0)
      if (rectH > 0)
        heightBeforeCollapse.value = rectH
    }
    stopExpandAutoResize()
    setAutomaticLayout(false)
  }
  else {
    if (isExpanded.value)
      setAutomaticLayout(true)
    if (codeEditor.value && heightBeforeCollapse.value != null) {
      codeEditor.value.style.height = `${heightBeforeCollapse.value}px`
    }
    const ed = isDiff.value ? getDiffEditorView() : getEditorView()
    try { ed?.layout?.() } catch {}
    resumeGuardFrames = 2
    requestAnimationFrame(() => {
      if (isExpanded.value)
        updateExpandedHeight()
      else
        updateCollapsedHeight()
    })
  }
}

watch(
  () => codeFontSize.value,
  (size) => {
    const editor = isDiff.value ? getDiffEditorView() : getEditorView()
    if (!editor)
      return
    editor.updateOptions({ fontSize: size })
    // In automaticLayout mode, no manual height updates are needed
    if (isExpanded.value && !isCollapsed.value)
      updateExpandedHeight()
  },
  { flush: 'post', immediate: false },
)

// 预览HTML/SVG代码
function previewCode() {
  if (!isPreviewable.value)
    return

  const lowerLang = (codeLanguage.value || props.node.language).toLowerCase()
  const artifactType = lowerLang === 'html' ? 'text/html' : 'image/svg+xml'
  const artifactTitle
    = lowerLang === 'html'
      ? t('artifacts.htmlPreviewTitle') || 'HTML Preview'
      : t('artifacts.svgPreviewTitle') || 'SVG Preview'
  emits('previewCode', {
    node: props.node,
    artifactType,
    artifactTitle,
    id: `temp-${lowerLang}-${Date.now()}`,
  })
}

function applyEditorScrollbarOptions(expanded: boolean) {
  try {
    if (isDiff.value) {
      const diff = getDiffEditorView()
      diff?.updateOptions?.({ automaticLayout: expanded, scrollbar: { vertical: expanded ? 'hidden' : 'auto', horizontal: 'auto' } })
    }
    else {
      const ed = getEditorView()
      ed?.updateOptions?.({ automaticLayout: expanded, scrollbar: { vertical: expanded ? 'hidden' : 'auto', horizontal: 'auto' } })
    }
  }
  catch {}
}

function setAutomaticLayout(expanded: boolean) {
  try {
    if (isDiff.value) {
      const diff = getDiffEditorView()
      diff?.updateOptions?.({ automaticLayout: expanded })
    }
    else {
      const ed = getEditorView()
      ed?.updateOptions?.({ automaticLayout: expanded })
    }
  }
  catch {}
}

// 监听代码/语言变化：仅在非 Mermaid 且编辑器已创建时更新，避免重复无效更新
watch(
  () => [props.node.code, codeLanguage.value, isMermaid.value, isDiff.value, isCollapsed.value] as const,
  () => {
    if (!editorCreated.value || isMermaid.value || isCollapsed.value) {
      return
    }

    isDiff.value
      ? updateDiffCode(props.node.originalCode || '', props.node.updatedCode || '', codeLanguage.value)
      : updateCode(props.node.code, codeLanguage.value)
    if (isExpanded.value) {
      requestAnimationFrame(() => updateExpandedHeight())
    }
  },
  { flush: 'post', immediate: false },
)

// 延迟创建编辑器：仅当不是 Mermaid 时才创建，避免无意义的初始化
const stopCreateEditorWatch = watch(
  () => [codeEditor.value, isMermaid.value, isDiff.value] as const,
  async ([el, mermaid]) => {
    if (!el || mermaid || !createEditor)
      return
    editorCreated.value = true

    isDiff.value
      ? createDiffEditor(el as HTMLElement, props.node.originalCode || '', props.node.updatedCode || '', codeLanguage.value)
      : createEditor(el as HTMLElement, props.node.code, codeLanguage.value)
    const editor = isDiff.value ? getDiffEditorView() : getEditorView()
    editor?.updateOptions({ fontSize: codeFontSize.value, automaticLayout: false })
    // Ensure a visible baseline height while collapsed
    if (!isExpanded.value && !isCollapsed.value) {
      updateCollapsedHeight()
    }
    // Observe container width to toggle Diff side-by-side for better UX
    if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        // Toggle side-by-side for narrow containers
        if (isDiff.value) {
          const width = (codeEditor.value?.clientWidth) || 0
          const sideBySide = width >= 700
          const diffView = getDiffEditorView()
          try {
            diffView?.updateOptions?.({ renderSideBySide: sideBySide })
          }
          catch {}
        }
        // Recompute height when layout mode changes or width changes
        if (!isCollapsed.value) {
          if (isExpanded.value)
            updateExpandedHeight()
          else
            updateCollapsedHeight()
        }
      })
      resizeObserver.observe(codeEditor.value as Element)
    }
    // 若初始化时 loading 已为 false，等待一帧后再计算展开高度
    if (props.loading === false) {
      await nextTick()
      requestAnimationFrame(() => {
        if (isExpanded.value && !isCollapsed.value)
          updateExpandedHeight()
        else if (!isCollapsed.value)
          updateCollapsedHeight()
      })
    }
    // automaticLayout handles layout in expanded mode; no manual RAF needed
    stopCreateEditorWatch()
  },
  { immediate: true },
)

// Watch for theme changes and try to apply them at runtime. If the helper
// exposes an API to update themes/options, use it. Otherwise, recreate the
// editor to ensure the new themes/options take effect.
watch(
  () => [props.darkTheme, props.lightTheme, editorCreated.value],
  () => {
    if (!editorCreated.value)
      return

    themeUpdate()
  },
  { immediate: false },
)

function isDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}
function getPreferredColorScheme() {
  return isDark() ? props.darkTheme : props.lightTheme
}

function themeUpdate() {
  const themeToSet: any = getPreferredColorScheme()
  if (themeToSet)
    setTheme(themeToSet)
}

// Watch for monacoOptions changes (deep) and try to update editor options or
// recreate the editor when necessary.
watch(
  () => props.monacoOptions,
  async () => {
    if (!createEditor)
      return

    const ed = isDiff.value ? getDiffEditorView() : getEditorView()
    ed?.updateOptions?.({ fontSize: props.monacoOptions?.fontSize ?? codeFontSize.value })
    if (isExpanded.value && !isCollapsed.value)
      updateExpandedHeight()
    else if (!isCollapsed.value)
      updateCollapsedHeight()
  },
  { deep: true, immediate: false },
)

// 当 loading 变为 false 时：计算并缓存一次展开高度，随后停止观察
let stopLoadingWatch: WatchStopHandle | undefined
stopLoadingWatch = watch(
  () => props.loading,
  async (loaded) => {
    if (isMermaid.value) {
      cleanupEditor()
      return
    }
    if (loaded === false) {
      await nextTick()
      requestAnimationFrame(() => {
        if (!isCollapsed.value) {
          if (isExpanded.value)
            updateExpandedHeight()
          else
            updateCollapsedHeight()
        }
        stopLoadingWatch?.()
        stopLoadingWatch = undefined
      })
      stopExpandAutoResize()
    }
    else if (loaded === true) {
      // no-op
    }
  },
  { immediate: true, flush: 'post' },
)

function stopExpandAutoResize() {
  if (expandRafId != null) {
    cancelAnimationFrame(expandRafId)
    expandRafId = null
  }
}

onUnmounted(() => {
  // Ensure any RAF loops are stopped and editor resources are released
  stopExpandAutoResize()
  cleanupEditor()
  if (resizeObserver) {
    try {
      resizeObserver.disconnect()
    }
    catch {}
    resizeObserver = null
  }
  if (resizeSyncHandler) {
    try {
      window.removeEventListener('resize', resizeSyncHandler)
    }
    catch {}
    resizeSyncHandler = null
  }
})
</script>

<template>
  <MermaidBlockNode v-if="isMermaid" :node="(node as any)" :loading="props.loading" />
  <PreCodeNode v-else-if="usePreCodeRender" :node="(node as any)" :loading="props.loading" />
  <div
    v-else
    ref="container"
    :style="containerStyle"
    class="code-block-container my-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900" :class="[
      { 'is-rendering': props.loading },
    ]"
  >
    <!-- Configurable header area: consumers may override via named slots -->
    <div
      v-if="props.showHeader"
      class="code-block-header flex justify-between items-center px-4 py-2.5 border-b border-gray-400/5"
      style="color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);"
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
            <Icon icon="lucide:chevron-right" class="w-3 h-3" :style="{ rotate: isCollapsed ? '0deg' : '90deg' }" />
          </button>
          <template v-if="props.showFontSizeButtons && props.enableFontSizeControl">
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="codeFontSize <= codeFontMin"
              @click="decreaseCodeFont()"
              @mouseenter="onBtnHover($event, t('common.decrease') || 'Decrease')"
              @focus="onBtnHover($event, t('common.decrease') || 'Decrease')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <Icon icon="lucide:minus" class="w-3 h-3" />
            </button>
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="codeFontSize === defaultCodeFontSize"
              @click="resetCodeFont()"
              @mouseenter="onBtnHover($event, t('common.reset') || 'Reset')"
              @focus="onBtnHover($event, t('common.reset') || 'Reset')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <Icon icon="lucide:rotate-ccw" class="w-3 h-3" />
            </button>
            <button
              type="button"
              class="code-action-btn p-2 text-xs rounded-md transition-colors hover:bg-[var(--vscode-editor-selectionBackground)]"
              :disabled="codeFontSize >= codeFontMax"
              @click="increaseCodeFont()"
              @mouseenter="onBtnHover($event, t('common.increase') || 'Increase')"
              @focus="onBtnHover($event, t('common.increase') || 'Increase')"
              @mouseleave="onBtnLeave"
              @blur="onBtnLeave"
            >
              <Icon icon="lucide:plus" class="w-3 h-3" />
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
            <Icon v-if="!copyText" icon="lucide:copy" class="w-3 h-3" />
            <Icon v-else icon="lucide:check" class="w-3 h-3" />
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
            <Icon :icon="isExpanded ? 'lucide:minimize-2' : 'lucide:maximize-2'" class="w-3 h-3" />
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
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"><!-- Icon from Freehand free icons by Streamline - https://creativecommons.org/licenses/by/4.0/ --><g fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M23.628 7.41c-.12-1.172-.08-3.583-.9-4.233c-1.921-1.51-6.143-1.11-8.815-1.19c-3.481-.15-7.193.14-10.625.24a.34.34 0 0 0 0 .67c3.472-.05 7.074-.29 10.575-.09c2.471.15 6.653-.14 8.254 1.16c.4.33.41 2.732.49 3.582a42 42 0 0 1 .08 9.005a13.8 13.8 0 0 1-.45 3.001c-2.42 1.4-19.69 2.381-20.72.55a21 21 0 0 1-.65-4.632a41.5 41.5 0 0 1 .12-7.964c.08 0 7.334.33 12.586.24c2.331 0 4.682-.13 6.764-.21a.33.33 0 0 0 0-.66c-7.714-.16-12.897-.43-19.31.05c.11-1.38.48-3.922.38-4.002a.3.3 0 0 0-.42 0c-.37.41-.29 1.77-.36 2.251s-.14 1.07-.2 1.6a45 45 0 0 0-.36 8.645a21.8 21.8 0 0 0 .66 5.002c1.46 2.702 17.248 1.461 20.95.43c1.45-.4 1.69-.8 1.871-1.95c.575-3.809.602-7.68.08-11.496" /><path d="M4.528 5.237a.84.84 0 0 0-.21-1c-.77-.41-1.71.39-1 1.1a.83.83 0 0 0 1.21-.1m2.632-.25c.14-.14.19-.84-.2-1c-.77-.41-1.71.39-1 1.09a.82.82 0 0 0 1.2-.09m2.88 0a.83.83 0 0 0-.21-1c-.77-.41-1.71.39-1 1.09a.82.82 0 0 0 1.21-.09m-4.29 8.735c0 .08.23 2.471.31 2.561a.371.371 0 0 0 .63-.14c0-.09 0 0 .15-1.72a10 10 0 0 0-.11-2.232a5.3 5.3 0 0 1-.26-1.37a.3.3 0 0 0-.54-.24a6.8 6.8 0 0 0-.2 2.33c-1.281-.38-1.121.13-1.131-.42a15 15 0 0 0-.19-1.93c-.16-.17-.36-.17-.51.14a20 20 0 0 0-.43 3.471c.04.773.18 1.536.42 2.272c.26.4.7.22.7-.1c0-.09-.16-.09 0-1.862c.06-1.18-.23-.3 1.16-.76m5.033-2.552c.32-.07.41-.28.39-.37c0-.55-3.322-.34-3.462-.24s-.2.18-.18.28s0 .11 0 .16a3.8 3.8 0 0 0 1.591.361v.82a15 15 0 0 0-.13 3.132c0 .2-.09.94.17 1.16a.34.34 0 0 0 .48 0c.125-.35.196-.718.21-1.09a8 8 0 0 0 .14-3.232c0-.13.05-.7-.1-.89a8 8 0 0 0 .89-.09m5.544-.181a.69.69 0 0 0-.89-.44a2.8 2.8 0 0 0-1.252 1.001a2.3 2.3 0 0 0-.41-.83a1 1 0 0 0-1.6.27a7 7 0 0 0-.35 2.07c0 .571 0 2.642.06 2.762c.14 1.09 1 .51.63.13a17.6 17.6 0 0 1 .38-3.962c.32-1.18.32.2.39.51s.11 1.081.73 1.081s.48-.93 1.401-1.78q.075 1.345 0 2.69a15 15 0 0 0 0 1.811a.34.34 0 0 0 .68 0q.112-.861.11-1.73a16.7 16.7 0 0 0 .12-3.582m1.441-.201c-.05.16-.3 3.002-.31 3.202a6.3 6.3 0 0 0 .21 1.741c.33 1 1.21 1.07 2.291.82a3.7 3.7 0 0 0 1.14-.23c.21-.22.10-.59-.41-.64q-.817.096-1.64.07c-.44-.07-.34 0-.67-4.442q.015-.185 0-.37a.316.316 0 0 0-.23-.38a.316.316 0 0 0-.38.23" /></g></svg>
          </button>
        </div>
      </slot>
    </div>
    <div v-show="!isCollapsed" ref="codeEditor" class="code-editor-container" />
    <!-- Teleported tooltip removed: using singleton composable instead -->
    <!-- Copy status for screen readers -->
    <span class="sr-only" aria-live="polite" role="status">{{ copyText ? t('common.copied') || 'Copied' : '' }}</span>
  </div>
</template>

<style scoped>
.code-block-container {
  contain: content;
    /* 新增：显著减少离屏 codeblock 的布局/绘制与样式计算 */
  content-visibility: auto;
  contain-intrinsic-size: 320px 180px;
}

.code-editor-container {
  transition: height 180ms ease, max-height 180ms ease;
}

.code-action-btn {
  font-family: inherit;
}

.code-action-btn:active {
  transform: scale(0.98);
}

.code-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.code-action-btn:disabled:hover {
  background-color: transparent;
}

/* Ensure injected icons align consistently whether img or inline svg */
.icon-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon-slot :deep(svg),
.icon-slot :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
}
:deep(.monaco-diff-editor .diffOverview){
  background-color: var(--vscode-editor-background);
}
</style>
