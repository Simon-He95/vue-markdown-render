import type { Highlighter } from 'shiki'
import { ref } from 'vue'

/**
 * Utility to manage incremental code highlighting for streaming scenarios.
 * Optimizes rendering by detecting incremental updates and debouncing rapid changes.
 */
export function useIncrementalHighlight() {
  const previousCode = ref('')
  const previousLanguage = ref('')
  const previousTheme = ref('')
  const pendingUpdate = ref(false)
  const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Check if the new code is an incremental update (appends to previous code)
   */
  function isIncrementalUpdate(oldCode: string, newCode: string): boolean {
    // If newCode starts with oldCode, it's an incremental addition
    return newCode.length > oldCode.length && newCode.startsWith(oldCode)
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
   * Highlight code with optimization for incremental updates.
   * For streaming scenarios, this detects incremental additions and can debounce rapid updates.
   * Returns the full highlighted HTML and a flag indicating if it was an incremental update.
   */
  async function highlightIncrementally(
    highlighter: Highlighter,
    code: string,
    language: string,
    theme: string,
    options: { debounceMs?: number } = {},
  ): Promise<{ html: string, wasIncremental: boolean }> {
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
          const html = await highlighter.codeToHtml(code, { lang: language, theme })
          previousCode.value = code
          previousLanguage.value = language
          previousTheme.value = theme
          debounceTimer.value = null
          resolve({ html, wasIncremental: true })
        }, options.debounceMs)
      })
    }

    // Wait if there's a pending update to avoid race conditions
    while (pendingUpdate.value) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    pendingUpdate.value = true

    try {
      // Always do full render for correctness
      // The "incremental" optimization is in detecting patterns and debouncing
      const html = await highlighter.codeToHtml(code, { lang: language, theme })

      previousCode.value = code
      previousLanguage.value = language
      previousTheme.value = theme

      return { html, wasIncremental: isIncremental }
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
