import { describe, expect, it } from 'vitest'
import { normalizeStandaloneBackslashT } from '../packages/markdown-parser/src/plugins/math'

describe('normalizeStandaloneBackslashT direct tests', () => {
  it('escapes a raw tab to \\t', () => {
    const out = normalizeStandaloneBackslashT('A\tB')
    expect(out).toBe('A\\tB')
  })

  it('normalizes a LaTeX math block', () => {
    const raw = `
\begin{bmatrix}
2x_2 - 8x_3 = 8 \\
5x_1 - 5x_3 = 10
\end{bmatrix}`
    const out = normalizeStandaloneBackslashT(raw)
    // should preserve \begin / \end and not split 'in' inside 'begin' to '\\in'
    expect(out).toBe(`
\\begin{bmatrix}
2x_2 - 8x_3 = 8 \\\\
5x_1 - 5x_3 = 10
\\end{bmatrix}`)
  })

  it('no-op for already normalized string', () => {
    const out = normalizeStandaloneBackslashT('\text{已知三维列向量}\boldsymbol{alpha },\boldsymbol{\beta }\text{，若}\boldsymbol{alpha }^T\boldsymbol{\beta }=0\text{，这个式子和正交补空间有什么联系吗}')
    expect(out).toBe('\\text{已知三维列向量}\\boldsymbol{\\alpha },\\boldsymbol{\\beta }\\text{，若}\\boldsymbol{\\alpha }^T\\boldsymbol{\\beta }=0\\text{，这个式子和正交补空间有什么联系吗}')
  })

  it('no-op for already normalized string-1', () => {
    const out = normalizeStandaloneBackslashT('W^\perp = \{ \mathbf{v} \in \mathbb{R}^3 \mid \mathbf{v} \cdot \mathbf{w} = 0 \text{ 对于所有 } \mathbf{w} \in W \}')
    expect(out).toBe('W^\\perp = \{ \\mathbf{v} \\in \\mathbb{R}^3 \\mid \\mathbf{v} \\cdot \\mathbf{w} = 0 \\text{ 对于所有 } \\mathbf{w} \\in W \}')
  })

  it('no-op for already normalized string-2', () => {
    const out = normalizeStandaloneBackslashT(`\[
\text{付费转化率} = \left( \frac{\text{付费用户数}}{\text{月活用户数}} \right) \times 100\%
\]`)
    expect(out).toBe(`\[
\\text{付费转化率} = \\left( \\frac{\\text{付费用户数}}{\\text{月活用户数}} \\right) \\times 100\%
\]`)
  })

  it('normalizes a raw string to \\t', () => {
    const out = normalizeStandaloneBackslashT('atb')

    expect(out).toMatchInlineSnapshot(`"atb"`)
  })

  it('escapes exclamation to \\!', () => {
    const out = normalizeStandaloneBackslashT('a!b')
    expect(out).toBe('a\\!b')
  })

  it('span to \\{\\}', () => {
    const out = normalizeStandaloneBackslashT('operatorname{span}{\boldsymbol{alpha}}')
    expect(out).toBe('\\operatorname{span}\\{\\boldsymbol{\\alpha}\\}')
  })
})
