import { beforeEach, describe, expect, it } from 'vitest'
import { registerHighlight } from '../src/components/MarkdownCodeBlockNode/highlight'
import { useIncrementalHighlight } from '../src/components/MarkdownCodeBlockNode/incrementalHighlight'

function createContainerElement(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

describe('incremental highlighting with Shiki integration', () => {
  beforeEach(() => {
    // Clear document body before each test
    document.body.innerHTML = ''
  })

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

    // Create container and initialize with first render
    reset()
    const container = createContainerElement()

    const result1 = await highlightIncrementally(highlighter, step1, 'javascript', 'vitesse-dark', null)
    expect(result1.wasIncremental).toBe(false) // First render
    expect(result1.shouldUpdateDOM).toBe(true)
    container.innerHTML = result1.html

    // Apply incremental updates
    const result2 = await highlightIncrementally(highlighter, step2, 'javascript', 'vitesse-dark', container)
    expect(result2.wasIncremental).toBe(true) // Incremental from step1
    expect(result2.shouldUpdateDOM).toBe(false) // DOM updated directly

    const result3 = await highlightIncrementally(highlighter, step3, 'javascript', 'vitesse-dark', container)
    expect(result3.wasIncremental).toBe(true) // Incremental from step2
    expect(result3.shouldUpdateDOM).toBe(false) // DOM updated directly

    // Get full render of final code for comparison
    const fullResult = await highlighter.codeToHtml(step3, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })

    // Extract code elements for comparison (ignoring wrapper differences)
    const containerCode = container.querySelector('code')
    const fullDiv = document.createElement('div')
    fullDiv.innerHTML = fullResult
    const fullCode = fullDiv.querySelector('code')

    // Both should have the same number of line elements
    const containerLines = containerCode?.querySelectorAll('.line').length || 0
    const fullLines = fullCode?.querySelectorAll('.line').length || 0
    expect(containerLines).toBe(fullLines)
    expect(containerLines).toBe(3) // 3 lines of code
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

    const container = createContainerElement()
    let wasIncremental = false

    for (let i = 0; i < steps.length; i++) {
      const result = await highlightIncrementally(highlighter, steps[i], 'python', 'vitesse-light', i === 0 ? null : container)

      if (i === 0) {
        // First render
        expect(result.shouldUpdateDOM).toBe(true)
        container.innerHTML = result.html
      }
      else {
        // After first render, all subsequent should be incremental
        wasIncremental = wasIncremental || result.wasIncremental
      }
    }

    // At least some updates should have been detected as incremental
    expect(wasIncremental).toBe(true)

    // Verify final state has correct number of lines
    const containerLines = container.querySelectorAll('.line').length
    expect(containerLines).toBeGreaterThan(0)
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
    const jsResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-dark', null)
    expect(jsResult.wasIncremental).toBe(false) // First render is always full
    expect(jsResult.shouldUpdateDOM).toBe(true)

    // Same code but as TypeScript - should trigger full re-render
    const tsResult = await highlightIncrementally(highlighter, code, 'typescript', 'vitesse-dark', null)
    expect(tsResult.wasIncremental).toBe(false) // Language changed, full re-render
    expect(tsResult.shouldUpdateDOM).toBe(true)
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
    const darkResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-dark', null)
    expect(darkResult.wasIncremental).toBe(false) // First render is always full
    expect(darkResult.shouldUpdateDOM).toBe(true)

    // Same code with light theme - should trigger full re-render
    const lightResult = await highlightIncrementally(highlighter, code, 'javascript', 'vitesse-light', null)
    expect(lightResult.wasIncremental).toBe(false) // Theme changed, full re-render
    expect(lightResult.shouldUpdateDOM).toBe(true)
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
    const result1 = await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark', null)
    expect(result1.wasIncremental).toBe(false) // First render
    expect(result1.shouldUpdateDOM).toBe(true)

    // Completely different code (not an incremental addition)
    const code2 = 'function foo() {}'
    const result2 = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark', null)
    expect(result2.wasIncremental).toBe(false) // Not incremental, full re-render
    expect(result2.shouldUpdateDOM).toBe(true)

    // Verify it matches full render
    const fullRender = await highlighter.codeToHtml(code2, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result2.html).toBe(fullRender)
  })

  it('should correctly identify incremental updates with DOM manipulation', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const container = createContainerElement()

    // Start with some code
    const code1 = 'const a = 1;'
    const result1 = await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark', null)
    expect(result1.wasIncremental).toBe(false) // First render
    expect(result1.shouldUpdateDOM).toBe(true)
    container.innerHTML = result1.html

    // Add more code incrementally
    const code2 = 'const a = 1;\nconst b = 2;'
    const result2 = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark', container)
    expect(result2.wasIncremental).toBe(true) // This is incremental!
    expect(result2.shouldUpdateDOM).toBe(false) // DOM updated directly

    // Add even more incrementally
    const code3 = 'const a = 1;\nconst b = 2;\nconst c = 3;'
    const result3 = await highlightIncrementally(highlighter, code3, 'javascript', 'vitesse-dark', container)
    expect(result3.wasIncremental).toBe(true) // Still incremental
    expect(result3.shouldUpdateDOM).toBe(false) // DOM updated directly

    // Verify DOM has correct number of lines
    const lines = container.querySelectorAll('.line').length
    expect(lines).toBe(3)
  })

  it('should handle rapid updates correctly', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const container = createContainerElement()

    // Simulate rapid streaming updates with newlines (so they can be incremental)
    const updates = [
      'const a = 1;',
      'const a = 1;\nconst b = 2;',
      'const a = 1;\nconst b = 2;\nconst c = 3;',
    ]

    let hadIncremental = false
    for (let i = 0; i < updates.length; i++) {
      const result = await highlightIncrementally(highlighter, updates[i], 'javascript', 'vitesse-dark', i === 0 ? null : container)

      if (i === 0) {
        expect(result.shouldUpdateDOM).toBe(true)
        container.innerHTML = result.html
      }
      else {
        if (result.wasIncremental) {
          hadIncremental = true
          expect(result.shouldUpdateDOM).toBe(false)
        }
        else if (result.shouldUpdateDOM) {
          // If not incremental, update the DOM
          container.innerHTML = result.html
        }
      }
    }

    // Some updates should have been detected as incremental
    expect(hadIncremental).toBe(true)

    // Verify DOM state
    expect(container.querySelector('code')).toBeTruthy()
    expect(container.querySelectorAll('.line').length).toBe(3)
  })

  it('should handle empty code gracefully', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    // Empty code
    const result = await highlightIncrementally(highlighter, '', 'javascript', 'vitesse-dark', null)
    expect(result.wasIncremental).toBe(false)
    expect(result.shouldUpdateDOM).toBe(true)

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
    await highlightIncrementally(highlighter, code1, 'javascript', 'vitesse-dark', null)

    // Reset
    reset()

    // After reset, next code should be treated as new (not incremental)
    const code2 = 'const a = 1;\nconst b = 2;'
    const result = await highlightIncrementally(highlighter, code2, 'javascript', 'vitesse-dark', null)
    expect(result.wasIncremental).toBe(false) // Not incremental after reset
    expect(result.shouldUpdateDOM).toBe(true)

    // Verify result matches full render
    const fullRender = await highlighter.codeToHtml(code2, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    expect(result.html).toBe(fullRender)
  })
})
