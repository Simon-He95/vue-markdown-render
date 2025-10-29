import { getMarkdown, parseMarkdownToStructure } from 'stream-markdown-parser'
import { describe, expect, it } from 'vitest'

const md = getMarkdown('fix-link-inline')

function collectLinks(nodes: any[]) {
  const out: any[] = []
  const walk = (n: any) => {
    if (!n)
      return
    if (n.type === 'link')
      out.push(n)
    if (Array.isArray(n.children))
      n.children.forEach(walk)
    if (Array.isArray(n.items))
      n.items.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

describe('inline parser fixes (link mid-states)', () => {
  it('handles loading link [x](http://a as loading link node', () => {
    const nodes = parseMarkdownToStructure('[x](http://a', md)
    const links = collectLinks(nodes as any[])
    expect(links.length).toBeGreaterThan(0)
    const l = links[0]
    expect(l.text).toBe('x')
    // loading should be true for unclosed parenthesis
    expect(Boolean(l.loading)).toBe(true)
    // href may be present or empty depending on tokenizer, but if present contains the partial href
    if (l.href)
      expect(String(l.href)).toContain('http')
  })

  it('does not treat [*x as a finalized link', () => {
    const nodes = parseMarkdownToStructure('[*x', md)
    const links = collectLinks(nodes as any[])
    // Should not create a link from just '[*x'
    expect(links.length).toBe(0)
  })

  it('parses finalized link [x](http://a) as non-loading link', () => {
    const nodes = parseMarkdownToStructure('[x](http://a)', md)
    const links = collectLinks(nodes as any[])
    expect(links.length).toBeGreaterThan(0)
    const l = links[0]
    expect(l.loading).toBeFalsy()
    expect(String(l.href)).toContain('http://a')
  })
})
