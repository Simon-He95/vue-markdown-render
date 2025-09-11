export // 模拟流式传输
const streamContent = `I'll create a simple Electron + Vue chat application demo. Here's the structure:

::: warning
这是一个警告块。
:::

::: tip 提示标题
这是带标题的提示。
:::

::: admonition 自定义块
任意内容。
:::

مرحبا بكم في عالم اللغة العربية!
1. First, let's set up the project:

\`\`\`shellscript
# Create Vue project
npm create vue@latest electron-vue-chat

# Navigate to project
cd electron-vue-chat

# Install dependencies
npm install
npm install electron electron-builder vue-router

# Install dev dependencies
npm install -D electron-dev-server concurrently wait-on
\`\`\`

2. Create the main Electron file:

\`\`\`javascript:electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const url = isDev
    ? 'http://localhost:5173'
    : \`file://\${path.join(__dirname, '../dist/index.html')}\`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
\`\`\`

3. Update package.json:

\`\`\`json:package.json
{
  "name": "electron-vue-chat",
  "version": "0.1.0",
  "private": true,
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron:dev": "concurrently \\"npm run dev\\" \\"wait-on http://localhost:5173 && electron .\\"",
    "electron:build": "vite build && electron-builder"
  },
  "dependencies": {
    "vue": "^3.3.4",
    "vue-router": "^4.2.4",
    "electron": "^25.3.1",
    "electron-builder": "^24.4.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.2.3",
    "concurrently": "^8.2.0",
    "electron-dev-server": "^1.0.0",
    "vite": "^4.4.6",
    "wait-on": "^7.0.1"
  }
}
\`\`\`

4. Create chat components:

\`\`\`vue:src/components/ChatSidebar.vue
<template>
  <div class="chat-sidebar">
    <div class="sidebar-header">
      <h3>Contacts</h3>
    </div>
    <div class="contact-list">
      <div
        v-for="contact in contacts"
        :key="contact.id"
        @click="selectContact(contact)"
        :class="['contact-item', selectedContact?.id === contact.id ? 'active' : '']">
        <div class="avatar">{{ contact.name.charAt(0) }}</div>
        <div class="contact-info">
          <div class="name">{{ contact.name }}</div>
          <div class="last-message">{{ contact.lastMessage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';

const emit = defineEmits(['select-contact']);

const contacts = ref([
  { id: 1, name: 'Alice', lastMessage: 'Hey, how are you?' },
  { id: 2, name: 'Bob', lastMessage: 'Let\\'s meet tomorrow' },
  { id: 3, name: 'Charlie', lastMessage: 'Did you see that?' }
]);

const selectedContact = ref(null);

function selectContact(contact) {
  selectedContact.value = contact;
  emit('select-contact', contact);
}
<\/script>

<style scoped>
.chat-sidebar {
  width: 280px;
  border-right: 1px solid #e0e0e0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.contact-list {
  overflow-y: auto;
  flex-grow: 1;
}

.contact-item {
  padding: 12px 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.contact-item:hover {
  background-color: #f5f5f5;
}

.contact-item.active {
  background-color: #e1f5fe;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #2196f3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-weight: bold;
}

.contact-info {
  flex-grow: 1;
}

.name {
  font-weight: bold;
}

.last-message {
  font-size: 0.8em;
  color: #757575;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
\`\`\`

\`\`\`vue:src/components/ChatWindow.vue
<template>
  <div class="chat-window">
    <div class="chat-header" v-if="contact">
      <h3>{{ contact.name }}</h3>
    </div>
    <div class="messages-container" ref="messagesContainer">
      <div v-if="!contact" class="no-contact">
        Select a contact to start chatting
      </div>
      <template v-else>
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.sender === 'me' ? 'sent' : 'received']">
          {{ message.text }}
          <div class="message-time">{{ message.time }}</div>
        </div>
      </template>
    </div>
    <div class="message-input" v-if="contact">
      <input
        type="text"
        v-model="newMessage"
        @keyup.enter="sendMessage"
        placeholder="Type a message..." />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  contact: Object
});

const messages = ref([]);
const newMessage = ref('');
const messagesContainer = ref(null);

// Mock message history for each contact
const messageHistory = {
  1: [
    { sender: 'other', text: 'Hi there!', time: '10:00 AM' },
    { sender: 'me', text: 'Hello Alice!', time: '10:01 AM' },
    { sender: 'other', text: 'How are you doing?', time: '10:02 AM' }
  ],
  2: [
    { sender: 'other', text: 'Are we still on for tomorrow?', time: '9:30 AM' },
    { sender: 'me', text: 'Yes, what time?', time: '9:35 AM' }
  ],
  3: [
    { sender: 'me', text: 'Did you watch the game last night?', time: '8:45 PM' },
    { sender: 'other', text: 'Yes! It was amazing!', time: '9:00 PM' }
  ]
};

watch(() => props.contact, (newContact) => {
  if (newContact) {
    messages.value = messageHistory[newContact.id] || [];
    scrollToBottom();
  }
});

function sendMessage() {
  if (!newMessage.value.trim()) return;

  const now = new Date();
  const time = now.getHours() + ':' + now.getMinutes().toString().padStart(2, '0');

  messages.value.push({
    sender: 'me',
    text: newMessage.value,
    time
  });

  newMessage.value = '';

  // Mock reply
  setTimeout(() => {
    messages.value.push({
      sender: 'other',
      text: 'This is a demo auto-reply',
      time: now.getHours() + ':' + (now.getMinutes() + 1).toString().padStart(2, '0')
    });
    scrollToBottom();
  }, 1000);

  scrollToBottom();
}

// 顶层 RAF + 阻尼平滑滚动实现，放在顶层以供全文件复用
function _smoothScrollToBottom(el: HTMLElement, timeout = 800) {
  // 如果用户偏好减少动画，则直接跳到底部
  try {
    if (window && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.scrollTop = el.scrollHeight
      return Promise.resolve()
    }
  } catch (e) {
    // ignore
  }

  return new Promise<void>((resolve) => {
    let rafId: number | null = null
    let finished = false
    let startTime = performance.now()
    let canceled = false

    const cancelHandlers: Array<() => void> = []

    const onUserInteract = () => {
      canceled = true
      cleanup()
      resolve()
    }

    // 如果发生滚动/触摸/键盘等交互，取消动画
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    for (const ev of events) {
      const h = onUserInteract
      document.addEventListener(ev, h, { passive: true })
      cancelHandlers.push(() => document.removeEventListener(ev, h))
    }

    const cleanup = () => {
      if (finished) return
      finished = true
      if (rafId != null) cancelAnimationFrame(rafId)
      for (const r of cancelHandlers) r()
    }

    // 缓动函数（easeOutCubic）
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    // 根据距离动态计算时长（短距离更快，长距离更慢），并受 timeout 上限限制
    const initialTarget = Math.max(0, el.scrollHeight - el.clientHeight)
    const initialDistance = Math.abs((el.scrollTop || 0) - initialTarget)
    const viewport = el.clientHeight || 1
    const base = 320 // 基础时长参考（ms）
    const duration = Math.max(120, Math.min(timeout, Math.round(base * (initialDistance / viewport + 0.2))))

    const tick = (ts: number) => {
      if (canceled) return
      rafId = requestAnimationFrame(tick)

      const now = ts
      const elapsed = Math.max(0, now - startTime)
      const progress = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(progress)

      const current = el.scrollTop
      const target = Math.max(0, el.scrollHeight - el.clientHeight)

      // 计算插值：先把整体进度转为一个靠近目标的系数，然后以该系数移动当前值，允许目标在期间变化
      const approach = 0.15 + 0.85 * eased
      const next = current + (target - current) * approach
      el.scrollTop = next

      // 结束条件：已经非常接近目标或进度完成并到达容忍范围
      if (Math.abs(target - next) <= 0.5 || (progress >= 1 && Math.abs(target - next) <= 2)) {
        cleanup()
        el.scrollTop = target
        resolve()
        return
      }

      // 兜底最大超时
      if (elapsed >= timeout) {
        cleanup()
        el.scrollTop = target
        resolve()
        return
      }
    }

    // 启动动画
    startTime = performance.now()
    rafId = requestAnimationFrame(tick)
  })
}

// 导出给外部使用的封装函数（保持原名）
function smoothScrollToBottom(el: HTMLElement, timeout = 800) {
  return _smoothScrollToBottom(el, timeout)
}

function scrollToBottom() {
  const el = (typeof scrollTarget !== 'undefined' && scrollTarget?.value) || mainRef.value
  if (!el) return
  // fire and forget
  void smoothScrollToBottom(el)
}
<\/script>

<style scoped>
.chat-window {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
}

.no-contact {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #757575;
}

.message {
  max-width: 70%;
  padding: 10px 15px;
  border-radius: 18px;
  margin-bottom: 10px;
  position: relative;
}

.message.sent {
  align-self: flex-end;
  background-color: #dcf8c6;
}

.message.received {
  align-self: flex-start;
  background-color: #f1f0f0;
}

.message-time {
  font-size: 0.7em;
  color: #757575;
  text-align: right;
  margin-top: 5px;
}

.message-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #e0e0e0;
}

.message-input input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  margin-right: 10px;
}

.message-input button {
  padding: 0 15px;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}
</style>
\`\`\`

5. Create the main chat view:

\`\`\`vue:src/views/ChatView.vue
<template>
  <div class="chat-container">
    <ChatSidebar @select-contact="setCurrentContact" />
    <ChatWindow :contact="currentContact" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ChatSidebar from '../components/ChatSidebar.vue';
import ChatWindow from '../components/ChatWindow.vue';

const currentContact = ref(null);

function setCurrentContact(contact) {
  currentContact.value = contact;
}
<\/script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  width: 100%;
}
<\/style>
\`\`\`

6. Update the main App.vue:

\`\`\`vue:src/App.vue
<template>
  <router-view />
<\/template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}
</style>
\`\`\`

7. Set up the router:

\`\`\`javascript:src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    name: 'chat',
    component: ChatView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
\`\`\`

8. Update main.js:

\`\`\`javascript:src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
\`\`\`

To run the application:

\`\`\`bash
npm run electron:dev
\`\`\`

This creates a simple chat application with a contacts sidebar and a chat window. Users can select contacts and send messages, with auto-replies simulated.


9. 付费转化率计算验证:
1. **公式**
   \[
   \text{付费转化率} = \\left( \\frac{\text{付费用户数}}{\text{月活用户数}} \\right) \times 100\%
   \]

2. **代入数据**
   \[
   \\frac{363}{15,\!135} \times 100\% = 2.398\%
   \]

3. **计算工具验证**
   通过数学计算工具确认结果：
   \`363 ÷ 15,135 × 100 = 2.39841427...\`

4. **差异说明**
   $$E=mc^2$$

10. Merimaid graphic:

\`\`\`mermaid
graph TD
    Kira_Yamato[基拉·大和]
    Lacus_Clyne[拉克丝·克莱因]
    Athrun_Zala[阿斯兰·萨拉]
    Cagalli_Yula_Athha[卡嘉莉·尤拉·阿斯哈]
    Shinn_Asuka[真·飞鸟]
    Lunamaria_Hawke[露娜玛丽亚·霍克]
    COMPASS[世界和平监视组织COMPASS]
    Foundation[芬德申王国]
    Orphee_Lam_Tao[奥尔菲·拉姆·陶]
    %% 节点定义结束，开始定义边
    Kira_Yamato ---|恋人| Lacus_Clyne
    Kira_Yamato ---|挚友| Athrun_Zala
    Kira_Yamato -->|隶属| COMPASS
    Kira_Yamato -->|前辈| Shinn_Asuka
    Lacus_Clyne -->|初代总裁| COMPASS
    Athrun_Zala ---|恋人| Cagalli_Yula_Athha
    Athrun_Zala -.->|协力| COMPASS
    Shinn_Asuka ---|恋人| Lunamaria_Hawke
    Shinn_Asuka -->|隶属| COMPASS
    Lunamaria_Hawke -->|隶属| COMPASS
    COMPASS -->|对立| Foundation
    Orphee_Lam_Tao -->|隶属| Foundation
    Orphee_Lam_Tao -.->|追求| Lacus_Clyne
\`\`\`

`
