import { describe, expect, it } from 'vitest'
import { registerHighlight } from '../src/components/MarkdownCodeBlockNode/highlight'
import { useIncrementalHighlight } from '../src/components/MarkdownCodeBlockNode/incrementalHighlight'

describe('incremental highlighting with Shiki integration', () => {
  it('should produce consistent results for incremental vs full rendering', async () => {
    // Initialize highlighter
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()

    // Test case: build up code incrementally
    const step1 = 'const a = 1;'
    const step2 = 'const a = 1;\nconst b = 2;'
    const step3 = 'const a = 1;\nconst b = 2;\nconst c = 3;'

    // Apply incremental updates
    reset()
    const result1 = await highlightIncrementally(highlighter, step1, 'javascript', 'vitesse-dark')
    const result2 = await highlightIncrementally(highlighter, step2, 'javascript', 'vitesse-dark')
    const result3 = await highlightIncrementally(highlighter, step3, 'javascript', 'vitesse-dark')

    // Get full render of final code
    const fullResult = await highlighter.codeToHtml(step3, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })

    // The incremental result should match the full result exactly
    // since we always do full re-renders for correctness
    expect(result3.html).toBe(fullResult)

    // Verify flags are correct
    expect(result1.wasIncremental).toBe(false) // First render
    expect(result2.wasIncremental).toBe(true) // Incremental from step1
    expect(result3.wasIncremental).toBe(true) // Incremental from step2
  })

  it('should handle streaming scenario with multiple small additions', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-light'],
      langs: ['python'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // Simulate streaming Python code
    const steps = [
      'def hello():',
      'def hello():\n    print',
      'def hello():\n    print("Hello")',
      'def hello():\n    print("Hello")\n\nhello()',
    ]

    let lastResult
    let wasIncremental = false
    for (let i = 0; i < steps.length; i++) {
      lastResult = await highlightIncrementally(highlighter, steps[i], 'python', 'vitesse-light')
      expect(lastResult.html).toBeTruthy()

      if (i > 0) {
        // After first render, all subsequent should be incremental
        wasIncremental = wasIncremental || lastResult.wasIncremental
      }
    }

    // At least some updates should have been detected as incremental
    expect(wasIncremental).toBe(true)

    // Final result should match a full render
    const fullRender = await highlighter.codeToHtml(steps[steps.length - 1], {
      lang: 'python',
      theme: 'vitesse-light',
    })
    expect(lastResult?.html).toBe(fullRender)
  })

  it('should detect and handle language changes requiring full re-render', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript', 'typescript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const code = 'const a: number = 1;'

    // First render as JavaScript
    const jsResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-dark')
    expect(jsResult.wasIncremental).toBe(false) // First render is always full

    // Same code but as TypeScript - should trigger full re-render
    const tsResult = await highlightIncrementally(highlighter, code, 'typescript', 'vitesse-dark')
    expect(tsResult.wasIncremental).toBe(false) // Language changed, full re-render
    expect(tsResult.html).toBeTruthy()
  })

  it('should detect and handle theme changes requiring full re-render', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const code = 'const a = 1;'

    // Render with dark theme
    const darkResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-dark')
    expect(darkResult.wasIncremental).toBe(false) // First render is always full

    // Same code with light theme - should trigger full re-render
    const lightResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-light')
    expect(lightResult.wasIncremental).toBe(false) // Theme changed, full re-render
    expect(lightResult.html).toBeTruthy()
    expect(lightResult.html).not.toBe(darkResult.html) // Different themes produce different HTML
  })

  it('should handle non-incremental code changes with full re-render', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // First code
    const code1 = 'const a = 1;'
    const result1 = await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark')
    expect(result1.wasIncremental).toBe(false) // First render

    // Completely different code (not an incremental addition)
    const code2 = 'function foo() {}'
    const result2 = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark')
    expect(result2.wasIncremental).toBe(false) // Not incremental, full re-render

    // Verify it matches full render
    const fullRender = await highlighter.codeToHtml(code2, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result2.html).toBe(fullRender)
  })

  it('should correctly identify incremental updates', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // Start with some code
    const code1 = 'const a = 1;'
    const result1 = await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark')
    expect(result1.wasIncremental).toBe(false) // First render

    // Add more code incrementally
    const code2 = 'const a = 1;\nconst b = 2;'
    const result2 = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark')
    expect(result2.wasIncremental).toBe(true) // This is incremental!

    // Add even more incrementally
    const code3 = 'const a = 1;\nconst b = 2;\nconst c = 3;'
    const result3 = await highlightIncrementally(highlighter, code3, 'javascript', 'vitesse-dark')
    expect(result3.wasIncremental).toBe(true) // Still incremental

    // Verify final result matches full render
    const fullRender = await highlighter.codeToHtml(code3, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result3.html).toBe(fullRender)
  })

  it('should handle rapid updates correctly', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // Simulate rapid streaming updates
    const updates = [
      'con',
      'const',
      'const ',
      'const a',
      'const a =',
      'const a = 1',
      'const a = 1;',
    ]

    let hadIncremental = false
    for (let i = 0; i < updates.length; i++) {
      const result = await highlightIncrementally(highlighter, updates[i], 'javascript', 'vitesse-dark')
      expect(result.html).toBeTruthy()

      if (i > 0 && result.wasIncremental) {
        hadIncremental = true
      }

      // Verify result matches full render
      const fullRender = await highlighter.codeToHtml(updates[i], {
        lang: 'javascript',
        theme: 'vitesse-dark',
      })
      expect(result.html).toBe(fullRender)
    }

    // Some updates should have been detected as incremental
    expect(hadIncremental).toBe(true)
  })

  it('should handle empty code gracefully', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // Empty code
    const result = await highlightIncrementally(highlighter, '', 'javascript', 'vitesse-dark')
    expect(result.wasIncremental).toBe(false)
    expect(result.html).toBeTruthy()

    // Verify matches full render
    const fullRender = await highlighter.codeToHtml('', {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result.html).toBe(fullRender)
  })

  it('should reset state correctly', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // First code
    const code1 = 'const a = 1;'
    await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark')

    // Reset
    reset()

    // After reset, next code should be treated as new (not incremental)
    const code2 = 'const a = 1;\nconst b = 2;'
    const result = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark')
    expect(result.wasIncremental).toBe(false) // Not incremental after reset

    // Verify result matches full render
    const fullRender = await highlighter.codeToHtml(code2, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result.html).toBe(fullRender)
  })
})
