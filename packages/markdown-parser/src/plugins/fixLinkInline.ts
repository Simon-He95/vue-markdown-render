import type MarkdownIt from 'markdown-it'

export function applyFixLinkInline(md: MarkdownIt) {
  // Inline tokenizer that tries to recognize [text](href) and loading
  // link forms like "[x](http://a" earlier, producing link_open/text/link_close
  // tokens so downstream code sees them as links during the inline pass.
  const rule = (state: unknown, silent: boolean) => {
    const s = state as unknown as { src: string, pos: number, push: (type: string, tag?: string, nesting?: number) => any }
    const start = s.pos
    if (s.src[start] !== '[')
      return false

    // Don't handle image syntax here
    if (start > 0 && s.src[start - 1] === '!')
      return false

    // Look for closing ']' and opening '(' after it
    const rest = s.src.slice(start)
    // eslint-disable-next-line regexp/no-useless-quantifier
    const m = /^\[([^\]]*)\]\(([^)\s]*)?/.exec(rest)
    if (!m)
      return false

    if (silent)
      return true

    const text = m[1] ?? ''
    const href = m[2] ?? ''
    // Be conservative: if the link text contains characters that indicate
    // emphasis or emoji shortcodes (e.g. '*' or ':'), don't pre-tokenize
    // here — let the core inline parser handle these ambiguous mid-states.
    if (text.includes('*') || text.includes(':'))
      return false
    const idxClose = rest.indexOf(')')
    const hasClosingParen = idxClose !== -1

    // push link_open
    const open = s.push('link_open', 'a', 1)
    open.attrs = [['href', href]]
    // push inner text
    const txt = s.push('text', '', 0)
    txt.content = text

    // only emit link_close if the source actually contained a closing paren
    if (hasClosingParen) {
      s.push('link_close', 'a', -1)
      // consume through the closing paren
      s.pos += idxClose + 1
    }
    else {
      // consume the matched prefix (e.g. "[x](http://a") but do not
      // emit a link_close so downstream logic treats this as a loading link
      s.pos += m[0].length
    }
    return true
  }

  // Insert before default 'link' rule to take precedence
  md.inline.ruler.before('link', 'fix_link_inline', rule)
}
