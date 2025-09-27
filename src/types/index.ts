export interface BaseNode {
  type: string
  raw: string
  loading?: boolean
  code?: string
  diff?: boolean
}

export interface TextNode extends BaseNode {
  type: 'text'
  content: string
}

export interface HeadingNode extends BaseNode {
  type: 'heading'
  level: number
  text: string
  children: ParsedNode[]
}

export interface ParagraphNode extends BaseNode {
  type: 'paragraph'
  children: ParsedNode[]
}

export interface ListNode extends BaseNode {
  type: 'list'
  ordered: boolean
  // Optional start index for ordered lists (HTML <ol start="N">)
  start?: number
  items: ListItemNode[]
}

export interface ListItemNode extends BaseNode {
  type: 'list_item'
  children: ParsedNode[]
}

export interface CodeBlockNode extends BaseNode {
  type: 'code_block'
  language: string
  code: string
  // Optional: source line range [start, end) from markdown-it token.map
  startLine?: number
  endLine?: number
  // Whether this block is still incomplete (e.g., missing closing fence)
  loading?: boolean
  // Whether this code block represents a diff
  diff?: boolean
  // If diff is true, original and updated code versions
  originalCode?: string
  updatedCode?: string
  raw: string
}

export interface InlineCodeNode extends BaseNode {
  type: 'inline_code'
  code: string
}

export interface LinkNode extends BaseNode {
  type: 'link'
  href: string
  title: string | null
  text: string
  children: ParsedNode[]
}

export interface ImageNode extends BaseNode {
  type: 'image'
  src: string
  alt: string
  title: string | null
}

export interface ThematicBreakNode extends BaseNode {
  type: 'thematic_break'
}

export interface MermaidBlockNode {
  node: {
    type: 'code_block'
    language: string
    code: string
    loading?: boolean
  }
}

export type MarkdownRender
  = | {
    content: string
    nodes?: undefined
  }
  | {
    content?: undefined
    nodes: BaseNode[]
  }
export interface BlockquoteNode extends BaseNode {
  type: 'blockquote'
  children: ParsedNode[]
}

export interface TableNode extends BaseNode {
  type: 'table'
  header: TableRowNode
  rows: TableRowNode[]
}

export interface TableRowNode extends BaseNode {
  type: 'table_row'
  cells: TableCellNode[]
}

export interface TableCellNode extends BaseNode {
  type: 'table_cell'
  header: boolean
  children: ParsedNode[]
}

export interface DefinitionListNode extends BaseNode {
  type: 'definition_list'
  items: DefinitionItemNode[]
}

export interface DefinitionItemNode extends BaseNode {
  type: 'definition_item'
  term: ParsedNode[]
  definition: ParsedNode[]
}

export interface FootnoteNode extends BaseNode {
  type: 'footnote'
  id: string
  children: ParsedNode[]
}

export interface FootnoteReferenceNode extends BaseNode {
  type: 'footnote_reference'
  id: string
}

export interface AdmonitionNode extends BaseNode {
  type: 'admonition'
  kind: string // 'note' | 'warning' | 'danger' | 'info' | 'tip' 等
  title: string
  children: ParsedNode[]
}

export interface StrongNode extends BaseNode {
  type: 'strong'
  children: ParsedNode[]
}

export interface EmphasisNode extends BaseNode {
  type: 'emphasis'
  children: ParsedNode[]
}

export interface StrikethroughNode extends BaseNode {
  type: 'strikethrough'
  children: ParsedNode[]
}

export interface HighlightNode extends BaseNode {
  type: 'highlight'
  children: ParsedNode[]
}

export interface InsertNode extends BaseNode {
  type: 'insert'
  children: ParsedNode[]
}

export interface SubscriptNode extends BaseNode {
  type: 'subscript'
  children: ParsedNode[]
}

export interface SuperscriptNode extends BaseNode {
  type: 'superscript'
  children: ParsedNode[]
}

export interface CheckboxNode extends BaseNode {
  type: 'checkbox'
  checked: boolean
}

export interface EmojiNode extends BaseNode {
  type: 'emoji'
  name: string
}

export interface HardBreakNode extends BaseNode {
  type: 'hardbreak'
}

export interface MathInlineNode extends BaseNode {
  type: 'math_inline'
  content: string
}

export interface MathBlockNode extends BaseNode {
  type: 'math_block'
  content: string
}

export interface ReferenceNode extends BaseNode {
  type: 'reference'
  id: string
}

// Define markdown-it token type
export interface MarkdownToken {
  type: string
  tag?: string
  content?: string
  info?: string
  children?: MarkdownToken[]
  attrs?: [string, string][]
  markup?: string
  meta?: any
  map?: [number, number]
}

export type ParsedNode
  = | TextNode
    | HeadingNode
    | ParagraphNode
    | ListNode
    | ListItemNode
    | CodeBlockNode
    | InlineCodeNode
    | LinkNode
    | ImageNode
    | ThematicBreakNode
    | BlockquoteNode
    | TableNode
    | TableRowNode
    | TableCellNode
    | StrongNode
    | EmphasisNode
    | StrikethroughNode
    | HighlightNode
    | InsertNode
    | SubscriptNode
    | SuperscriptNode
    | CheckboxNode
    | EmojiNode
    | DefinitionListNode
    | DefinitionItemNode
    | FootnoteNode
    | FootnoteReferenceNode
    | AdmonitionNode
    | HardBreakNode
    | MathInlineNode
    | MathBlockNode
    | ReferenceNode

export interface CustomComponents {
  text: any
  paragraph: any
  heading: any
  code_block: any
  list: any
  blockquote: any
  table: any
  definition_list: any
  footnote: any
  footnote_reference: any
  admonition: any
  hardbreak: any
  link: any
  image: any
  thematic_break: any
  math_inline: any
  math_block: any
  strong: any
  emphasis: any
  strikethrough: any
  highlight: any
  insert: any
  subscript: any
  superscript: any
  emoji: any
  checkbox: any
  inline_code: any
  reference: any
  [key: string]: any
}
