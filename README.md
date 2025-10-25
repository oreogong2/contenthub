# ContentHub - 短视频选题素材管理器

一个轻量级的素材管理工具，帮助短视频创作者统一管理素材、AI 提炼内容、高效检索复用。

**当前版本：v1.0.0** ✅ **开发完成**

---

## ✨ 核心功能

- 📝 **素材管理** - 支持文本粘贴和 PDF 上传（最大50MB）
- 🤖 **AI 提炼** - 4种预设提示词，智能提炼内容
- 🏷️ **标签系统** - 灵活的标签分类和管理，支持自定义标签
- 🔍 **智能检索** - 标签筛选 + 关键词搜索 + 分页浏览
- ✏️ **选题管理** - 查看、编辑、删除选题
- ⚙️ **配置简单** - 使用自己的 AI API Key，支持 GPT-4 和 GPT-3.5
- 🎨 **美观界面** - 深色主题 + 玻璃态设计 + 响应式布局

---

## 🎥 产品演示

**完整工作流：**
1. 添加素材（文本/PDF）
2. 选择提示词，AI 智能提炼
3. 编辑并保存为选题
4. 在选题库中管理和检索

---

## 🚀 快速开始

### 环境要求

**必需：**
- Python 3.8+
- Node.js 16+
- OpenAI API Key（用于 AI 提炼功能）

**推荐工具：**
- VSCode 或 Cursor
- Git

---

## 📂 项目结构

```
contenthub/
├── backend/              # Python 后端
│   ├── main.py          # FastAPI 主程序
│   ├── models.py        # 数据库模型
│   ├── crud.py          # 数据库操作
│   └── ...
├── frontend/             # React 前端
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   └── api/         # API 调用
│   └── ...
├── docs/                 # 📁 开发文档
├── prototype/            # 📁 交互原型
└── README.md            # 本文件
```

---

## 🛠️ 开发流程

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd contenthub

# 2. 后端设置
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. 初始化数据库（首次运行）
python init_db.py

# 4. 前端设置
cd ../frontend
npm install
```

### 启动应用

```bash
# 1. 启动后端（终端 1）
cd backend
source venv/bin/activate
uvicorn main:app --reload
# 访问 http://localhost:8000/docs 查看 API 文档

# 2. 启动前端（终端 2）
cd frontend
npm run dev
# 访问 http://localhost:3000
```

### 配置 API Key

1. 访问 http://localhost:3000
2. 点击右上角 **⚙️ 设置**
3. 输入 **OpenAI API Key**
4. 点击 **保存设置**
5. 开始使用！

---

## 📚 文档

- **[部署指南](../README_DEPLOYMENT.md)** - 详细的部署和配置说明
- **[用户指南](../USER_GUIDE.md)** - 完整的功能使用指南
- **[API 文档](http://localhost:8000/docs)** - 在线 API 文档（启动后端后访问）

---

## 📋 开发进度

### ✅ Milestone 1：核心功能（已完成）

- [x] #1 项目初始化
- [x] #2 数据库初始化
- [x] #3 文本素材添加
- [x] #4 PDF 上传和解析
- [x] #5 AI 提炼功能
- [x] #6 选题保存功能
- [x] #7 选题列表展示

### ✅ Milestone 2：完善功能（已完成）

- [x] #8 选题详情页
- [x] #9 选题编辑/删除
- [x] #10 全局设置
- [x] #11 系统优化

**项目状态：** 🎉 **开发完成！**

---

## 📊 项目统计

- **总代码量：** 3000+ 行
- **开发时间：** 完整 2 个 Milestone
- **Git 提交：** 10+ 次
- **API 接口：** 12 个
- **前端页面：** 7 个
- **数据库表：** 3 张

---

## 🔧 技术栈

### 后端
- **Python 3.9+**
- **FastAPI** - Web 框架
- **SQLAlchemy** - ORM
- **SQLite** - 数据库
- **pdfplumber** - PDF 解析
- **OpenAI SDK** - AI 调用

### 前端
- **React 18**
- **Vite** - 构建工具
- **Ant Design 5** - UI 组件库
- **Zustand** - 状态管理
- **Axios** - HTTP 客户端

---

## 🎯 使用场景

### 适合谁使用？
- 📱 短视频创作者
- ✍️ 内容运营者
- 🎬 自媒体工作者
- 📝 知识分享者

### 解决什么问题？
- ✅ 素材分散，不好管理
- ✅ 手动提炼费时费力
- ✅ 缺少系统的选题库
- ✅ 重复内容难以复用

---

## 🌟 核心特性

### AI 提炼
- 4 个预设提示词：提取观点、生成脚本、拍摄角度、提炼标题
- 支持 GPT-4 和 GPT-3.5-turbo
- 显示 Tokens 使用量和费用估算
- 提炼结果可编辑

### 素材管理
- 文本素材：最长 50,000 字
- PDF 素材：最大 50MB，自动提取文字
- 支持多种来源：推特、小红书、播客、抖音等

### 选题管理
- 完整的选题库
- 搜索 + 标签筛选
- 分页浏览（每页20条）
- 查看、编辑、删除操作

### 用户体验
- 🎨 深色主题，视觉舒适
- ✨ 玻璃态设计，现代美观
- 📱 响应式布局，适配多端
- ⚡ 流畅动画，交互友好

---

## 🔧 技术亮点

- **后端：** FastAPI + SQLAlchemy ORM + pdfplumber
- **前端：** React 18 + Vite + Ant Design 5 + Zustand
- **数据库：** SQLite（MVP），易于迁移到 PostgreSQL
- **AI 集成：** OpenAI API，支持多模型切换
- **文件处理：** pdfplumber，支持中文 PDF

---

## 📊 API 接口

### 素材管理
- `POST /api/materials/text` - 创建文本素材
- `POST /api/materials/pdf` - 上传 PDF 素材
- `GET /api/materials/{id}` - 获取素材详情

### AI 提炼
- `POST /api/ai/refine` - AI 内容提炼
- `GET /api/prompts` - 获取提示词列表

### 选题管理
- `POST /api/topics` - 创建选题
- `GET /api/topics` - 获取选题列表（支持分页、搜索、筛选）
- `GET /api/topics/{id}` - 获取选题详情
- `PUT /api/topics/{id}` - 更新选题
- `DELETE /api/topics/{id}` - 删除选题

### 配置管理
- `GET /api/configs` - 获取配置
- `PUT /api/configs` - 更新配置

完整 API 文档：http://localhost:8000/docs

---

## 🤝 贡献指南

欢迎贡献！如果您想参与开发：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个功能'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 更新日志

### v1.0.0 (2025-10-25)
- ✅ 完成所有核心功能
- ✅ 完成所有完善功能
- ✅ 完整的文档和部署指南

---

## 📄 许可证

MIT License

---

## 💬 联系我们

- 📧 Email: support@contenthub.com
- 💬 Issues: 提交 GitHub Issue
- 📖 文档: 查看完整文档

---

**感谢使用 ContentHub！** 🎉

