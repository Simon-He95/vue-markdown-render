import { describe, expect, it } from 'vitest'
import { registerHighlight } from '../src/components/MarkdownCodeBlockNode/highlight'
import { useIncrementalHighlight } from '../src/components/MarkdownCodeBlockNode/incrementalHighlight'

function createContainerElement(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

describe('streaming intermediate state verification', () => {
  it('should handle streaming updates that append to same line without newline', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const container = createContainerElement()

    // Simulate streaming: "const a = 1" followed by more on same line (no newline)
    // This mimics what happens when markdown streams without newlines
    const step1 = 'const a = 1'
    const step2 = 'const a = 1; const b = 2'

    // First render
    const result1 = await highlightIncrementally(highlighter, step1, 'javascript', 'vitesse-dark', null)
    expect(result1.shouldUpdateDOM).toBe(true)
    container.innerHTML = result1.html

    console.log('Step 1 HTML:', container.innerHTML)
    console.log('Step 1 lines:', container.querySelectorAll('.line').length)

    // Second render - should NOT be incremental because it modifies existing line
    const result2 = await highlightIncrementally(highlighter, step2, 'javascript', 'vitesse-dark', container)

    // In real Vue component, if shouldUpdateDOM is true, v-html updates the container
    if (result2.shouldUpdateDOM) {
      container.innerHTML = result2.html
    }

    console.log('Step 2 HTML:', container.innerHTML)
    console.log('Step 2 lines:', container.querySelectorAll('.line').length)
    console.log('Step 2 wasIncremental:', result2.wasIncremental)

    // Get full render for comparison
    const fullRender = await highlighter.codeToHtml(step2, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    const fullDiv = document.createElement('div')
    fullDiv.innerHTML = fullRender

    console.log('Full render HTML:', fullDiv.innerHTML)
    console.log('Full render lines:', fullDiv.querySelectorAll('.line').length)

    // The line counts should match
    const containerLines = container.querySelectorAll('.line').length
    const fullLines = fullDiv.querySelectorAll('.line').length

    console.log(`\nComparison: container=${containerLines} vs full=${fullLines}`)

    // Extract actual text content for comparison
    const containerText = container.textContent || ''
    const fullText = fullDiv.textContent || ''
    console.log(`Container text: "${containerText}"`)
    console.log(`Full text: "${fullText}"`)

    expect(containerLines).toBe(fullLines)
    expect(containerText.trim()).toBe(fullText.trim())
  })

  it('should handle streaming with proper newlines', async () => {
    const highlighter = await registerHighlight({
      themes: ['vitesse-dark'],
      langs: ['javascript'],
    })

    const { highlightIncrementally, reset } = useIncrementalHighlight()
    reset()

    const container = createContainerElement()

    // Proper streaming with newlines
    const step1 = 'const a = 1;'
    const step2 = 'const a = 1;\nconst b = 2;'
    const step3 = 'const a = 1;\nconst b = 2;\nconst c = 3;'

    // First render
    const result1 = await highlightIncrementally(highlighter, step1, 'javascript', 'vitesse-dark', null)
    container.innerHTML = result1.html

    // Second render - incremental with newline
    await highlightIncrementally(highlighter, step2, 'javascript', 'vitesse-dark', container)

    // Third render - incremental with newline
    await highlightIncrementally(highlighter, step3, 'javascript', 'vitesse-dark', container)

    // Get full render for comparison
    const fullRender = await highlighter.codeToHtml(step3, {
      lang: 'javascript',
      theme: 'vitesse-dark',
    })
    const fullDiv = document.createElement('div')
    fullDiv.innerHTML = fullRender

    const containerLines = container.querySelectorAll('.line').length
    const fullLines = fullDiv.querySelectorAll('.line').length

    console.log(`\nWith newlines: container=${containerLines} vs full=${fullLines}`)

    expect(containerLines).toBe(fullLines)
  })
})
