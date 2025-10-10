import type { App, Component, Plugin } from 'vue'
import type { LanguageIconResolver } from './utils/languageIcon'
import AdmonitionNode from './components/AdmonitionNode'
import BlockquoteNode from './components/BlockquoteNode'

import CheckboxNode from './components/CheckboxNode'
import CodeBlockNode from './components/CodeBlockNode'
import DefinitionListNode from './components/DefinitionListNode'
import EmojiNode from './components/EmojiNode'
import FootnoteNode from './components/FootnoteNode'
import FootnoteReferenceNode from './components/FootnoteReferenceNode'
import HardBreakNode from './components/HardBreakNode'
import HeadingNode from './components/HeadingNode'
import HighlightNode from './components/HighlightNode'
import ImageNode from './components/ImageNode'
import InlineCodeNode from './components/InlineCodeNode'
import InsertNode from './components/InsertNode'
import LinkNode from './components/LinkNode'
import ListItemNode from './components/ListItemNode'
import ListNode from './components/ListNode'
import MarkdownCodeBlockNode from './components/MarkdownCodeBlockNode'
import MathBlockNode from './components/MathBlockNode'
import MathInlineNode from './components/MathInlineNode'
import MermaidBlockNode from './components/MermaidBlockNode'
import MarkdownRender from './components/NodeRenderer'
import ParagraphNode from './components/ParagraphNode'
import PreCodeNode from './components/PreCodeNode'
import ReferenceNode from './components/ReferenceNode'
import StrikethroughNode from './components/StrikethroughNode'
import StrongNode from './components/StrongNode'
import SubscriptNode from './components/SubscriptNode'
import SuperscriptNode from './components/SuperscriptNode'
import TableNode from './components/TableNode'
import TextNode from './components/TextNode'
import ThematicBreakNode from './components/ThematicBreakNode'
import { setLanguageIconResolver } from './utils/languageIcon'
import { setDefaultMathOptions } from './utils/markdown/config'
import { clearGlobalCustomComponents, getCustomNodeComponents, removeCustomComponents, setCustomComponents } from './utils/nodeComponents'
import './index.css'

export * from './utils'
export { setDefaultMathOptions } from './utils/markdown/config'
export type { MathOptions } from './utils/markdown/config'
export { KATEX_COMMANDS } from './utils/markdown/plugins/math'
export { normalizeStandaloneBackslashT } from './utils/markdown/plugins/math'
export { applyGeistLightTheme, geistLightThemeClass } from './themes/geistLight'

export {
  AdmonitionNode,
  BlockquoteNode,
  CheckboxNode,
  clearGlobalCustomComponents,
  CodeBlockNode,
  DefinitionListNode,
  EmojiNode,
  FootnoteNode,
  FootnoteReferenceNode,
  getCustomNodeComponents,
  HardBreakNode,
  HeadingNode,
  HighlightNode,
  ImageNode,
  InlineCodeNode,
  InsertNode,
  LinkNode,
  ListItemNode,
  ListNode,
  MarkdownCodeBlockNode,
  MarkdownRender,
  MathBlockNode,
  MathInlineNode,
  MermaidBlockNode,
  ParagraphNode,
  PreCodeNode,
  ReferenceNode,
  removeCustomComponents,
  setCustomComponents,
  StrikethroughNode,
  StrongNode,
  SubscriptNode,
  SuperscriptNode,
  TableNode,
  TextNode,
  ThematicBreakNode,
}

export default MarkdownRender

const componentMap: Record<string, Component> = {
  AdmonitionNode,
  BlockquoteNode,
  CheckboxNode,
  CodeBlockNode,
  DefinitionListNode,
  EmojiNode,
  FootnoteNode,
  FootnoteReferenceNode,
  HardBreakNode,
  HeadingNode,
  HighlightNode,
  ImageNode,
  InlineCodeNode,
  PreCodeNode,
  InsertNode,
  LinkNode,
  ListItemNode,
  ListNode,
  MathBlockNode,
  MathInlineNode,
  MermaidBlockNode,
  ParagraphNode,
  StrikethroughNode,
  StrongNode,
  SubscriptNode,
  SuperscriptNode,
  TableNode,
  TextNode,
  ThematicBreakNode,
  ReferenceNode,
  MarkdownCodeBlockNode,
}

export const VueRendererMarkdown: Plugin = {
  install(app: App, options?: { getLanguageIcon?: LanguageIconResolver, mathOptions?: any }) {
    Object.entries(componentMap).forEach(([name, component]) => {
      app.component(name, component)
    })
    if (options?.getLanguageIcon)
      setLanguageIconResolver(options.getLanguageIcon)
    // optional global math options
    // avoid importing inside module scope to keep SSR safe
    if (options?.mathOptions)
      setDefaultMathOptions(options.mathOptions)
  },
}
