<script setup lang="ts">
import MarkdownRender from '../../src/components/NodeRenderer'
import { streamContent } from './const/markdown'

// 每隔 10 毫秒输出一部分内容
const content = ref('')
useInterval(10, {
  callback() {
    if (content.value.length < streamContent.length) {
      content.value += streamContent.slice(
        content.value.length,
        content.value.length + 1,
      )
    }
  },
})

</script>

<template>
  <main p4 h-full flex flex-col-reverse overflow-auto>
    <div class="place-holder" flex-1></div>
    <MarkdownRender :content="content" :typewriter-effect="true" />
  </main>
</template>

<style scoped></style>
