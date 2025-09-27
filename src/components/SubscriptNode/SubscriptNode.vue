<script setup lang="ts">
import { getCustomNodeComponents } from '../../utils/nodeComponents'
import EmojiNode from '../EmojiNode'
import EmphasisNode from '../EmphasisNode'
import FootnoteReferenceNode from '../FootnoteReferenceNode'
import HighlightNode from '../HighlightNode'
import InlineCodeNode from '../InlineCodeNode'
import InsertNode from '../InsertNode'
import LinkNode from '../LinkNode'
import MathInlineNode from '../MathInlineNode'
import ReferenceNode from '../ReferenceNode'
import StrikethroughNode from '../StrikethroughNode'
import StrongNode from '../StrongNode'
import SuperscriptNode from '../SuperscriptNode'
import TextNode from '../TextNode'

interface NodeChild {
  type: string
  raw: string
  [key: string]: unknown
}

defineProps<{
  node: {
    type: 'subscript'
    children: NodeChild[]
    raw: string
  }
}>()

const nodeComponents = {
  text: TextNode,
  inline_code: InlineCodeNode,
  link: LinkNode,
  strong: StrongNode,
  emphasis: EmphasisNode,
  footnote_reference: FootnoteReferenceNode,
  strikethrough: StrikethroughNode,
  highlight: HighlightNode,
  insert: InsertNode,
  superscript: SuperscriptNode,
  emoji: EmojiNode,
  math_inline: MathInlineNode,
  reference: ReferenceNode,
  // 添加其他内联元素组件
  ...(getCustomNodeComponents() || {}),
}
</script>

<template>
  <sub class="subscript-node">
    <component
      :is="nodeComponents[child.type]"
      v-for="(child, index) in node.children"
      :key="index"
      :node="child"
    />
  </sub>
</template>

<style scoped>
.subscript-node {
  font-size: 0.8em;
  vertical-align: sub;
}
</style>
