<script setup lang="ts">
import type { BaseNode, ParsedNode, ParseOptions } from 'stream-markdown-parser'
import { computed, defineAsyncComponent, ref } from 'vue'
import { getMarkdown, parseMarkdownToStructure } from '../../../packages/markdown-parser'
import AdmonitionNode from '../../components/AdmonitionNode'
import BlockquoteNode from '../../components/BlockquoteNode'
import CheckboxNode from '../../components/CheckboxNode'
import DefinitionListNode from '../../components/DefinitionListNode'
import EmojiNode from '../../components/EmojiNode'
import EmphasisNode from '../../components/EmphasisNode'
import FootnoteNode from '../../components/FootnoteNode'
import FootnoteReferenceNode from '../../components/FootnoteReferenceNode'
import HardBreakNode from '../../components/HardBreakNode'
import HeadingNode from '../../components/HeadingNode'
import HighlightNode from '../../components/HighlightNode'
import ImageNode from '../../components/ImageNode'
import InlineCodeNode from '../../components/InlineCodeNode'
import InsertNode from '../../components/InsertNode'
import LinkNode from '../../components/LinkNode'
import ListNode from '../../components/ListNode'
import MermaidBlockNode from '../../components/MermaidBlockNode'
import ParagraphNode from '../../components/ParagraphNode'
import PreCodeNode from '../../components/PreCodeNode'
import ReferenceNode from '../../components/ReferenceNode'

import StrikethroughNode from '../../components/StrikethroughNode'
import StrongNode from '../../components/StrongNode'
import SubscriptNode from '../../components/SubscriptNode'
import SuperscriptNode from '../../components/SuperscriptNode'
import TableNode from '../../components/TableNode'
import TextNode from '../../components/TextNode'
import ThematicBreakNode from '../../components/ThematicBreakNode'
import { provideViewportPriority } from '../../composables/viewportPriority'
import { getCustomNodeComponents } from '../../utils/nodeComponents'
import { MathBlockNodeAsync, MathInlineNodeAsync } from './asyncComponent'
import FallbackComponent from './FallbackComponent.vue'

// 组件接收的 props
// 增加用于统一设置所有 code_block 主题和 Monaco 选项的外部 API
const props = withDefaults(defineProps<
  | {
    content: string
    nodes?: undefined
    /** Options forwarded to parseMarkdownToStructure when content is provided */
    parseOptions?: ParseOptions
    /** Enable priority rendering for visible viewport area */
    viewportPriority?: boolean
    /**
     * Whether code_block renders should stream updates.
     * When false, code blocks stay in a loading state and render once when final content is ready.
     * Default: true
     */
    codeBlockStream?: boolean
    // 全局传递到每个 CodeBlockNode 的主题（monaco theme 对象）
    codeBlockDarkTheme?: any
    codeBlockLightTheme?: any
    // 传递给 CodeBlockNode 的 monacoOptions（比如 fontSize, MAX_HEIGHT 等）
    codeBlockMonacoOptions?: Record<string, any>
    /** If true, render all `code_block` nodes as plain <pre><code> blocks instead of the full CodeBlockNode */
    renderCodeBlocksAsPre?: boolean
    /** Minimum width forwarded to CodeBlockNode (px or CSS unit) */
    codeBlockMinWidth?: string | number
    /** Maximum width forwarded to CodeBlockNode (px or CSS unit) */
    codeBlockMaxWidth?: string | number
    /** Arbitrary props to forward to every CodeBlockNode */
    codeBlockProps?: Record<string, any>
    themes?: string[]
    isDark?: boolean
    customId?: string
    indexKey?: number | string
  }
  | {
    content?: undefined
    nodes: BaseNode[]
    parseOptions?: ParseOptions
    /** Enable priority rendering for visible viewport area */
    viewportPriority?: boolean
    /**
     * Whether code_block renders should stream updates.
     * When false, code blocks stay in a loading state and render once when final content is ready.
     * Default: true
     */
    codeBlockStream?: boolean
    codeBlockDarkTheme?: any
    codeBlockLightTheme?: any
    codeBlockMonacoOptions?: Record<string, any>
    /** If true, render all `code_block` nodes as plain <pre><code> blocks instead of the full CodeBlockNode */
    renderCodeBlocksAsPre?: boolean
    /** Minimum width forwarded to CodeBlockNode (px or CSS unit) */
    codeBlockMinWidth?: string | number
    /** Maximum width forwarded to CodeBlockNode (px or CSS unit) */
    codeBlockMaxWidth?: string | number
    /** Arbitrary props to forward to every CodeBlockNode */
    codeBlockProps?: Record<string, any>
    themes?: string[]
    isDark?: boolean
    customId?: string
    indexKey?: number | string
  }
>(), { codeBlockStream: true })

// 定义事件
defineEmits(['copy', 'handleArtifactClick', 'click', 'mouseover', 'mouseout'])
const md = getMarkdown()
const containerRef = ref<HTMLElement>()
// Provide viewport-priority registrar so heavy nodes can defer work until visible
const viewportPriorityEnabled = ref(props.viewportPriority !== false)
provideViewportPriority(() => containerRef.value, viewportPriorityEnabled)
const parsedNodes = computed<ParsedNode[]>(() => {
  // 解析 content 字符串为节点数组
  if (props.nodes?.length)
    return props.nodes as unknown as ParsedNode[]
  if (props.content)
    return parseMarkdownToStructure(props.content, md, props.parseOptions)
  return []
})

// 异步按需加载 CodeBlock 组件；失败时退回为 InlineCodeNode（内联代码渲染）
const CodeBlockNodeAsync = defineAsyncComponent(async () => {
  try {
    const mod = await import('../../components/CodeBlockNode')
    return mod.default
  }
  catch (e) {
    console.warn(
      '[vue-markdown-render] Optional peer dependencies for CodeBlockNode are missing. Falling back to inline-code rendering (no Monaco). To enable full code block features, please install "stream-monaco".',
      e,
    )
    return PreCodeNode
  }
})

// 组件映射表
const nodeComponents = {
  text: TextNode,
  paragraph: ParagraphNode,
  heading: HeadingNode,
  code_block: props.renderCodeBlocksAsPre ? PreCodeNode : CodeBlockNodeAsync,
  list: ListNode,
  blockquote: BlockquoteNode,
  table: TableNode,
  definition_list: DefinitionListNode,
  footnote: FootnoteNode,
  footnote_reference: FootnoteReferenceNode,
  admonition: AdmonitionNode,
  hardbreak: HardBreakNode,
  link: LinkNode,
  image: ImageNode,
  thematic_break: ThematicBreakNode,
  math_inline: MathInlineNodeAsync,
  math_block: MathBlockNodeAsync,
  strong: StrongNode,
  emphasis: EmphasisNode,
  strikethrough: StrikethroughNode,
  highlight: HighlightNode,
  insert: InsertNode,
  subscript: SubscriptNode,
  superscript: SuperscriptNode,
  emoji: EmojiNode,
  checkbox: CheckboxNode,
  checkbox_input: CheckboxNode,
  inline_code: InlineCodeNode,
  reference: ReferenceNode,
  // 可以添加更多节点类型
  // 例如:custom_node: CustomNode,
  ...getCustomNodeComponents(props.customId),
}

// Decide which component to use for a given node. Ensure that code blocks
// with language `mermaid` are rendered with `MermaidBlockNode` (unless a
// custom component named `mermaid` is registered for the given customId).
function getNodeComponent(node: ParsedNode) {
  if (!node)
    return FallbackComponent
  if (node.type === 'code_block') {
    const lang = String((node as any).language ?? '').trim().toLowerCase()
    if (lang === 'mermaid') {
      const custom = getCustomNodeComponents(props.customId).mermaid
      return (custom as any) || MermaidBlockNode
    }
    return nodeComponents.code_block
  }
  return (nodeComponents as any)[String((node as any).type)] || FallbackComponent
}

function getBindingsFor(node: ParsedNode) {
  // For mermaid blocks we don't forward CodeBlock-specific props
  if (node?.type === 'code_block' && String((node as any).language ?? '').trim().toLowerCase() === 'mermaid')
    return {}

  return node.type === 'code_block'
    ? {
        // streaming behavior control for CodeBlockNode
        stream: props.codeBlockStream,
        darkTheme: props.codeBlockDarkTheme,
        lightTheme: props.codeBlockLightTheme,
        monacoOptions: props.codeBlockMonacoOptions,
        themes: props.themes,
        minWidth: props.codeBlockMinWidth,
        maxWidth: props.codeBlockMaxWidth,
        ...(props.codeBlockProps || {}),
      }
    : {}
}
</script>

<template>
  <div ref="containerRef" class="markdown-renderer">
    <div>
      <template v-for="(node, index) in parsedNodes" :key="index">
        <!-- Skip wrapping code_block nodes in transitions to avoid touching Monaco editor internals -->
        <transition
          v-if="node.type !== 'code_block'"
          name="typewriter"
          appear
        >
          <component
            :is="getNodeComponent(node)"
            :node="node"
            :loading="node.loading"
            :index-key="`${indexKey || 'markdown-renderer'}-${index}`"
            v-bind="getBindingsFor(node)"
            :custom-id="props.customId"
            :is-dark="props.isDark"
            @copy="$emit('copy', $event)"
            @handle-artifact-click="$emit('handleArtifactClick', $event)"
            @click="$emit('click', $event)"
            @mouseover="$emit('mouseover', $event)"
            @mouseout="$emit('mouseout', $event)"
          />
        </transition>

        <component
          :is="getNodeComponent(node)"
          v-else
          :node="node"
          :loading="node.loading"
          :index-key="`${indexKey || 'markdown-renderer'}-${index}`"
          v-bind="getBindingsFor(node)"
          :custom-id="props.customId"
          :is-dark="props.isDark"
          @copy="$emit('copy', $event)"
          @handle-artifact-click="$emit('handleArtifactClick', $event)"
          @click="$emit('click', $event)"
          @mouseover="$emit('mouseover', $event)"
          @mouseout="$emit('mouseout', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.markdown-renderer {
  position: relative;
  /* 防止内容更新时的布局抖动 */
  contain: layout;
   /* 优化不可见时的渲染成本 */
  content-visibility: auto;
  contain-intrinsic-size: 800px 600px;
}

.unknown-node {
  color: #6a737d;
  font-style: italic;
  margin: 1rem 0;
}
</style>

<style>
/* Global (unscoped) CSS for TransitionGroup enter animations */
.typewriter-enter-from {
  opacity: 0;
}
.typewriter-enter-active {
  transition: opacity var(--typewriter-fade-duration, 900ms)
    var(--typewriter-fade-ease, ease-out);
  will-change: opacity;
}
.typewriter-enter-to {
  opacity: 1;
}
</style>
