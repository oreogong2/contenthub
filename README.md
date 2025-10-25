# 🎬 ContentHub - 短视频选题和素材管理工具

> AI 驱动的创意内容平台，让内容创作更高效

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)

## ✨ 项目简介

ContentHub 是一个专为短视频创作者设计的智能内容管理平台，通过 AI 技术帮助创作者：

- 📚 **素材管理** - 统一管理文本、PDF 等各类素材
- 🤖 **AI 提炼** - 智能分析素材，生成优质选题
- 💡 **创意灵感** - 多角度挖掘内容价值
- 📊 **数据统计** - 实时监控使用情况和费用
- 🎯 **选题库** - 系统化管理创作内容

## 🚀 核心功能

### 📝 素材管理
- **文本素材** - 支持长文本输入（最多 50,000 字）
- **PDF 解析** - 自动提取 PDF 文档内容
- **来源标记** - 支持 Twitter、小红书、播客等多种平台
- **素材库** - 瀑布流布局，支持搜索和筛选

### 🤖 AI 智能提炼
- **多模型支持** - OpenAI GPT-4/3.5、DeepSeek、Claude
- **自定义提示词** - 灵活配置 AI 指令
- **费用控制** - 实时统计使用量和成本
- **批量处理** - 支持多素材组合提炼

### 💡 创意功能
- **选题灵感** - AI 自动推荐选题方向
- **组合创新** - 多素材融合生成新内容
- **智能标签** - 自动分类和标记
- **趋势分析** - 结合热点话题

### 📊 数据管理
- **使用统计** - 详细的 API 调用记录
- **费用监控** - 实时费用计算和预警
- **历史记录** - 完整的操作日志
- **导出功能** - 支持数据导出

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI 0.104.1
- **数据库**: SQLite + SQLAlchemy 2.0.23
- **AI 服务**: OpenAI API, DeepSeek API, Claude API
- **文件处理**: pdfplumber 0.10.3
- **数据验证**: Pydantic 2.5.0

### 前端
- **框架**: React 18 + Vite
- **UI 库**: Ant Design 5
- **状态管理**: Zustand
- **路由**: React Router DOM
- **HTTP 客户端**: Axios

### 开发工具
- **版本控制**: Git
- **包管理**: npm, pip
- **开发服务器**: Vite Dev Server, Uvicorn
- **API 文档**: FastAPI Swagger

## 📦 项目结构

```
contenthub/
├── backend/                 # 后端服务
│   ├── main.py             # FastAPI 主程序
│   ├── models.py           # 数据模型
│   ├── crud.py             # 数据库操作
│   ├── ai_service.py       # AI 服务
│   ├── pdf_service.py      # PDF 处理
│   ├── database.py         # 数据库连接
│   ├── schemas.py          # 数据验证
│   ├── config.py           # 配置管理
│   ├── utils.py            # 工具函数
│   ├── init_db.py          # 数据库初始化
│   └── requirements.txt    # Python 依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── api/            # API 调用
│   │   ├── store/          # 状态管理
│   │   └── App.jsx         # 主应用
│   ├── package.json        # 前端依赖
│   └── vite.config.js      # Vite 配置
├── mock-server.js          # Mock API 服务器
├── usage-tracker.js         # 使用统计
├── start.sh                # 启动脚本
└── README.md               # 项目说明
```

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 16+
- Git

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/contenthub.git
cd contenthub
```

2. **安装后端依赖**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **初始化数据库**
```bash
python init_db.py
```

4. **安装前端依赖**
```bash
cd ../frontend
npm install
```

5. **启动服务**

**方式一：使用启动脚本**
```bash
cd ..
chmod +x start.sh
./start.sh
```

**方式二：手动启动**
```bash
# 终端1：启动后端
cd backend
source venv/bin/activate
uvicorn main:app --reload

# 终端2：启动前端
cd frontend
npm run dev
```

6. **访问应用**
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### Mock 模式（无需 API Key）

如果暂时没有 AI API Key，可以使用 Mock 模式：

```bash
# 启动 Mock 服务器
npm run mock

# 启动前端
cd frontend
npm run dev
```

## 🔧 配置说明

### API Key 配置

1. **OpenAI API Key**
   - 获取地址：https://platform.openai.com/api-keys
   - 推荐模型：GPT-3.5-turbo（性价比高）

2. **DeepSeek API Key**（推荐）
   - 获取地址：https://platform.deepseek.com/api_keys
   - 价格：仅为 GPT-4 的 1/50

3. **Claude API Key**（可选）
   - 获取地址：https://console.anthropic.com/

### 环境变量

创建 `backend/.env` 文件：
```env
OPENAI_API_KEY=your_openai_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
CLAUDE_API_KEY=your_claude_key_here
DEFAULT_AI_MODEL=gpt-3.5-turbo
```

## 📊 使用统计

应用内置使用统计功能，帮助你：
- 📈 监控 API 使用量
- 💰 控制费用支出
- 📊 分析使用模式
- 🎯 优化使用策略

## 🎯 使用场景

### 内容创作者
- 管理日常收集的素材
- 快速生成选题灵感
- 批量处理内容提炼

### 自媒体团队
- 统一素材管理
- 协作内容创作
- 数据驱动决策

### 内容机构
- 大规模内容生产
- 质量控制
- 成本控制

## 🔄 开发计划

### 已完成功能 ✅
- [x] 素材管理（文本、PDF）
- [x] AI 提炼功能
- [x] 选题管理
- [x] 使用统计
- [x] 提示词管理
- [x] 设置配置

### 计划功能 🚧
- [ ] 选题灵感生成
- [ ] 多素材组合提炼
- [ ] 内容模板系统
- [ ] 团队协作功能
- [ ] 数据导出
- [ ] 移动端适配

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代、快速的 Web 框架
- [React](https://reactjs.org/) - 用户界面库
- [Ant Design](https://ant.design/) - 企业级 UI 设计语言
- [OpenAI](https://openai.com/) - AI 服务提供商
- [DeepSeek](https://www.deepseek.com/) - 经济实惠的 AI 服务

## 📞 联系方式

- 项目链接：[https://github.com/your-username/contenthub](https://github.com/your-username/contenthub)
- 问题反馈：[Issues](https://github.com/your-username/contenthub/issues)
- 功能建议：[Discussions](https://github.com/your-username/contenthub/discussions)

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**