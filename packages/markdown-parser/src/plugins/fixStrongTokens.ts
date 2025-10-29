import type MarkdownIt from 'markdown-it'
import type { MarkdownToken } from 'stream-markdown-parser'

export function applyFixStrongTokens(md: MarkdownIt) {
  // Run after inline tokenization to normalize strong/em tokens in
  // each inline token's children. This ensures downstream inline
  // parsers receive a normalized token list.
  md.core.ruler.after('inline', 'fix_strong_tokens', (state: unknown) => {
    const s = state as unknown as { tokens?: Array<{ type?: string, children?: any[] }> }
    const toks = s.tokens ?? []
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i]
      if (t && t.type === 'inline' && Array.isArray(t.children)) {
        try {
          t.children = fixStrongTokens(t.children)
        }
        catch (e) {
          // don't break parsing on plugin error

          console.error('[applyFixStrongTokens] failed to fix inline children', e)
        }
      }
    }
  })
}

function fixStrongTokens(tokens: MarkdownToken[]): MarkdownToken[] {
  const fixedTokens = [...tokens]
  if (tokens.length < 4)
    return fixedTokens
  const i = tokens.length - 4
  const token = tokens[i]
  const nextToken = tokens[i + 1]
  const tokenContent = String(token.content ?? '')
  if (token.type === 'text' && tokenContent.endsWith('*') && nextToken.type === 'em_open') {
    // 解析有问题，要合并 emphasis 和 前面的 * 为 strong
    const _nextToken = tokens[i + 2]
    const count = _nextToken?.type === 'text' ? 4 : 3
    const insert = [
      {
        type: 'strong_open',
        tag: 'strong',
        attrs: null,
        map: null,
        children: null,
        content: '',
        markup: '**',
        info: '',
        meta: null,
      },
      {
        type: 'text',
        content: _nextToken?.type === 'text' ? String(_nextToken.content ?? '') : '',
      },
      {
        type: 'strong_close',
        tag: 'strong',
        attrs: null,
        map: null,
        children: null,
        content: '',
        markup: '**',
        info: '',
        meta: null,
      },
    ] as MarkdownToken[]
    const beforeText = tokenContent.slice(0, -1)
    if (beforeText) {
      insert.unshift({
        type: 'text',
        content: beforeText,
        raw: beforeText,
      })
    }
    fixedTokens.splice(i, count, ...insert)
    return fixedTokens
  }

  return fixedTokens
}
