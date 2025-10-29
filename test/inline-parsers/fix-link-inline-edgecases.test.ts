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

describe('fix-link-inline edge cases', () => {
  it('handles "[*x](xx" tolerantly (link with emphasis or text fallback)', () => {
    const nodes = parseMarkdownToStructure('[*x](xx', md)
    const links = collectLinks(nodes as any[])
    if (links.length > 0) {
      const l = links[0]
      const textOk = l.text === '*x' || (l.children && l.children.some((c: any) => c.type === 'emphasis'))
      expect(textOk).toBe(true)
      expect(!!l.loading).toBe(true)
    }
    else {
      // fallback: ensure original raw text remains
      const raw = JSON.stringify(nodes)
      expect(raw.includes('[*x](xx') || raw.includes('emphasis')).toBe(true)
    }
  })

  it('handles emoji at end of link text with unclosed URL conservatively', () => {
    const nodes = parseMarkdownToStructure('[x:smile:](u', md)
    const links = collectLinks(nodes as any[])
    if (links.length > 0) {
      const l = links[0]
      expect(!!l.loading).toBe(true)
      // link text should contain the emoji shortcode or contain an emoji node
      const hasEmojiText = typeof l.text === 'string' && l.text.includes(':smile:')
      const hasEmojiNode = Array.isArray(l.children) && l.children.some((c: any) => c.type === 'emoji' || (c.children && c.children.some((cc: any) => cc.type === 'emoji')))
      expect(hasEmojiText || hasEmojiNode).toBe(true)
    }
    else {
      const raw = JSON.stringify(nodes)
      expect(raw.includes('[x:smile:](u') || raw.includes('emoji')).toBe(true)
    }
  })
})
