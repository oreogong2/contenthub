# Chrome 插件修复指南

## 🐛 修复的问题

### 1. **数据格式不匹配**
- ✅ 后端 schema 添加了 `source_url` 字段支持
- ✅ 数据库模型添加了 `source_url` 字段
- ✅ API 端点现在可以接收并保存来源URL

### 2. **错误提示改进**
- ✅ 添加了详细的控制台日志
- ✅ 改进了错误提示信息
- ✅ 区分不同类型的错误（连接失败、CORS问题等）

### 3. **CORS 配置**
- ✅ 后端已配置允许 Chrome 扩展访问

---

## 🚀 如何应用修复

### 步骤 1：更新数据库结构

在项目根目录运行迁移脚本：

```bash
python backend/migrate_add_source_url.py
```

你应该看到：
```
✅ 迁移成功！已添加 source_url 字段到 materials 表
```

### 步骤 2：重启后端服务

```bash
# 如果后端正在运行，先停止 (Ctrl+C)

# 重新启动
cd backend
source venv/bin/activate  # Mac/Linux
# 或 venv\Scripts\activate  # Windows

uvicorn main:app --reload
```

### 步骤 3：重新加载 Chrome 插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 找到 "ContentHub 素材提取器"
4. 点击 🔄 **重新加载** 按钮

### 步骤 4：测试插件

1. 访问任意网页（如小红书、推特等）
2. 点击插件图标
3. 点击 **📝 提取当前页面内容** 按钮
4. 查看提取结果
5. 点击 **📤 发送到ContentHub** 按钮

---

## 📋 检查清单

在使用插件前，请确认：

- [ ] ✅ 后端服务已启动（`http://localhost:8000`）
- [ ] ✅ 数据库迁移已完成
- [ ] ✅ Chrome 插件已重新加载
- [ ] ✅ 插件设置中的 ContentHub 地址正确

---

## 🔍 调试技巧

### 查看插件日志

1. 在插件弹出窗口上 **右键** → **检查**
2. 打开 **Console** 标签页
3. 你会看到详细的日志：
   - `发送数据:` - 发送的数据内容
   - `发送到:` - API 地址
   - `响应状态:` - HTTP 状态码
   - `响应结果:` - 服务器返回的数据

### 常见错误及解决方法

#### ❌ "无法连接到ContentHub"

**可能原因：**
- 后端服务未启动
- ContentHub 地址配置错误

**解决方法：**
1. 确认后端服务运行中：访问 `http://localhost:8000/docs`
2. 检查插件设置中的地址是否为 `http://localhost:8000`

#### ❌ "HTTP 422: Unprocessable Entity"

**可能原因：**
- 数据格式验证失败
- 必填字段缺失

**解决方法：**
1. 检查提取的内容是否为空
2. 查看控制台日志中的详细错误信息

#### ❌ "跨域访问被拒绝"

**可能原因：**
- CORS 配置问题

**解决方法：**
1. 确认后端 `main.py` 中 CORS 配置包含 `chrome-extension://*`
2. 重启后端服务

#### ❌ "提取失败，请刷新页面后重试"

**可能原因：**
- Content script 未正确注入
- 页面结构不支持

**解决方法：**
1. 刷新目标网页
2. 重新打开插件
3. 查看页面的 Console 是否有 "ContentHub插件已加载" 的日志

---

## 🎯 使用建议

### 支持的网站

插件已针对以下平台优化：
- 📕 小红书 (xiaohongshu.com)
- 🐦 推特/X (twitter.com, x.com)
- 📱 微博 (weibo.com)
- 🎵 抖音 (douyin.com)
- 🌐 其他通用网页

### 提取技巧

1. **提取文本**：插件会自动查找页面主要内容区域
2. **提取图片**：会列出页面中的所有图片（暂不支持实际下载）
3. **OCR 识别**：当前版本 OCR 功能仅为占位符，实际识别需要后端支持

### 最佳实践

1. ✅ 在内容加载完成后再提取
2. ✅ 检查提取的内容是否完整
3. ✅ 使用有意义的标题（自动生成）
4. ✅ 定期查看 ContentHub 中的素材

---

## 📊 修改的文件

### 后端文件
- `backend/schemas.py` - 添加 source_url 字段到 MaterialCreate
- `backend/models.py` - 添加 source_url 字段到 Material 模型
- `backend/main.py` - API 端点支持 source_url
- `backend/migrate_add_source_url.py` - 数据库迁移脚本 ⭐ 新增

### 插件文件
- `chrome-extension/popup.js` - 改进错误处理和日志

---

## 🆘 仍然无法使用？

如果按照以上步骤操作后仍然无法使用，请：

1. **查看完整日志**：
   - 后端日志：终端中的输出
   - 插件日志：浏览器 DevTools Console

2. **检查数据库**：
   ```bash
   sqlite3 backend/contenthub.db "PRAGMA table_info(materials);"
   ```
   确认有 `source_url` 字段

3. **测试 API**：
   访问 `http://localhost:8000/docs`
   手动测试 `/api/materials/text` 接口

4. **重新初始化**（最后手段）：
   ```bash
   # 备份数据库
   cp backend/contenthub.db backend/contenthub.db.backup

   # 重新初始化
   python backend/init_db.py

   # 运行迁移
   python backend/migrate_add_source_url.py
   ```

---

## 📞 技术支持

如需帮助，请提供：
- 浏览器控制台截图
- 后端日志
- 操作步骤描述

祝使用愉快！🎉
