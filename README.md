# BigQuery Release Pulse & Tweet Sharer
> 🚀 实时监控 Google BigQuery 官方版本发布动态，一键生成推文并分享至 Twitter / 𝕏。

[![Python Version](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask Version](https://img.shields.io/badge/Flask-3.1+-000000.svg?logo=flask)](https://flask.palletsprojects.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20HTML%2FCSS%2FJS-orange.svg)](#技术架构)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub Repo](https://img.shields.io/badge/GitHub-zhaoshe%2Fagy--event--talks--app-181717?logo=github)](https://github.com/zhaoshe/agy-event-talks-app)

---

## 📖 项目简介

**BigQuery Release Pulse** 是一个使用 **Python Flask** 后端和 **原生纯 HTML/CSS/JavaScript** 前端构建的轻量级 Web 应用。

它自动订阅 Google Cloud 官方 Atom Feed 源（[`bigquery-release-notes.xml`](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)），将官方混排在同一日期的更新智能拆解为独立的结构化卡片，并提供交互式卡片选择、字符数智能检测以及针对 Twitter / 𝕏 的一键分享功能。

---

## ✨ 核心特性

* **⚡️ 实时订阅与细粒度拆分：**
  - 解析官方 Atom XML 数据源，按日期自动组织。
  - 自动识别正文中的 `<h3>` 分段标题，将同一天内的更新精准切分为 `Feature`（新特性）、`Change`（变更）、`Fixed`（修复）和 `Announcement`（公告）。
  - 清洗富文本，自动提取首句生成精简标题。
* **🔄 即时刷新与动效反馈：**
  - 顶部配备带有旋转动画（SVG Spinner）的 **Refresh Feed** 按钮。
  - 支持穿透服务端缓存，局部异步刷新列表，并伴随现代 Toast 浮动提示。
* **🐦 交互式选择与一键发推（Tweet）：**
  - **卡片勾选：** 点击卡片任意位置或单选框即可选中更新，顶部浮现常驻吸顶操作条。
  - **智能草稿合成：** 自动装配包含核心亮点、文档锚点链接与热门话题标签（`#BigQuery` `#GoogleCloud` `#DataEngineering`）的推文草稿。
  - **推文编辑弹窗：** 配备 280 字符动态计数器、快捷 Tag 插入按钮与一键复制到剪贴板功能。
  - **Twitter Web Intent：** 点击即可在新窗口打开 Twitter 原生发布草稿，无需申请繁琐的 Twitter API Key 即可安全使用。
* **✂️ 鼠标划词发推（Highlight to Tweet）：**
  - 在页面任意更新详情中用鼠标划选文本，自动弹出浮动按钮，支持将划选文本作为引用金句快速发推。
* **🔍 即时模糊搜索与分类筛选：**
  - 支持关键词毫秒级过滤（如 `AI`、`SQL`、`vector`、`GA` 等）。
  - 分类胶囊标签实时显示对应分类的更新数量统计。
* **🛡️ 缓存与平滑容灾：**
  - 内置 60 秒内存缓存机制，减轻源站请求压力；若外部源网络偶发异常，自动启用陈旧缓存兜底，保证界面不白屏。

---

## 🏗️ 架构与数据流图

```mermaid
flowchart TD
    A["Google Cloud XML Feed<br/>(docs.cloud.google.com)"] -->|Atom XML| B["Flask 后端 (app.py)"]
    B -->|XML 解析 / 正则拆分子项 / 生成 Tweet 草稿| C["内存缓存 (TTL 60s)"]
    C -->|REST API: GET /api/releases| D["前端应用 (Vanilla JS: app.js)"]
    D -->|渲染响应式卡片| E["用户界面 (index.html + style.css)"]
    E -->|1. 选中更新 / 划词| F["推文编辑器 (Modal)"]
    F -->|2. Web Intent| G["Twitter / 𝕏 平台 (发布推文)"]
    E -->|3. 点击 Refresh (带 Spinner)| B
```

---

## 📂 项目结构

```
agy-event-talks-app/
├── app.py                  # Flask 后端服务 (XML 解析引擎、缓存逻辑与 REST API)
├── requirements.txt        # Python 依赖清单 (Flask, requests)
├── .gitignore              # Git 忽略配置 (屏蔽虚拟环境、临时文件与系统隐藏文件)
├── README.md               # 项目技术与使用文档
├── templates/
│   └── index.html          # 前端单页骨架 (语义化 HTML5、模态弹窗与挂载容器)
└── static/
    ├── css/
    │   └── style.css       # 现代深色模式样式表 (微动效、Spinner 动画、响应式布局)
    └── js/
        └── app.js          # 原生 JavaScript 逻辑 (状态管理、异步请求、划词监听)
```

---

## 🚀 快速上手

### 1. 环境准备
确保本机安装了 Python 3.9 或更高版本。

```bash
# 克隆仓库
git clone https://github.com/zhaoshe/agy-event-talks-app.git
cd agy-event-talks-app
```

### 2. 创建虚拟环境并安装依赖
```bash
# 创建并激活虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 运行应用
```bash
python3 app.py
```

终端将输出服务地址：
```text
Starting BigQuery Release Notes App on http://127.0.0.1:5050
 * Serving Flask app 'app'
 * Running on http://127.0.0.1:5050
```

打开浏览器访问 **[http://127.0.0.1:5050](http://127.0.0.1:5050)** 即可开始使用。

> **💡 端口说明：**
> macOS Monterey 及以上版本中，系统服务 AirPlay Receiver 默认占用了 5000 端口。为此本项目默认使用 **5050** 端口。如果需要自定义端口，可设置 `PORT` 环境变量：
> ```bash
> PORT=8080 python3 app.py
> ```

---

## 🔌 API 接口文档

| 路由路径 | 请求方法 | 参数 | 说明 |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | 无 | 渲染并返回前端单页应用页面 |
| `/api/releases` | `GET` | `refresh=true` (可选) | 获取解析后的 BigQuery 更新列表；带参数时穿透缓存 |
| `/api/health` | `GET` | 无 | 服务探活接口，返回应用运行健康状态 |

### 响应示例 (`GET /api/releases`):
```json
{
  "success": true,
  "last_fetched": "2026-10-26 21:51:35 UTC",
  "feed": {
    "title": "BigQuery - Release notes",
    "total_entries": 30,
    "total_updates": 59,
    "entries": [
      {
        "date": "October 22, 2026",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#October_22_2026",
        "updates": [
          {
            "id": "update-0-0",
            "type": "Feature",
            "headline": "The AI.TRANSLATE function lets you translate text strings between languages.",
            "html": "<p>The <a href=\"...\" target=\"_blank\">AI.TRANSLATE function</a>...</p>",
            "tweet_draft": "🚀 BigQuery Feature (October 22, 2026): The AI.TRANSLATE function lets you translate text strings between languages.\n\nRead more: https://docs.cloud.google.com/bigquery/docs/release-notes#October_22_2026\n#BigQuery #GoogleCloud #DataEngineering"
          }
        ]
      }
    ]
  }
}
```

---

## 🛠️ 技术细节与设计决策

1. **为什么不需要 Twitter Developer 凭证？**
   本项目采用标准的 [Twitter Web Intent API](https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/overview)，前端生成预填文案的 Intent 链接并使用 `window.open` 调起。用户可以在自己的 Twitter/𝕏 登录态下进行二次核对并自主确认发送，既保护了用户账号安全，也无需繁琐的 OAuth 申请与服务端密钥保管。
2. **外部链接安全：**
   后端在解析 HTML 描述体时，通过正则确保正文中的每个 `<a>` 标签均包含 `target="_blank"` 和 `rel="noopener noreferrer"`，防止反向所有权篡改（Tabnabbing 漏洞）。
3. **零构建步骤（No Build Step）：**
   前端不依赖 Webpack、Vite 或大型框架，纯依靠原生现代标准（ES6+、CSS Grid/Flexbox、Fetch API），克隆仓库即可立即运行。

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 开源发布。欢迎自由学习、修改与二次分发。
