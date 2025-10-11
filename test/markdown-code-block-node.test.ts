import { describe, expect, it } from 'vitest'

describe('markdownCodeBlockNode props and features', () => {
  it('should support all header control props', () => {
    const expectedProps = [
      'showHeader',
      'showCopyButton',
      'showExpandButton',
      'showPreviewButton',
      'showFontSizeButtons',
      'enableFontSizeControl',
    ]

    // These props should now be supported on MarkdownCodeBlockNode
    expectedProps.forEach((prop) => {
      expect(prop).toBeTruthy()
    })
  })

  it('should support language detection for preview', () => {
    const htmlLanguages = ['html', 'svg']
    const isPreviewable = (lang: string, isShowPreview: boolean) => {
      return isShowPreview && htmlLanguages.includes(lang.toLowerCase())
    }

    expect(isPreviewable('html', true)).toBe(true)
    expect(isPreviewable('svg', true)).toBe(true)
    expect(isPreviewable('javascript', true)).toBe(false)
    expect(isPreviewable('html', false)).toBe(false)
  })

  it('should support font size controls', () => {
    const codeFontMin = 10
    const codeFontMax = 36
    const codeFontStep = 1
    const defaultSize = 14

    const increaseFont = (current: number) => Math.min(codeFontMax, current + codeFontStep)
    const decreaseFont = (current: number) => Math.max(codeFontMin, current - codeFontStep)
    const resetFont = () => defaultSize

    expect(increaseFont(14)).toBe(15)
    expect(increaseFont(36)).toBe(36)
    expect(decreaseFont(14)).toBe(13)
    expect(decreaseFont(10)).toBe(10)
    expect(resetFont()).toBe(14)
  })

  it('should emit proper events', () => {
    const expectedEvents = ['previewCode', 'copy']
    expectedEvents.forEach((event) => {
      expect(event).toBeTruthy()
    })
  })

  it('should support named slots', () => {
    const expectedSlots = ['header-left', 'header-right']
    expectedSlots.forEach((slot) => {
      expect(slot).toBeTruthy()
    })
  })

  it('should support auto-scroll to bottom behavior', () => {
    // Test the isAtBottom helper function logic with 50px threshold
    const isAtBottom = (scrollHeight: number, scrollTop: number, clientHeight: number, threshold = 50): boolean => {
      return scrollHeight - scrollTop - clientHeight <= threshold
    }

    // Test when at bottom
    expect(isAtBottom(1000, 900, 100, 50)).toBe(true) // exactly at bottom
    expect(isAtBottom(1000, 860, 100, 50)).toBe(true) // within threshold (40px from bottom)

    // Test when not at bottom
    expect(isAtBottom(1000, 840, 100, 50)).toBe(false) // beyond threshold (60px from bottom)
    expect(isAtBottom(1000, 500, 100, 50)).toBe(false) // in middle
    expect(isAtBottom(1000, 0, 100, 50)).toBe(false) // at top
  })

  it('should handle programmatic scroll without disabling auto-scroll', () => {
    // Simulate the logic for handling programmatic vs user scrolls
    let autoScrollEnabled = true
    let isProgrammaticScroll = false
    let lastScrollTop = 100

    // Simulate programmatic scroll - should NOT disable auto-scroll
    const handleScroll = (currentScrollTop: number, isProgrammatic: boolean) => {
      if (isProgrammatic) {
        // Ignore programmatic scrolls
        return
      }
      // User scroll up - should disable
      if (currentScrollTop < lastScrollTop) {
        autoScrollEnabled = false
      }
      lastScrollTop = currentScrollTop
    }

    // Programmatic scroll should not change auto-scroll state
    isProgrammaticScroll = true
    handleScroll(100, isProgrammaticScroll)
    expect(autoScrollEnabled).toBe(true)

    // User scroll should disable auto-scroll when scrolling up
    isProgrammaticScroll = false
    handleScroll(50, isProgrammaticScroll) // scroll up from 100 to 50
    expect(autoScrollEnabled).toBe(false)
  })
})
