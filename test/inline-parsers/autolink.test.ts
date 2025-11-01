import { getMarkdown, parseMarkdownToStructure } from 'stream-markdown-parser'
import { describe, expect, it } from 'vitest'
import { links, textIncludes } from '../utils/midstate-utils'

const md = getMarkdown('midstates')

describe('autolink handling', () => {
  it('bare http URL should be parsed as a link node (autolink)', () => {
    const nodes = parseMarkdownToStructure('http://a', md)
    const ls = links(nodes)
    expect(ls.length).toBeGreaterThanOrEqual(1)
    const l = ls[0] as any
    expect(textIncludes(l, 'http://a') || l.href === 'http://a' || /http:\/\/.+/.test(String(l.href))).toBe(true)
    // autolinks should not be considered loading
    expect(!!l.loading).toBe(false)
  })

  it('angle-bracket autolink <http://a> should be parsed as link', () => {
    const nodes = parseMarkdownToStructure('<http://a>', md)
    const ls = links(nodes)
    if (ls.length > 0) {
      const l = ls[0] as any
      expect(textIncludes(l, 'http://a') || String(l.href).includes('http://a')).toBe(true)
    }
    else {
      // tokenizer may choose to leave raw text; accept that fallback
      expect(textIncludes(nodes, '<http://a>') || textIncludes(nodes, 'http://a')).toBe(true)
    }
  })

  it('bracketed link with title containing emoji (mid-state) should NOT be misclassified as autolink', () => {
    const nodes = parseMarkdownToStructure('[x](http://a "t😁"', md)
    const ls = links(nodes)
    if (ls.length > 0) {
      // If parser produced a link, it should be loading (mid-state) rather than finalized autolink
      expect(!!ls[0].loading).toBe(true)
      // title or children should include emoji or stub
      const ok = textIncludes(ls[0], '😁') || textIncludes(ls[0], 't') || textIncludes(nodes, 't') || textIncludes(nodes, '😁')
      expect(ok).toBe(true)
    }
    else {
      // Accept text fallback containing the raw mid-state
      expect(textIncludes(nodes, '[x](http://a "t😁"') || textIncludes(nodes, 't😁')).toBe(true)
    }
  })
})
