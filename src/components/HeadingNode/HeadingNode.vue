<script setup lang="ts">
import { getCustomNodeComponents } from '../../utils/nodeComponents'
import CheckboxNode from '../CheckboxNode'
import EmojiNode from '../EmojiNode'
import EmphasisNode from '../EmphasisNode'
import FootnoteReferenceNode from '../FootnoteReferenceNode'
import HardBreakNode from '../HardBreakNode'
import HighlightNode from '../HighlightNode'
import ImageNode from '../ImageNode'
import InlineCodeNode from '../InlineCodeNode'
import InsertNode from '../InsertNode'
import LinkNode from '../LinkNode'
import MathInlineNode from '../MathInlineNode'
import ReferenceNode from '../ReferenceNode'
import StrikethroughNode from '../StrikethroughNode'
import StrongNode from '../StrongNode'
import SubscriptNode from '../SubscriptNode'
import SuperscriptNode from '../SuperscriptNode'
import TextNode from '../TextNode'

// Define the type for the node children
interface NodeChild {
  type: string
  raw: string
  [key: string]: unknown
}

defineProps<{
  node: {
    type: 'heading'
    level: number
    text: string
    children: NodeChild[]
    raw: string
  }
}>()

const nodeComponents = {
  text: TextNode,
  inline_code: InlineCodeNode,
  link: LinkNode,
  image: ImageNode,
  strong: StrongNode,
  emphasis: EmphasisNode,
  strikethrough: StrikethroughNode,
  highlight: HighlightNode,
  insert: InsertNode,
  subscript: SubscriptNode,
  superscript: SuperscriptNode,
  emoji: EmojiNode,
  checkbox: CheckboxNode,
  footnote_reference: FootnoteReferenceNode,
  hardbreak: HardBreakNode,
  math_inline: MathInlineNode,
  reference: ReferenceNode,
  // 添加其他内联元素组件
  ...(getCustomNodeComponents() || {}),
}
</script>

<template>
  <component
    :is="`h${node.level}`"
    class="heading-node"
    :class="[`heading-${node.level}`]"
    dir="auto"
  >
    <component
      :is="nodeComponents[child.type]"
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
    />
  </component>
</template>

<style scoped>
.heading-node {
  @apply font-medium leading-tight;
}

.heading-1 {
  @apply mt-6 mb-2 text-xl;
}

.heading-2 {
  @apply mt-5 mb-2 text-lg;
}

.heading-3 {
  @apply mt-4 mb-2 text-base;
}

.heading-4 {
  @apply mt-4 mb-2 text-base;
}

.heading-5 {
  @apply mt-3.5 mb-2 text-sm;
}

.heading-6 {
  @apply mt-3.5 mb-2 text-sm text-gray-600;
}
</style>
