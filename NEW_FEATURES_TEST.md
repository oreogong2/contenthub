# 新功能测试指南

## 🎉 新增功能

我已经成功实现了两个强大的新功能：

### 1. 💡 选题灵感（AI 自动推荐选题）
- **功能**：基于现有素材，AI 自动分析并推荐选题方向
- **API**：`POST /api/topics/inspiration`
- **价值**：解决"不知道做什么选题"的痛点

### 2. 🔗 批量素材组合提炼
- **功能**：选择多个素材，AI 进行智能整合/对比/综合分析
- **API**：`POST /api/refine/batch`
- **价值**：跨素材整合信息，发现新观点

---

## 🧪 测试方法

### 方法 1：使用 Swagger UI（推荐）

1. **打开 API 文档**
   ```
   http://localhost:8000/docs
   ```

2. **找到新增的两个接口**
   - `POST /api/topics/inspiration` - 生成选题灵感
   - `POST /api/refine/batch` - 批量提炼素材

3. **点击 "Try it out" 进行测试**

---

### 方法 2：使用 curl 命令

#### 测试 1：生成选题灵感

**场景**：基于所有素材生成 3 个选题建议

```bash
curl -X POST "http://localhost:8000/api/topics/inspiration" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 3,
    "model": "gpt-3.5-turbo"
  }'
```

**场景**：基于指定素材（ID 1, 2, 3）生成灵感

```bash
curl -X POST "http://localhost:8000/api/topics/inspiration" \
  -H "Content-Type": application/json" \
  -d '{
    "material_ids": [1, 2, 3],
    "count": 5,
    "model": "gpt-3.5-turbo"
  }'
```

**场景**：只基于推特素材生成灵感

```bash
curl -X POST "http://localhost:8000/api/topics/inspiration" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "twitter",
    "count": 5,
    "model": "gpt-3.5-turbo"
  }'
```

**返回示例：**
```json
{
  "code": 200,
  "message": "灵感生成成功",
  "data": {
    "inspirations": [
      {
        "title": "短视频中的 AI 应用趋势",
        "description": "结合最近的 3 篇素材，分析 AI 在短视频创作中的应用趋势",
        "related_material_ids": [1, 2, 3],
        "tags": ["AI", "短视频", "技术"],
        "reasoning": "这些素材都提到了 AI 工具，可以整合成一个趋势分析",
        "suggested_angle": "对比分析",
        "difficulty": "中等",
        "estimated_duration": "5-8分钟"
      }
    ],
    "materials_count": 10,
    "model_used": "gpt-3.5-turbo",
    "tokens_used": 1500,
    "cost_usd": 0.0023
  }
}
```

---

#### 测试 2：批量提炼素材

**模式说明：**
- `combine`: 整合模式 - 保留所有关键信息，去重并组织
- `compare`: 对比模式 - 找出异同点，生成对比分析
- `synthesize`: 综合模式 - 深度分析，生成新观点（推荐）

**场景：综合模式（最智能）**

```bash
curl -X POST "http://localhost:8000/api/refine/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "material_ids": [1, 2, 3],
    "mode": "synthesize",
    "custom_prompt": "请深度分析这些素材，提取共同主题，生成一个短视频选题",
    "model": "gpt-3.5-turbo"
  }'
```

**场景：对比模式**

```bash
curl -X POST "http://localhost:8000/api/refine/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "material_ids": [1, 2],
    "mode": "compare",
    "prompt_id": 1,
    "model": "gpt-3.5-turbo"
  }'
```

**场景：整合模式**

```bash
curl -X POST "http://localhost:8000/api/refine/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "material_ids": [1, 2, 3, 4],
    "mode": "combine",
    "custom_prompt": "将这些素材整合成一个完整的选题内容",
    "model": "gpt-3.5-turbo"
  }'
```

**返回示例：**
```json
{
  "code": 200,
  "message": "批量提炼完成",
  "data": {
    "refined_text": "# AI 创作工具的机遇与挑战\n\n## 核心观点\n1. 工具降低了创作门槛...\n2. 但需要注意版权问题...\n\n## 选题建议\n'AI 创作能赚钱，但这 3 个坑你必须知道'",
    "materials_count": 3,
    "mode": "synthesize",
    "model_used": "gpt-3.5-turbo",
    "tokens_used": 2000,
    "cost_usd": 0.003,
    "material_ids": [1, 2, 3]
  }
}
```

---

## 📝 测试前准备

### 1. 确保有测试素材

先添加一些测试素材（可以通过前端或 API）：

```bash
# 添加素材 1
curl -X POST "http://localhost:8000/api/materials/text" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI 视频工具爆火",
    "content": "最近一款 AI 视频生成工具在推特上爆火，号称 5 分钟就能制作专业视频...",
    "source_type": "twitter"
  }'

# 添加素材 2
curl -X POST "http://localhost:8000/api/materials/text" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "博主月入 3 万经验分享",
    "content": "我用 AI 工具做视频 3 个月，月收入从 0 到 3 万，分享我的完整经验...",
    "source_type": "xiaohongshu"
  }'

# 添加素材 3
curl -X POST "http://localhost:8000/api/materials/text" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI 创作的版权争议",
    "content": "一场关于 AI 生成内容版权的争议在业内引发讨论，法律专家指出...",
    "source_type": "podcast"
  }'
```

### 2. 配置 API Key

确保已经配置了 OpenAI API Key：

1. 访问 http://localhost:3000/#/settings
2. 填入你的 API Key
3. 点击保存

或者通过环境变量：
```bash
export OPENAI_API_KEY="sk-proj-your-key-here"
```

---

## 🎯 测试场景

### 场景 1：发现选题灵感

**目标：** 从 5 个素材中发现 3 个选题方向

**步骤：**
1. 添加 5 个不同来源的素材
2. 调用 `POST /api/topics/inspiration`
3. 查看 AI 推荐的选题

**预期结果：**
- 返回 3 个选题建议
- 每个建议包含标题、描述、相关素材、推荐理由
- 能够发现素材之间的联系

---

### 场景 2：对比不同观点

**目标：** 对比两个博主对同一话题的不同看法

**步骤：**
1. 添加两个观点不同的素材
2. 调用 `POST /api/refine/batch`，mode=`compare`
3. 查看对比分析结果

**预期结果：**
- 找出观点的共同点和分歧点
- 生成对比表或分析报告

---

### 场景 3：深度综合分析

**目标：** 整合多个素材，生成新的观点

**步骤：**
1. 选择 3-5 个相关素材
2. 调用 `POST /api/refine/batch`，mode=`synthesize`
3. 查看综合分析和选题建议

**预期结果：**
- 提取共同主题
- 生成创新的观点
- 给出完整的选题建议

---

## 🐛 常见问题

### Q1: API Key 错误

**错误：** "API Key 未配置或无效"

**解决：**
1. 检查设置页面是否配置了 API Key
2. 或设置环境变量：`export OPENAI_API_KEY="sk-..."`
3. 确保 API Key 有效且有余额

---

### Q2: 素材不存在

**错误：** "没有找到素材，请先添加素材"

**解决：**
先通过前端或 API 添加一些测试素材

---

### Q3: 材料ID不存在

**错误：** "素材 1 不存在"

**解决：**
检查素材 ID 是否正确：
```bash
curl http://localhost:8000/api/materials
```

---

## 📖 API 文档

完整的 API 文档请访问：
**http://localhost:8000/docs**

在 Swagger UI 中可以：
- 查看所有 API 接口
- 查看请求/响应格式
- 直接测试 API
- 查看示例代码

---

## 🎨 下一步：前端实现

后端 API 已经完成，接下来我会实现：

1. **素材库页面**
   - 添加多选框
   - 添加"发现选题灵感"按钮
   - 添加批量操作工具栏

2. **灵感卡片**
   - 展示推荐的选题
   - 显示相关素材
   - 一键创建选题

3. **批量提炼对话框**
   - 选择提炼模式
   - 预览选中的素材
   - 显示提炼结果

---

**现在你可以通过 Swagger UI 或 curl 命令测试这两个新功能了！** 🚀

有任何问题或建议，随时告诉我！
