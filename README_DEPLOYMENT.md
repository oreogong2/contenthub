# ContentHub 部署指南

## 📋 目录
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [维护指南](#维护指南)

---

## 环境要求

### 后端
- Python 3.8 或更高版本
- pip (Python 包管理器)
- 虚拟环境工具 (venv)

### 前端
- Node.js 16 或更高版本
- npm 7 或更高版本

### 可选
- OpenAI API Key (用于 AI 提炼功能)
- Claude API Key (可选)

---

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd contenthub
```

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 初始化数据库（首次运行）
python init_db.py

# 启动后端服务
uvicorn main:app --reload
```

后端将在 `http://localhost:8000` 启动

### 3. 前端启动

```bash
# 新开一个终端
cd frontend

# 安装依赖
npm install

# 启动前端开发服务器
npm run dev
```

前端将在 `http://localhost:3000` 启动

---

## 详细部署步骤

### 后端部署

#### 1. 安装 Python 依赖
```bash
cd backend
pip install -r requirements.txt
```

**依赖列表：**
- `fastapi==0.104.1` - Web 框架
- `uvicorn==0.24.0` - ASGI 服务器
- `sqlalchemy==2.0.23` - ORM
- `pdfplumber==0.10.3` - PDF 解析
- `openai==1.3.5` - OpenAI API 客户端
- `python-multipart==0.0.6` - 文件上传支持
- `pydantic==2.5.0` - 数据验证

#### 2. 初始化数据库
```bash
python init_db.py
```

这将创建：
- SQLite 数据库文件 `contenthub.db`
- 3 张数据表（materials, topics, configs）
- 默认配置和预设数据

#### 3. 配置环境变量（可选）
创建 `.env` 文件：
```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
```

或在设置页面中配置。

#### 4. 启动后端服务
```bash
# 开发模式
uvicorn main:app --reload

# 生产模式
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 前端部署

#### 1. 安装 Node.js 依赖
```bash
cd frontend
npm install
```

#### 2. 开发模式启动
```bash
npm run dev
```

#### 3. 生产模式构建
```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

构建后的文件在 `frontend/dist` 目录。

---

## 配置说明

### 后端配置

#### 数据库
- **类型:** SQLite
- **文件:** `backend/contenthub.db`
- **表:**
  - `materials` - 素材表
  - `topics` - 选题表
  - `configs` - 配置表

#### 上传目录
- **路径:** `backend/uploads/`
- **用途:** 存储上传的 PDF 文件
- **限制:** 最大 50MB

#### API 端口
- **默认:** 8000
- **修改:** 在 `main.py` 的 `uvicorn.run()` 中修改

### 前端配置

#### 开发代理
`vite.config.js` 中配置了 API 代理：
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true
  }
}
```

#### 端口
- **默认:** 3000
- **修改:** 在 `vite.config.js` 中修改

---

## API 接口文档

启动后端后，访问 API 文档：
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 主要接口

#### 素材管理
- `POST /api/materials/text` - 创建文本素材
- `POST /api/materials/pdf` - 上传 PDF 素材
- `GET /api/materials/{id}` - 获取素材详情

#### AI 提炼
- `POST /api/ai/refine` - AI 内容提炼
- `GET /api/prompts` - 获取提示词列表

#### 选题管理
- `POST /api/topics` - 创建选题
- `GET /api/topics` - 获取选题列表
- `GET /api/topics/{id}` - 获取选题详情
- `PUT /api/topics/{id}` - 更新选题
- `DELETE /api/topics/{id}` - 删除选题

#### 配置管理
- `GET /api/configs` - 获取配置
- `PUT /api/configs` - 更新配置

---

## 常见问题

### 1. 端口被占用
```bash
# 查看端口占用（macOS/Linux）
lsof -i :8000
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 2. 数据库文件损坏
```bash
# 删除现有数据库
rm backend/contenthub.db

# 重新初始化
python backend/init_db.py
```

### 3. PDF 上传失败
- 检查 `uploads` 目录是否存在且有写入权限
- 确认 PDF 文件小于 50MB
- 确保 PDF 是文本版（非扫描版）

### 4. AI 提炼功能报错
- 检查 API Key 是否正确配置
- 在设置页面中配置 OpenAI API Key
- 检查网络连接是否正常

### 5. 前端无法访问后端
- 确认后端已启动（http://localhost:8000）
- 检查 vite.config.js 中的代理配置
- 查看浏览器控制台的错误信息

---

## 维护指南

### 数据库备份
```bash
# 备份数据库
cp backend/contenthub.db backend/contenthub_backup_$(date +%Y%m%d).db
```

### 日志查看
后端日志会输出到控制台，建议使用日志管理工具：
```bash
# 重定向日志到文件
uvicorn main:app --log-config logging.ini > logs/app.log 2>&1
```

### 定期清理
```bash
# 清理临时文件
rm -rf backend/__pycache__
rm -rf backend/*.pyc

# 清理旧的 PDF 文件（可选）
find backend/uploads -type f -mtime +30 -delete
```

### 更新依赖
```bash
# 后端依赖
cd backend
pip install --upgrade -r requirements.txt

# 前端依赖
cd frontend
npm update
```

---

## 生产环境部署

### 使用 Nginx + Gunicorn

#### 1. 安装 Gunicorn
```bash
pip install gunicorn
```

#### 2. 启动后端
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

#### 3. 配置 Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        root /path/to/contenthub/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 使用 Docker（可选）

创建 `Dockerfile`:
```dockerfile
# 后端
FROM python:3.10-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 性能优化建议

### 后端优化
1. 使用 PostgreSQL 替代 SQLite（生产环境）
2. 添加 Redis 缓存
3. 使用 Gunicorn 多进程部署
4. 开启 Gzip 压缩

### 前端优化
1. 使用 CDN 加速静态资源
2. 开启懒加载
3. 代码分割和按需加载
4. 图片压缩和优化

---

## 安全建议

1. **API Key 安全**
   - 不要在代码中硬编码 API Key
   - 使用环境变量或配置文件
   - 定期更换 API Key

2. **数据库安全**
   - 定期备份数据
   - 使用强密码（如果使用 PostgreSQL）
   - 限制数据库访问权限

3. **文件上传安全**
   - 验证文件类型和大小
   - 防止路径遍历攻击
   - 定期清理临时文件

---

## 支持与反馈

如果遇到问题或有建议，欢迎：
- 提交 Issue
- 发送邮件
- 查看项目文档

---

## 许可证

请查看 LICENSE 文件了解详情。

