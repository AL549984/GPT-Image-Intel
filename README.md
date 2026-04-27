<p align="center">
  <img src="public/icon.svg" width="64" height="64" alt="logo" />
</p>

<h1 align="center">GPT-Image Intel</h1>

<p align="center">
  <strong>GPT-image-2 优质案例库 — 探索 AI 生成图像的无限可能</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#项目结构">项目结构</a> ·
  <a href="#部署">部署</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript" alt="TypeScript" />
</p>

---

## 概览

**GPT-Image Intel** 是一个精心打造的 AI 图像生成案例展示平台。它从 Supabase 数据库中获取经过 AI 审计的优质案例，以极简、克制的视觉风格呈现，帮助创作者快速浏览高质量 Prompt 参考和灵感。

设计风格融合了 **Apple 官网**的大量留白与精致排版、**Airbnb** 直观的搜索过滤体验，以及 **Linear / Vercel** 通过极细线条和纯色块传递的专业感。

---

## 功能特性

### 🖼 案例浏览

- **双视图切换** — 网格瀑布流 / Excel 风格列表视图一键切换
- **无限滚动** — 分页按需加载，流畅体验
- **干净卡片** — 图片零覆盖，质量标签、评分、分类清晰陈列于图片下方

### 🔍 高级筛选

- **全文搜索** — 标题 & Prompt 模糊匹配，300ms 防抖
- **Notion 风格筛选器** — Popover 面板集成评分区间、上传日期、业务领域多选
- **排序控制** — 评分升序 / 降序 / 默认三档循环
- **Prompt 过滤** — 一键筛选包含提示词的案例

### 📋 侧边详情面板

- **Sheet 侧滑** — 右侧滑出，不打断浏览上下文
- **原图展示** — 保持原始比例，支持查看原图
- **四维评分** — 文本渲染、空间逻辑、UI 质量、物理特性可视化进度条
- **Prompt 复制** — 一键复制，支持 JSON 格式高亮
- **AI 审计详情** — 完整展示专家点评

### 🎨 视觉设计

- 极简浅色调 (`slate-50` 背景 + `slate-200` 极细边框)
- 大圆角 (`rounded-xl`) 营造亲和力
- 低饱和度标签色系 (浅蓝底深蓝字)
- 悬停效果：简洁阴影加深 + 轻微浮起
- Geist 无衬线字体 + 宽字间距

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **UI 库** | [React 19](https://react.dev/) |
| **组件** | [Shadcn UI](https://ui.shadcn.com/) (Radix + Tailwind) |
| **样式** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **数据库** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **字体** | [Geist](https://vercel.com/font) Sans & Mono |
| **部署** | [Vercel](https://vercel.com/) |
| **分析** | Vercel Analytics |
| **语言** | TypeScript 5.7 |

---

## 快速开始

### 前置要求

- **Node.js** ≥ 18
- **pnpm** (推荐) 或 npm / yarn
- 一个 [Supabase](https://supabase.com/) 项目

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/gpt-image-intel.git
cd gpt-image-intel

# 安装依赖
pnpm install
```

### 环境变量

在项目根目录创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 数据库表结构

项目读取 Supabase 中的 `prompts_library` 表，核心字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid | 主键 |
| `title` | text | 案例主题 |
| `image_url` | text | 效果图 URL |
| `category` | text | 应用场景分类 |
| `prompt` | text | 提示词 |
| `text_score` | int | 文本渲染得分 |
| `logic_score` | int | 空间逻辑得分 |
| `ui_score` | int | UI 质量得分 |
| `physic_score` | int | 物理特性得分 |
| `total_score` | int | 加权综合分 |
| `quality_tag` | text | 质量判定标签 |
| `audit_status` | text | 审计状态 |
| `audit_detail` | text | AI 审计详情 |
| `source_link` | text | 原始工程链接 |
| `created_at` | timestamp | 创建时间 |

### 开发

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建

```bash
pnpm build
pnpm start
```

---

## 项目结构

```
├── app/
│   ├── globals.css          # 全局样式 & CSS 变量
│   ├── layout.tsx           # 根布局 (字体、元数据)
│   └── page.tsx             # 首页 (状态管理、筛选逻辑)
├── components/
│   ├── case-detail-sheet.tsx # Sheet 侧边详情面板
│   ├── filter-bar.tsx       # 搜索 + Notion 风格筛选器
│   ├── image-card.tsx       # 案例卡片 (网格视图)
│   ├── masonry-grid.tsx     # 瀑布流 / 列表 双视图
│   ├── quality-badge.tsx    # 质量标签组件
│   ├── score-progress.tsx   # 评分进度条
│   └── ui/                  # Shadcn UI 基础组件
├── hooks/                   # 自定义 Hooks
├── lib/
│   ├── mock-data.ts         # 分类常量 & 类型定义
│   ├── supabase.ts          # Supabase 客户端 & 数据转换
│   └── utils.ts             # cn() 工具函数
└── public/                  # 静态资源
```

---

## 部署

项目已优化为 Vercel 一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/gpt-image-intel)

部署时在 Vercel 控制台设置环境变量 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 即可。

---

## 支持的应用场景分类

| # | 分类 |
|---|------|
| 1 | 视觉 / 海报 |
| 2 | UI / 网页设计 |
| 3 | 角色 / 头像 |
| 4 | YouTube 缩略图 |
| 5 | 个人资料 / 头像 |
| 6 | 信息图 / 教育视觉 |
| 7 | 摄影写实 / 风格实验 |
| 8 | 社交媒体帖子 |
| 9 | 营销物料 / 电商广告 |
| 10 | 角色设定 / 漫画分镜 |
| 11 | 基础视觉 |
| 12 | 其他创意应用 |

---

## License

MIT

---

<p align="center">
  <sub>Built with ❤️ for the AI creative community</sub>
</p>
