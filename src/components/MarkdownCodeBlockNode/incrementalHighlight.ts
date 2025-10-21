import type { Highlighter } from 'shiki'
import { nextTick, ref } from 'vue'

/**
 * Utility to manage incremental code highlighting for streaming scenarios.
 * Performs true incremental DOM updates by only highlighting and appending new content.
 */
export function useIncrementalHighlight() {
  const previousCode = ref('')
  const previousLanguage = ref('')
  const previousTheme = ref('')
  const pendingUpdate = ref(false)
  const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Check if the new code is an incremental update (appends to previous code)
   * AND the delta starts with a newline (so it can be safely appended as new lines)
   */
  function isIncrementalUpdate(oldCode: string, newCode: string): boolean {
    // If newCode starts with oldCode, it's potentially an incremental addition
    if (!(newCode.length > oldCode.length && newCode.startsWith(oldCode))) {
      return false
    }

    // Extract the delta
    const delta = newCode.slice(oldCode.length)

    // Only consider it incremental if the delta starts with a newline
    // This ensures we're adding new lines, not modifying the existing line
    return delta.startsWith('\n')
  }

  /**
   * Extract the newly added portion of code
   */
  function getIncrementalDelta(oldCode: string, newCode: string): string {
    return newCode.slice(oldCode.length)
  }

  /**
   * Check if a full re-render is needed (language or theme changed)
   */
  function needsFullRender(
    newLanguage: string,
    newTheme: string,
    oldLanguage: string,
    oldTheme: string,
  ): boolean {
    return newLanguage !== oldLanguage || newTheme !== oldTheme
  }

  /**
   * Extract line elements from Shiki HTML output
   */
  function extractLineElements(html: string): string[] {
    const lines: string[] = []
    const codeMatch = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)
    if (!codeMatch)
      return lines

    const codeContent = codeMatch[1]
    // Match line spans, including empty ones
    const lineRegex = /<span class="line"[^>]*>[\s\S]*?<\/span>/g
    const matches = codeContent.match(lineRegex)

    if (matches) {
      // Filter out empty lines (lines with no content or only whitespace)
      for (const line of matches) {
        const innerContent = line.replace(/<span class="line"[^>]*>|<\/span>/g, '')
        // Only include lines that have actual content
        if (innerContent.trim().length > 0 || innerContent.includes('<span')) {
          lines.push(line)
        }
      }
    }

    return lines
  }

  /**
   * Perform incremental DOM update by appending only new content
   */
  function applyIncrementalUpdate(
    container: HTMLElement,
    deltaHtml: string,
  ): void {
    const codeElement = container.querySelector('code')
    if (!codeElement)
      return

    const newLines = extractLineElements(deltaHtml)
    for (const lineHtml of newLines) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = lineHtml
      const lineElement = tempDiv.firstChild
      if (lineElement) {
        codeElement.appendChild(lineElement)
      }
    }
  }

  /**
   * Highlight code with true incremental DOM updates.
   * For streaming scenarios, only highlights and appends the delta content.
   */
  async function highlightIncrementally(
    highlighter: Highlighter,
    code: string,
    language: string,
    theme: string,
    containerElement: HTMLElement | null,
    options: { debounceMs?: number } = {},
  ): Promise<{ html: string, wasIncremental: boolean, shouldUpdateDOM: boolean }> {
    // Clear any pending debounce timer
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }

    // Detect if this is an incremental update
    const isIncremental
      = !needsFullRender(language, theme, previousLanguage.value, previousTheme.value)
        && isIncrementalUpdate(previousCode.value, code)
        && previousCode.value !== ''

    // For very rapid updates (debouncing enabled), delay the rendering
    if (options.debounceMs && options.debounceMs > 0 && isIncremental) {
      return new Promise((resolve) => {
        debounceTimer.value = setTimeout(async () => {
          const delta = getIncrementalDelta(previousCode.value, code)
          const deltaHtml = await highlighter.codeToHtml(delta, { lang: language, theme })

          if (containerElement) {
            applyIncrementalUpdate(containerElement, deltaHtml)
          }

          previousCode.value = code
          previousLanguage.value = language
          previousTheme.value = theme
          debounceTimer.value = null
          resolve({ html: '', wasIncremental: true, shouldUpdateDOM: false })
        }, options.debounceMs)
      })
    }

    // Wait if there's a pending update to avoid race conditions
    while (pendingUpdate.value) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    pendingUpdate.value = true

    try {
      if (isIncremental && containerElement) {
        // Incremental update: only highlight and append the delta
        const delta = getIncrementalDelta(previousCode.value, code)
        const deltaHtml = await highlighter.codeToHtml(delta, { lang: language, theme })

        await nextTick()
        applyIncrementalUpdate(containerElement, deltaHtml)

        previousCode.value = code
        previousLanguage.value = language
        previousTheme.value = theme

        return { html: '', wasIncremental: true, shouldUpdateDOM: false }
      }
      else {
        // Full render needed
        const html = await highlighter.codeToHtml(code, { lang: language, theme })

        previousCode.value = code
        previousLanguage.value = language
        previousTheme.value = theme

        return { html, wasIncremental: false, shouldUpdateDOM: true }
      }
    }
    finally {
      pendingUpdate.value = false
    }
  }

  /**
   * Reset the internal state (useful when component unmounts or needs a fresh start)
   */
  function reset() {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
      debounceTimer.value = null
    }
    previousCode.value = ''
    previousLanguage.value = ''
    previousTheme.value = ''
    pendingUpdate.value = false
  }

  return {
    highlightIncrementally,
    reset,
    isIncrementalUpdate,
    getIncrementalDelta,
  }
}
