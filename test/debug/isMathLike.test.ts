import { isMathLike } from 'stream-markdown-parser'
import { expect, it } from 'vitest'

it('recognizes \"\\boldsymbol{...}\" as math-like', () => {
  expect(isMathLike('\\boldsymbol{\\beta}')).toBe(true)
  expect(isMathLike('\\(C++\\)')).toBe(false)
  expect(isMathLike('\\(W\\)')).toBe(false)
  expect(isMathLike('\\(f^{(k)}(a)\\)')).toBe(true)
  expect(isMathLike('\\(W^\perp\\)')).toBe(true)
  expect(isMathLike('\\(2025/9/30 21:37:24\\)')).toBe(false)
  expect(isMathLike('operatorname{')).toBe(true)
  expect(isMathLike('served from /vue-markdown-icon.svg')).toBe(false)
  expect(isMathLike('served from vue-markdown-icon.1')).toBe(false)
  expect(isMathLike('get_time')).toBe(false)
  expect(isMathLike('or **matrix of coefficients**')).toBe(false)
})
