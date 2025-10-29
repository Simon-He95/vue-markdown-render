import type { MathOptions } from './config'
import MarkdownIt from 'markdown-it'
import { getDefaultMathOptions } from './config'
import { applyContainers } from './plugins/containers'
import { applyFixLinkInline } from './plugins/fixLinkInline'
import { applyFixLinkTokens } from './plugins/fixLinkTokens'
import { applyFixListItem } from './plugins/fixListItem'
import { applyFixStrongTokens } from './plugins/fixStrongTokens'
import { applyFixTableTokens } from './plugins/fixTableTokens'
import { applyMath } from './plugins/math'
import { applyRenderRules } from './renderers'

export interface FactoryOptions extends Record<string, unknown> {
  markdownItOptions?: Record<string, unknown>
  enableMath?: boolean
  enableContainers?: boolean
  mathOptions?: { commands?: string[], escapeExclamation?: boolean }
}

export function factory(opts: FactoryOptions = {}): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    ...(opts.markdownItOptions ?? {}),
  })

  if (opts.enableMath ?? true) {
    const mergedMathOptions: MathOptions = { ...(getDefaultMathOptions() ?? {}), ...(opts.mathOptions ?? {}) }
    applyMath(md, mergedMathOptions)
  }
  if (opts.enableContainers ?? true)
    applyContainers(md)
  // Apply link-fixing plugin early so tokens produced during parsing
  // have corrected inline children. This runs during markdown-it's
  // core stage (after inline tokenization) instead of after parse.
  // Install inline-level link tokenizer before the built-in 'link' rule
  applyFixLinkInline(md)
  // Retain the core-stage fix as a fallback for any cases the inline
  // tokenizer does not handle.
  applyFixLinkTokens(md)
  // Also apply strong-token normalization at the same stage.
  applyFixStrongTokens(md)
  // Apply list-item inline normalization as well.
  applyFixListItem(md)
  // Apply table token normalization at block stage.
  applyFixTableTokens(md)
  applyRenderRules(md)

  return md
}
