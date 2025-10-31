<script setup lang="ts">
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { onMounted, ref } from 'vue'
import { getUseMonaco } from '../../../src/components/CodeBlockNode/monaco'
import MarkdownRender from '../../../src/components/NodeRenderer'
import KatexWorker from '../../../src/workers/katexRenderer.worker?worker&inline'
import { setKaTeXWorker } from '../../../src/workers/katexWorkerClient'
import MermaidWorker from '../../../src/workers/mermaidParser.worker?worker&inline'
import { setMermaidWorker } from '../../../src/workers/mermaidWorkerClient'
import 'katex/dist/katex.min.css'

// 用户输入（直接作为 preview 的内容）
const input = ref<string>(`# Hello

这是一个测试页面。左侧编辑输入，右侧实时预览渲染结果。

示例包含：

  - **加粗**、*斜体*、` + '`inline code`' + `
- 代码块：

\`\`\`js
console.log('hello')
\`\`\`

数学：$$E=mc^2$$
Mermaid 示例：

\`\`\`mermaid
graph TD
  A-->B
\`\`\`
`)

// 预加载 Monaco 编辑器和 worker
getUseMonaco()
setKaTeXWorker(new KatexWorker())
setMermaidWorker(new MermaidWorker())

// 分享链接相关
const shareUrl = ref<string>('')
const tooLong = ref(false)
const notice = ref<string>('')
const noticeType = ref<'success' | 'error' | 'info'>('success')
const isWorking = ref(false)
const isCopied = ref(false)
const issueUrl = ref<string>('')
const MAX_URL_LEN = 2000 // warning threshold — browsers/servers differ; adjust as needed

// Use lz-string to compress to a URL-safe encoded component
function encodeForUrl(str: string) {
  try {
    return compressToEncodedURIComponent(str)
  }
  catch {
    return ''
  }
}

function decodeFromUrl(s: string) {
  try {
    return decompressFromEncodedURIComponent(s) || ''
  }
  catch {
    return ''
  }
}

function generateShareLink() {
  const data = encodeForUrl(input.value)
  if (!data)
    return
  const url = new URL(window.location.href)
  url.hash = `data=${data}`
  const full = url.toString()
  console.log(full.length)
  if (full.length > MAX_URL_LEN) {
    // mark as too long, do not place the huge URL in address bar
    tooLong.value = true
    shareUrl.value = ''
    // prepare an issue URL so user can open it directly
    issueUrl.value = buildIssueUrl(input.value)
    showToast('内容过长，无法嵌入到 URL。你可以打开 Issue 并提交。', 'info', 5000)
    return
  }
  tooLong.value = false
  shareUrl.value = full
  window.history.replaceState(undefined, '', full)
}

function buildIssueUrl(text: string) {
  const base = 'https://github.com/Simon-He95/vue-markdown-renderer/issues/new?template=bug_report.yml'
  const body = `**Reproduction input**:\n\nPlease find the reproduction input below:\n\n\`\`\`markdown\n${text}\n\`\`\``
  return `${base}&body=${encodeURIComponent(body)}`
}

async function copyShareLink() {
  const u = shareUrl.value || window.location.href
  try {
    await navigator.clipboard.writeText(u)
    return true
  }
  catch (e) {
    console.warn('copy failed', e)
    return false
  }
}

function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success', duration = 2000) {
  notice.value = msg
  noticeType.value = type
  if (duration > 0)
    setTimeout(() => (notice.value = ''), duration)
}

async function generateAndCopy() {
  // generate share URL then copy it
  isWorking.value = true
  isCopied.value = false
  generateShareLink()
  if (tooLong.value) {
    isWorking.value = false
    return
  }
  const ok = await copyShareLink()
  isWorking.value = false
  if (ok) {
    isCopied.value = true
    showToast('已复制链接到剪贴板', 'success', 2000)
    setTimeout(() => (isCopied.value = false), 2000)
  }
  else {
    showToast('复制链接失败，请手动复制或在 HTTPS/localhost 下重试', 'error', 4000)
  }
}

async function copyRawInput() {
  try {
    const url = buildIssueUrl(input.value)
    issueUrl.value = url
    await navigator.clipboard.writeText(url)
    showToast('已复制 issue 链接到剪贴板，打开链接并提交即可。', 'success', 3500)
  }
  catch (e) {
    console.warn('copy failed', e)
    showToast('复制失败，请手动选中并复制输入内容。', 'error', 3500)
  }
}

function openIssueInNewTab() {
  if (!issueUrl.value)
    issueUrl.value = buildIssueUrl(input.value)
  try {
    window.open(issueUrl.value, '_blank')
  }
  catch {
    // fallback: set location
    window.location.href = issueUrl.value
  }
}

function restoreFromUrl() {
  try {
    const hash = window.location.hash || ''
    if (!hash)
      return
    const m = hash.match(/data=([^&]+)/)
    if (m && m[1]) {
      const decoded = decodeFromUrl(m[1])
      if (decoded)
        input.value = decoded
    }
  }
  catch {
    // ignore
  }
}

onMounted(() => {
  restoreFromUrl()
  shareUrl.value = window.location.href
})
</script>

<template>
  <div class="p-4 app-container h-full bg-gray-50 dark:bg-gray-900">
    <div class="max-w-6xl mx-auto">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          Markdown 输入 & 实时渲染
        </h2>
        <div class="text-sm text-gray-500 flex items-center gap-3">
          <span>左侧输入，右侧预览</span>
          <button :disabled="isWorking" class="px-2 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-2" @click="generateAndCopy">
            生成并复制分享链接
          </button>
          <button class="bg-green-600 text-white rounded px-2 py-1 text-sm" @click="openIssueInNewTab">
            打开 Issue
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">输入</label>
          <textarea v-model="input" rows="18" class="w-full p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none" />
        </div>

        <div>
          <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">预览</label>
          <div class="prose max-w-none p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[14rem] overflow-auto">
            <MarkdownRender :content="input" />
          </div>
          <div class="mt-2 text-xs text-gray-500 break-words">
            <template v-if="tooLong">
              <div class="mb-2 p-2 rounded bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                内容过长，无法嵌入到 URL。建议在 issue 中粘贴完整输入以便分享。
              </div>
              <div class="flex gap-2 items-center">
                <button class="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-sm rounded" @click="copyRawInput">
                  复制 Issue 链接
                </button>
                <button class="px-2 py-1 bg-blue-600 text-white text-sm rounded" @click="openIssueInNewTab">
                  打开 Issue
                </button>
                <span class="text-xs text-gray-500">或手动将输入粘贴到 GitHub Issue 中。</span>
              </div>
            </template>
          </div>
          <div v-if="notice" class="mt-2">
            <div class="p-2 rounded" :class="[noticeType === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' : (noticeType === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200')]">
              {{ notice }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  transition: background-color 0.3s ease;
  overflow: hidden;
}

.chatbot-container {
  transition: all 0.3s ease;
  overscroll-behavior: contain;
  height: calc(var(--app-viewport-vh, 1vh) * 100 - 2rem);
  max-height: calc(var(--app-viewport-vh, 1vh) * 100 - 2rem);
}

.github-star-btn:active {
  transform: scale(0.95);
}

.chatbot-messages {
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

.chatbot-messages::-webkit-scrollbar {
  width: 8px;
}

.chatbot-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chatbot-messages::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.dark .chatbot-messages::-webkit-scrollbar-thumb {
  background: #475569;
}

.chatbot-messages::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.dark .chatbot-messages::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.settings-toggle {
  backdrop-filter: blur(8px);
}

.settings-toggle:active {
  transform: scale(0.95);
}

/* 主题选择器自定义样式 */
.theme-selector select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.theme-selector select option {
  padding: 8px 12px;
  background-color: white;
  color: #374151;
}

.dark .theme-selector select option {
  background-color: #1f2937;
  color: #f3f4f6;
}

/* 设置面板动画 */
.settings-panel {
  transform-origin: top right;
}

/* 代码块加载时的流光闪烁效果 */
:deep(.code-block-container.is-rendering) {
  position: relative;
  animation: renderingGlow 2s ease-in-out infinite;
}

@keyframes renderingGlow {
  0% {
    box-shadow:
      0 0 10px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.2);
  }
  25% {
    box-shadow:
      0 0 15px rgba(139, 92, 246, 0.5),
      0 0 30px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow:
      0 0 20px rgba(236, 72, 153, 0.5),
      0 0 40px rgba(236, 72, 153, 0.3);
  }
  75% {
    box-shadow:
      0 0 15px rgba(16, 185, 129, 0.5),
      0 0 30px rgba(16, 185, 129, 0.3);
  }
  100% {
    box-shadow:
      0 0 10px rgba(59, 130, 246, 0.4),
      0 0 20px rgba(59, 130, 246, 0.2);
  }
}

/* Mermaid 块加载时的流光闪烁效果 */
:deep(.is-rendering) {
  position: relative;
  animation: renderingGlow 2s ease-in-out infinite;
}
</style>
