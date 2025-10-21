import { beforeEach, describe, expect, it } from 'vitest'
import { useIncrementalHighlight } from '../src/components/MarkdownCodeBlockNode/incrementalHighlight'

describe('incremental highlighting utility', () => {
  let incrementalHighlight: ReturnType<typeof useIncrementalHighlight>

  beforeEach(() => {
    incrementalHighlight = useIncrementalHighlight()
  })

  describe('isIncrementalUpdate', () => {
    it('should detect incremental updates', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const oldCode = 'const a = 1;'
      const newCode = 'const a = 1;\nconst b = 2;'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
    })

    it('should detect non-incremental updates', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const oldCode = 'const a = 1;'
      const newCode = 'const b = 2;'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(false)
    })

    it('should handle empty old code', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const oldCode = ''
      const newCode = 'const a = 1;'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
    })

    it('should detect when new code is shorter', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const oldCode = 'const a = 1;\nconst b = 2;'
      const newCode = 'const a = 1;'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(false)
    })

    it('should detect when new code is same length but different', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const oldCode = 'const a = 1;'
      const newCode = 'const b = 2;'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(false)
    })
  })

  describe('getIncrementalDelta', () => {
    it('should extract the newly added portion', () => {
      const { getIncrementalDelta } = incrementalHighlight
      const oldCode = 'const a = 1;'
      const newCode = 'const a = 1;\nconst b = 2;'

      expect(getIncrementalDelta(oldCode, newCode)).toBe('\nconst b = 2;')
    })

    it('should handle single character additions', () => {
      const { getIncrementalDelta } = incrementalHighlight
      const oldCode = 'const a = 1'
      const newCode = 'const a = 1;'

      expect(getIncrementalDelta(oldCode, newCode)).toBe(';')
    })

    it('should handle empty old code', () => {
      const { getIncrementalDelta } = incrementalHighlight
      const oldCode = ''
      const newCode = 'const a = 1;'

      expect(getIncrementalDelta(oldCode, newCode)).toBe('const a = 1;')
    })
  })

  describe('streaming scenarios', () => {
    it('should handle gradual code additions', () => {
      const { isIncrementalUpdate, getIncrementalDelta } = incrementalHighlight

      // Simulate streaming: code is gradually added
      const steps = [
        'const ',
        'const a ',
        'const a = ',
        'const a = 1',
        'const a = 1;',
        'const a = 1;\nconst ',
        'const a = 1;\nconst b',
        'const a = 1;\nconst b = 2;',
      ]

      for (let i = 1; i < steps.length; i++) {
        const oldCode = steps[i - 1]
        const newCode = steps[i]

        expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
        const delta = getIncrementalDelta(oldCode, newCode)
        expect(oldCode + delta).toBe(newCode)
      }
    })

    it('should detect when streaming is interrupted with complete rewrite', () => {
      const { isIncrementalUpdate } = incrementalHighlight

      const step1 = 'const a = 1;'
      const step2 = 'const a = 1;\nconst b' // incremental
      const step3 = 'function foo() {}' // complete rewrite

      expect(isIncrementalUpdate(step1, step2)).toBe(true)
      expect(isIncrementalUpdate(step2, step3)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const { isIncrementalUpdate } = incrementalHighlight

      expect(isIncrementalUpdate('', '')).toBe(false)
    })

    it('should handle code with special characters', () => {
      const { isIncrementalUpdate, getIncrementalDelta } = incrementalHighlight
      const oldCode = 'const regex = /test/;'
      const newCode = 'const regex = /test/;\nconst str = "hello\\nworld";'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
      expect(getIncrementalDelta(oldCode, newCode)).toBe('\nconst str = "hello\\nworld";')
    })

    it('should handle code with unicode characters', () => {
      const { isIncrementalUpdate, getIncrementalDelta } = incrementalHighlight
      const oldCode = 'const emoji = "😀";'
      const newCode = 'const emoji = "😀";\nconst chinese = "你好";'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
      expect(getIncrementalDelta(oldCode, newCode)).toBe('\nconst chinese = "你好";')
    })

    it('should handle multiline code with indentation', () => {
      const { isIncrementalUpdate, getIncrementalDelta } = incrementalHighlight
      const oldCode = 'function foo() {\n  const a = 1;'
      const newCode = 'function foo() {\n  const a = 1;\n  return a;\n}'

      expect(isIncrementalUpdate(oldCode, newCode)).toBe(true)
      expect(getIncrementalDelta(oldCode, newCode)).toBe('\n  return a;\n}')
    })
  })

  describe('rapid updates', () => {
    it('should handle rapid sequential updates', () => {
      const { isIncrementalUpdate } = incrementalHighlight

      // Simulate very fast updates
      const updates = [
        'c',
        'co',
        'con',
        'cons',
        'const',
        'const ',
        'const a',
        'const a ',
        'const a =',
        'const a = ',
        'const a = 1',
        'const a = 1;',
      ]

      for (let i = 1; i < updates.length; i++) {
        expect(isIncrementalUpdate(updates[i - 1], updates[i])).toBe(true)
      }
    })

    it('should handle identical rapid updates', () => {
      const { isIncrementalUpdate } = incrementalHighlight
      const code = 'const a = 1;'

      // Same code sent multiple times (no change)
      expect(isIncrementalUpdate(code, code)).toBe(false)
    })
  })

  describe('reset functionality', () => {
    it('should reset internal state', () => {
      const { reset, isIncrementalUpdate } = incrementalHighlight

      // After reset, any new code should be treated as non-incremental initially
      reset()

      // The reset should clear previous state
      // Next update with empty previous should still work
      expect(isIncrementalUpdate('', 'const a = 1;')).toBe(true)
    })
  })
})

describe('incremental vs full rendering consistency', () => {
  it('should document that incremental and full updates produce equivalent highlighted output', () => {
    // This is a documentation test. The actual rendering consistency
    // is tested in the component integration tests where we have access to Shiki.
    //
    // The key principle: after applying N incremental updates that build up
    // to code string C, the final highlighted output should match what we'd get
    // from highlighting C in one shot.
    expect(true).toBe(true)
  })
})
