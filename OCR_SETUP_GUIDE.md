# OCR 功能设置和使用指南

## 🎯 **OCR 功能已修复！**

现在插件可以调用后端 API 进行真正的图片文字识别了。

---

## ⚙️ **前置要求**

OCR 功能需要安装 Tesseract OCR 引擎。

### **Mac 用户**

```bash
# 安装 Tesseract
brew install tesseract

# 安装中文语言包
brew install tesseract-lang
```

### **验证安装**

```bash
tesseract --version
```

应该看到类似输出：
```
tesseract 5.x.x
```

---

## 🚀 **使用步骤**

### **1. 确保后端服务运行**

```bash
cd ~/Desktop/code/contenthub/backend
source venv/bin/activate
uvicorn main:app --reload
```

### **2. 重新加载 Chrome 插件**

1. 打开 `chrome://extensions/`
2. 找到 "ContentHub 素材提取器"
3. 点击 🔄 **重新加载**

### **3. 使用 OCR 功能**

#### **方式一：提取当前页面**

1. 访问有图片的网页（如小红书、推特等）
2. 点击插件图标
3. 点击 **"📝🔍 提取内容 + OCR"** 按钮
4. 等待识别完成（会显示进度）

#### **方式二：从链接提取**

1. 点击插件图标
2. 在 "提取链接" 输入框输入网址
3. 点击 **"🔍 提取链接 + OCR"** 按钮
4. 等待识别完成

---

## 📊 **OCR 识别结果**

识别成功后，你会看到：

```
🔍 OCR识别 ✓ 3/5成功

图1: 识别到的文字内容...
图2: 识别到的文字内容...
图3: 未识别到文字
图4: 识别到的文字内容...
图5: OCR 失败: 图片下载超时
```

---

## 🔍 **查看详细日志**

### **插件控制台**

1. 右键点击插件弹窗 → **检查**
2. 切换到 **Console** 标签

你会看到：
```javascript
开始OCR识别 5 张图片
调用后端 OCR API: http://localhost:8000/api/ocr/batch
图片 URL 列表: [...]
OCR API 响应: {code: 200, data: {...}}
OCR 完成: 3/5 成功
```

### **后端日志**

在后端终端查看：
```
INFO: 批量 OCR 识别: 5 张图片
INFO: [1/5] 下载图片: https://...
INFO: [1/5] 开始 OCR 识别
INFO: 图片尺寸: 800x600
INFO: OCR提取完成: 234 字
INFO: [1/5] OCR 成功: 234 字
...
INFO: 批量 OCR 完成: 3/5 成功
```

---

## ⚠️ **常见问题**

### **❌ "OCR 失败: Tesseract not found"**

**原因**: 没有安装 Tesseract

**解决**:
```bash
brew install tesseract
brew install tesseract-lang
```

### **❌ "OCR 失败: 图片下载超时"**

**原因**:
- 网络问题
- 图片链接失效
- 需要登录才能访问

**解决**:
- 检查网络连接
- 使用公开可访问的图片

### **❌ "OCR 识别为空"**

**原因**:
- 图片中没有文字
- 图片质量太差
- 文字颜色与背景对比度低

**建议**:
- 使用清晰的图片
- 文字需要足够大
- 对比度要明显

### **❌ "中文识别不准确"**

**原因**: 语言包没有正确安装

**解决**:
```bash
# 重新安装中文语言包
brew reinstall tesseract-lang

# 验证
tesseract --list-langs | grep chi
```

应该看到：
```
chi_sim
chi_tra
```

---

## 🎯 **性能优化建议**

### **批量识别**
- 建议每次不超过 10 张图片
- 大批量识别会比较慢

### **图片要求**
- ✅ 清晰度高
- ✅ 文字大小适中
- ✅ 对比度明显
- ❌ 避免手写字体
- ❌ 避免艺术字体

---

## 📝 **技术细节**

### **工作流程**

1. **插件端** (content.js)
   - 提取图片 URL
   - 调用后端 `/api/ocr/batch` API

2. **后端** (main.py + image_service.py)
   - 下载图片到临时目录
   - 使用 Tesseract 进行 OCR
   - 返回识别结果
   - 清理临时文件

3. **插件展示**
   - 显示识别结果
   - 统计成功率
   - 合并到最终内容

### **API 端点**

```
POST /api/ocr/batch

请求:
{
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ]
}

响应:
{
  "code": 200,
  "message": "OCR 识别完成",
  "data": {
    "total": 2,
    "success": 1,
    "failed": 1,
    "results": [
      {
        "index": 1,
        "url": "https://example.com/image1.jpg",
        "text": "识别到的文字...",
        "success": true,
        "error": null
      },
      {
        "index": 2,
        "url": "https://example.com/image2.png",
        "text": "识别失败",
        "success": false,
        "error": "图片下载超时"
      }
    ]
  }
}
```

---

## ✅ **测试 OCR**

### **快速测试**

1. 访问百度图片：`https://image.baidu.com`
2. 搜索 "文字图片"
3. 打开一个带文字的图片
4. 点击插件，选择 "提取内容 + OCR"
5. 查看识别结果

---

## 🆘 **仍然无法使用？**

请提供以下信息：

1. **Tesseract 版本**: `tesseract --version`
2. **语言包列表**: `tesseract --list-langs`
3. **插件 Console 日志**: 右键插件弹窗 → 检查 → Console
4. **后端日志**: 终端中的输出
5. **测试图片 URL**: 你尝试识别的图片地址

---

**OCR 功能现在应该可以正常工作了！** 🎉
