# 🔧 故障排除指南

本文档帮助你诊断和解决 ContentHub 使用中遇到的问题。

---

## 🚨 常见问题快速诊断

### 问题1: 批量删除素材无效 ❌

#### 症状
- 选中多个素材
- 点击"删除选中"按钮
- 没有任何反应或提示

#### 诊断步骤

**步骤1: 打开浏览器开发者工具**
1. 在 ContentHub 页面按 `F12` 打开开发者工具
2. 切换到 **Console（控制台）** 标签

**步骤2: 执行删除操作**
1. 选中 2-3 个素材
2. 点击"删除选中"按钮
3. 观察控制台输出

**预期看到的日志**：
```
🗑️ 开始批量删除，选中ID: [1, 2, 3]
删除素材 ID: 1
删除素材 ID: 2
删除素材 ID: 3
API 请求: DELETE /api/materials/1
API 请求: DELETE /api/materials/2
API 请求: DELETE /api/materials/3
删除结果: [...]
✅ 成功: 3, ❌ 失败: 0
```

**如果看到错误**：

1. **错误: "API 请求失败"**
   - 检查后端服务是否启动：`http://localhost:8000/api/health`
   - 检查网络连接

2. **错误: "✅ 成功: 0, ❌ 失败: 3"**
   - 查看"删除结果"的详细信息
   - 检查 `result.value` 的结构

3. **没有任何日志**
   - 刷新页面（Ctrl+F5）
   - 清除浏览器缓存
   - 检查前端是否正确加载

**手动测试API**：

在控制台执行：
```javascript
// 测试删除单个素材
fetch('/api/materials/1', { method: 'DELETE' })
  .then(res => res.json())
  .then(data => console.log('API响应:', data))
```

预期响应：
```json
{
  "code": 200,
  "message": "素材已删除",
  "data": null
}
```

---

### 问题2: Chrome扩展只提取首图 🖼️

#### 症状
- 小红书/推特页面有多张图片
- 但扩展只提取了第一张

#### 诊断步骤

**步骤1: 确认扩展已更新**
1. 打开 `chrome://extensions/`
2. 找到"ContentHub 素材提取器"
3. 检查版本号是否为 **1.2.0** 或更高
4. 如果不是，点击"重新加载"按钮

**步骤2: 检查控制台日志**
1. 打开要提取的页面（小红书/推特）
2. 按 `F12` 打开开发者工具
3. 切换到 **Console** 标签
4. 点击浏览器扩展图标

**预期看到的日志**：
```
🎉 ContentHub 插件 v1.2.0 已加载
📥 收到提取请求, useOCR: false
🔍 检测到平台: xiaohongshu
📝 开始提取文本...
📝 提取到文本: 这是一篇小红书笔记...
🖼️ 开始提取图片...
✅ 提取到 5 张图片  ← 应该看到正确的图片数量
✅ 最终提取结果: {platform: 'xiaohongshu', textLength: 234, imageCount: 5, ocrCount: 0}
```

**如果图片数量不对**：

检查提取的图片URL：
```javascript
// 在控制台手动测试图片提取
function testExtractImages() {
  const images = [];
  const selectors = [
    '.swiper-slide img',
    '.note-image img',
    'img[src*="http"]'
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(img => {
      console.log('找到图片:', {
        selector: selector,
        src: img.src,
        width: img.width,
        height: img.height
      });
      if (img.src && img.src.startsWith('http') && img.width > 50 && img.height > 50) {
        images.push(img.src);
      }
    });
  });

  console.log('总共找到', images.length, '张有效图片');
  return images;
}

testExtractImages();
```

**常见原因**：

1. **图片延迟加载**
   - 滚动到页面底部，确保所有图片都加载了
   - 再次点击扩展图标

2. **图片URL在data-src中**
   - 检查 `img` 标签的 `data-src` 属性
   - 扩展已支持，但可能需要更新

3. **小红书轮播图**
   - 小红书使用 swiper 轮播
   - 确保已经浏览过所有图片

---

### 问题3: 推特中文被识别成英文 🐦

#### 症状
- 推特是中文原文
- 但提取的内容是英文翻译

#### 诊断步骤

**步骤1: 确认扩展版本**
1. 检查扩展版本 ≥ 1.2.0
2. 重新加载扩展

**步骤2: 检查推特页面**
1. 打开中文推文
2. 检查是否显示了"显示翻译"或"Translate"按钮
3. **不要点击翻译按钮**

**步骤3: 查看提取日志**
```
🔍 检测到平台: twitter
📝 开始提取文本...
✅ 提取推特原文: 这是中文推文的内容...  ← 应该是中文
```

**如果仍然提取到英文**：

手动测试文本提取：
```javascript
// 在推特页面控制台执行
function testTwitterExtraction() {
  const tweetText = document.querySelector('[data-testid="tweetText"]');
  if (!tweetText) {
    console.error('未找到推文文本元素');
    return;
  }

  console.log('推文元素:', tweetText);
  console.log('innerText:', tweetText.innerText);

  // 查找翻译元素
  const translation = document.querySelector('[data-testid="translation"]');
  if (translation) {
    console.log('⚠️ 页面包含翻译:', translation.innerText);
  }

  // 提取原文（排除翻译）
  const fullText = tweetText.innerText;
  const originalText = fullText.split(/\n(Translate|Show translation|显示翻译)/)[0];
  console.log('原文:', originalText);

  return originalText;
}

testTwitterExtraction();
```

**常见问题**：

1. **页面已经自动翻译了**
   - 关闭 Twitter 的自动翻译功能
   - 设置 > 辅助功能、显示和语言 > 语言 > 关闭"提供翻译"

2. **提取时机不对**
   - 等待推文完全加载后再提取
   - 刷新页面，重新加载

3. **推文本身是英文**
   - 确认推文原文确实是中文
   - 有些账号会发双语推文

---

## 🔍 高级调试

### 前端调试

#### 查看API请求
1. 打开开发者工具
2. 切换到 **Network（网络）** 标签
3. 筛选 "Fetch/XHR"
4. 执行操作（删除、加载等）
5. 点击请求查看详情

#### 查看状态
在控制台执行：
```javascript
// 查看素材列表状态
console.log('当前素材数:', materials.length);
console.log('选中ID:', selectedIds);
console.log('正在删除:', deleting);
```

### 后端调试

#### 查看日志
```bash
cd backend
tail -f app.log
```

#### 测试API
```bash
# 测试健康检查
curl http://localhost:8000/api/health

# 测试删除
curl -X DELETE http://localhost:8000/api/materials/1

# 测试获取素材列表
curl http://localhost:8000/api/materials
```

---

## 📋 完整检查清单

### 前端检查
- [ ] 浏览器缓存已清除
- [ ] 页面已硬刷新（Ctrl+Shift+R）
- [ ] 开发者工具已打开，查看日志
- [ ] 前端版本正确（检查package.json）

### 后端检查
- [ ] 后端服务已启动 (`python backend/main.py`)
- [ ] 端口8000未被占用
- [ ] 数据库文件存在 (`backend/contenthub.db`)
- [ ] 日志无错误

### Chrome扩展检查
- [ ] 扩展版本 ≥ 1.2.0
- [ ] 扩展已启用
- [ ] 已点击"重新加载"按钮
- [ ] 权限已授予（访问特定网站）
- [ ] 页面已刷新（扩展更新后）

---

## 🆘 仍然无法解决？

### 收集诊断信息

请收集以下信息：

1. **浏览器信息**
   - Chrome版本
   - 操作系统

2. **前端日志**
   - 打开开发者工具 > Console
   - 复制所有相关日志

3. **后端日志**
   ```bash
   tail -n 100 backend/app.log
   ```

4. **网络请求**
   - 开发者工具 > Network
   - 截图相关请求和响应

5. **扩展版本**
   - `chrome://extensions/`
   - 截图 ContentHub 扩展信息

### 临时解决方案

#### 批量删除替代方案
逐个删除素材：
1. 点击素材的"删除"按钮
2. 确认删除

#### 图片提取替代方案
使用URL方式：
1. 复制图片URL
2. 在ContentHub中使用"从链接提取"功能
3. 逐个添加图片URL

#### 推特文本提取替代方案
手动复制：
1. 选中推文原文
2. 复制文本
3. 在ContentHub中创建文本素材

---

## 📝 反馈问题

如果问题仍未解决，请提供：
1. 上述诊断信息
2. 复现步骤
3. 预期行为 vs 实际行为
4. 截图或录屏

---

**最后更新**: 2025-10-26
**版本**: 1.2.0
