# 🔗 链接素材提取功能

## 功能概述

新增的链接素材提取功能可以让您通过分享链接（如推特、小红书、微博等）来自动提取图片中的文字内容，大大简化素材搜集流程。

## 🚀 主要特性

### 1. 多平台支持
- **推特/X** - 自动识别推文中的图片文字
- **小红书** - 提取笔记图片中的文字内容
- **微博** - 支持微博图片文字识别
- **抖音** - 识别短视频截图中的文字
- **其他平台** - 支持任何包含图片的网页

### 2. 智能图片处理
- 自动从网页中提取所有图片
- 支持直接图片链接
- 智能过滤非图片内容
- 自动图片格式转换和优化

### 3. OCR文字识别
- 支持中英文混合识别
- 自动图片预处理（放大、格式转换）
- 智能文字清理和格式化
- 高准确率文字提取

## 📋 使用方法

### 步骤1：安装OCR依赖

在开始使用前，需要安装Tesseract OCR引擎：

```bash
# 进入后端目录
cd contenthub/backend

# 运行安装脚本
./install_ocr_deps.sh
```

**手动安装（如果脚本失败）：**

- **macOS**: `brew install tesseract tesseract-lang`
- **Ubuntu**: `sudo apt-get install tesseract-ocr tesseract-ocr-chi-sim`
- **CentOS**: `sudo yum install tesseract tesseract-langpack-chi_sim`

### 步骤2：安装Python依赖

```bash
# 激活虚拟环境
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate     # Windows

# 安装新依赖
pip install -r requirements.txt
```

### 步骤3：使用功能

1. 打开ContentHub首页
2. 选择"链接提取"标签页
3. 粘贴要处理的链接地址
4. 点击"🔍 提取并保存"
5. 系统会自动：
   - 下载网页中的图片
   - 使用OCR识别文字
   - 保存到素材库

## 🔧 技术实现

### 后端架构

```
image_service.py
├── download_image_from_url()     # 图片下载
├── extract_text_from_image()     # OCR文字提取
├── extract_images_from_webpage() # 网页图片解析
├── process_url_for_images()      # 主处理流程
└── cleanup_image_files()         # 临时文件清理
```

### API接口

```http
POST /api/materials/url
Content-Type: application/json

{
  "url": "https://example.com/post",
  "source_type": "twitter",
  "title": "可选标题"
}
```

### 前端组件

- 新增"链接提取"标签页
- URL输入验证
- 处理进度提示
- 结果展示

## ⚙️ 配置说明

### 环境变量

```bash
# OCR配置
TESSERACT_CMD=/usr/local/bin/tesseract  # Tesseract可执行文件路径
TESSERACT_LANG=chi_sim+eng              # 支持的语言包

# 图片处理配置
MAX_IMAGE_SIZE=10485760                 # 最大图片大小（10MB）
MAX_IMAGES_PER_URL=10                   # 每个URL最多处理图片数
```

### 性能优化

- 图片大小限制：10MB
- 并发处理：最多10个图片
- 超时设置：30秒下载，120秒总处理时间
- 临时文件自动清理

## 🐛 故障排除

### 常见问题

1. **OCR识别率低**
   - 确保图片清晰度足够
   - 检查文字大小是否过小
   - 尝试手动调整图片对比度

2. **下载失败**
   - 检查网络连接
   - 确认链接可访问
   - 某些网站可能有反爬虫机制

3. **Tesseract未找到**
   ```bash
   # 检查安装
   tesseract --version
   
   # 设置路径（如果需要）
   export TESSERACT_CMD=/usr/local/bin/tesseract
   ```

4. **中文识别问题**
   ```bash
   # 检查中文语言包
   tesseract --list-langs
   
   # 应该包含 chi_sim 和 chi_tra
   ```

### 日志查看

```bash
# 查看处理日志
tail -f contenthub/backend/app.log

# 查看OCR相关日志
grep "OCR\|图片\|URL" contenthub/backend/app.log
```

## 📊 使用统计

系统会自动记录：
- 处理的URL数量
- 提取的图片数量
- 识别的文字字数
- 处理成功率

## 🔒 隐私和安全

- 所有图片处理在本地进行
- 不存储原始图片（可选保留）
- 临时文件自动清理
- 支持HTTPS链接

## 🚀 未来计划

- [ ] 支持更多图片格式
- [ ] 批量URL处理
- [ ] 图片质量自动优化
- [ ] 多语言OCR支持
- [ ] 云端OCR服务集成

## 📞 技术支持

如果遇到问题，请：
1. 查看日志文件
2. 检查依赖安装
3. 确认网络连接
4. 提交Issue到项目仓库

---

**注意**: 此功能需要安装Tesseract OCR引擎，请确保按照上述步骤正确安装依赖。
