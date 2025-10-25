# ContentHub - 短视频选题素材管理器

一个轻量级的素材管理工具,帮助短视频创作者统一管理素材、AI 提炼内容、高效检索复用。

---

## ✨ 核心功能

- 📝 **素材管理** - 支持文本粘贴和 PDF 上传
- 🤖 **AI 提炼** - 多种提示词,智能提炼内容
- 🏷️ **标签系统** - 灵活的标签分类和管理
- 🔍 **智能检索** - 标签筛选 + 关键词搜索
- ⚙️ **配置简单** - 使用自己的 AI API Key

---

## 🚀 快速开始

### 开发前准备

**必需:**
- Python 3.9+
- Node.js 16+
- OpenAI 或 Claude API Key

**推荐工具:**
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

### 第一步：初始化项目

```bash
# 1. 创建后端
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pdfplumber openai python-multipart pydantic

# 2. 创建前端
cd ../frontend
npm install
npm install antd zustand axios react-router-dom
```

### 第二步：开始开发

```bash
# 1. 启动后端
cd backend
source venv/bin/activate
uvicorn main:app --reload
# 访问 http://localhost:8000/docs 查看 API 文档

# 2. 启动前端（新终端）
cd frontend
npm run dev
# 访问 http://localhost:5173
```

---

## 📋 Milestone 概览

### Milestone 1：核心功能（12-15 小时）

- [x] #1 项目初始化
- [ ] #2 数据库初始化
- [ ] #3 文本素材添加
- [ ] #4 PDF 上传和解析
- [ ] #5 AI 提炼功能
- [ ] #6 选题保存功能
- [ ] #7 选题列表展示

### Milestone 2：完善功能（6-8 小时）

- [ ] #8 多提示词管理
- [ ] #9 筛选和搜索
- [ ] #10 配置管理
- [ ] #11 编辑和删除
- [ ] #12 UI/UX 优化

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

## 📝 Git 提交规范

```bash
# 提交格式
<类型>: <简短描述>

# 类型
feat: 新功能
fix: 修复 bug
refactor: 重构
docs: 文档
style: 样式

# 示例
git commit -m "feat: 完成文本素材添加功能"
git commit -m "fix: 修复 PDF 上传中文乱码问题"
```

---

## 📄 许可证

MIT License

---

## 👨‍💻 开发团队

ContentHub Team

---

**祝开发顺利！** 🚀

