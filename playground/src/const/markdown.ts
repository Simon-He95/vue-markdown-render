export // 模拟流式传输
const streamContent = `>>>I'll create a simple Electron + Vue chat application demo. Here's the structure:

[Star on GitHub](https://github.com/Simon-He95/vue-markdown-render)

![Vue Markdown Icon](/vue-markdown-icon.svg "Vue Markdown Icon")
好的，我将为您输出泰勒公式的一般形式及其常见展开式。

---

## 1. 泰勒公式（Taylor's Formula）

### 一般形式（在点 \\(x = a\\) 处展开）：
\\[
f(x) = f(a) + f'(a)(x-a) + \\frac{f''(a)}{2!}(x-a)^2 + \\frac{f'''(a)}{3!}(x-a)^3 + \\cdots + \\frac{f^{(n)}(a)}{n!}(x-a)^n + R_n(x)
\\]

其中：
- \\(f^{(k)}(a)\\) 是 \\(f(x)\\) 在 \\(x=a\\) 处的 \\(k\\) 阶导数
- \\(R_n(x)\\) 是余项，常见形式有拉格朗日余项：
\\[
R_n(x) = \\frac{f^{(n+1)}(\\xi)}{(n+1)!}(x-a)^{n+1}, \\quad \\xi \\text{ 在 } a \\text{ 和 } x \\text{ 之间}
\\]

---

## 2. 麦克劳林公式（Maclaurin's Formula，即 \\(a=0\\) 时的泰勒公式）：
\\[
f(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\frac{f'''(0)}{3!}x^3 + \\cdots + \\frac{f^{(n)}(0)}{n!}x^n + R_n(x)
\\]

---

## 3. 常见函数的麦克劳林展开（前几项）

- **指数函数**：
\\[
e^x = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots + \\frac{x^n}{n!} + \\cdots, \\quad x \\in \\mathbb{R}
\\]

- **正弦函数**：
\\[
\\sin x = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\frac{x^7}{7!} + \\cdots + (-1)^n \\frac{x^{2n+1}}{(2n+1)!} + \\cdots
\\]

- **余弦函数**：
\\[
\\cos x = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\frac{x^6}{6!} + \\cdots + (-1)^n \\frac{x^{2n}}{(2n)!} + \\cdots
\\]

- **自然对数**（在 \\(x=0\\) 附近）：
\\[
\\ln(1+x) = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\frac{x^4}{4} + \\cdots + (-1)^{n-1} \\frac{x^n}{n} + \\cdots, \\quad -1 < x \\le 1
\\]

- **二项式展开**（\\( (1+x)^m \\)，\\(m\\) 为实数）：
\\[
(1+x)^m = 1 + mx + \\frac{m(m-1)}{2!}x^2 + \\frac{m(m-1)(m-2)}{3!}x^3 + \\cdots, \\quad |x| < 1
\\]

---

如果您需要某个特定函数在特定点的泰勒展开，请告诉我，我可以为您详细写出。
*Figure: Vue Markdown Icon (served from /vue-markdown-icon.svg)*

::: warning
这是一个警告块。
:::

::: tip 提示标题
这是带标题的提示。
:::

::: error 错误块
这是一个错误块。
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

\`\`\`diff json:package.json
{
  "name": "vue-renderer-markdown",
  "type": "module",
- "version": "0.0.49",
+ "version": "0.0.54-beta.1",
  "packageManager": "pnpm@10.16.1",
  "description": "A Vue 3 component that renders Markdown string content as HTML, supporting custom components and advanced markdown features.",
  "author": "Simon He",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git + git@github.com:Simon-He95/vue-markdown-render.git"
  },
  "bugs": {
    "url": "https://github.com/Simon-He95/vue-markdown-render/issues"
  },
  "keywords": [
    "vue",
    "vue3",
    "markdown",
    "markdown-to-html",
    "markdown-renderer",
    "vue-markdown",
    "vue-component",
    "html",
    "renderer",
    "custom-component"
  ],
  "exports": {
    ".": {
      "types": "./dist/types/exports.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./index.css": "./dist/index.css",
    "./index.tailwind.css": "./dist/index.tailwind.css",
    "./tailwind": "./dist/tailwind.ts"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/types/exports.d.ts",
  "files": [
    "dist"
  ],
}
\`\`\`

4. Create chat components (diversified languages):

\`\`\`python:src/server/app.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Message(BaseModel):
    sender: str
    text: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/echo")
def echo(msg: Message):
    return {"reply": f"Echo: {msg.text}"}
\`\`\`

\`\`\`tsx:src/components/ChatWindow.tsx
import React, { useEffect, useRef, useState } from 'react';

type Message = { sender: 'me' | 'other'; text: string; time: string };

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'other', text: 'Hi there!', time: '10:00' },
  ]);
  const [input, setInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const now = new Date();
    const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
    setMessages((m) => [...m, { sender: 'me', text, time }]);
    setInput('');
    setTimeout(() => {
      setMessages((m) => [...m, { sender: 'other', text: 'Auto-reply', time }]);
    }, 800);
  };

  return (
    <div className="chat-window">
      <div className="messages" ref={containerRef}>
        {messages.map((m, i) => (
          <div key={i} className={'msg ' + m.sender}>
            {m.text}
            <span className="time">{m.time}</span>
          </div>
        ))}
      </div>
      <div className="input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()}
          placeholder="Type..."
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
\`\`\`

5. Create a native module example (C++):

\`\`\`cpp:src/native/compute.cpp
#include <bits/stdc++.h>
using namespace std;

int fibonacci(int n){
  if(n<=1) return n;
  int a=0,b=1;
  for(int i=2;i<=n;++i){ int c=a+b; a=b; b=c; }
  return b;
}

int main(){
  ios::sync_with_stdio(false);
  cin.tie(nullptr);
  cout << "fib(10)=" << fibonacci(10) << "\n";
  return 0;
}
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

10. Mermaid graphic:

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
