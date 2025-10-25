/**
 * Mock API Server - 用于前端开发测试
 * 模拟所有后端 API，返回假数据
 * 
 * 启动: node mock-server.js
 * 端口: 8000
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 模拟数据库
let materials = [];
let topics = [];
let configs = {
  default_ai_model: 'gpt-3.5-turbo',
  openai_api_key: 'sk-mock-key-for-testing',
  claude_api_key: '',
  deepseek_api_key: '',
  preset_tags: JSON.stringify(['商业思维', '科技趋势', '生活方式', '创业故事', '个人成长', '情感励志']),
  default_prompts: JSON.stringify([
    {
      id: 1,
      name: "提取核心观点",
      content: "请从以下内容中提取 3-5 个核心观点，每个观点用一句话概括，突出重点和价值。要求简洁明了，便于理解。",
      description: "适合快速了解重点",
      is_default: true
    },
    {
      id: 2,
      name: "生成短视频脚本",
      content: "将以下内容改写成 60 秒短视频口播稿，要求：\n1. 【开头】(0-10秒) 用一个吸引人的钩子抓住观众注意力\n2. 【正文】(10-50秒) 讲清楚核心内容，使用口语化表达\n3. 【结尾】(50-60秒) 给出明确的行动号召",
      description: "包含钩子、正文、行动号召",
      is_default: false
    },
    {
      id: 3,
      name: "提炼标题",
      content: "根据以下内容，生成 5 个吸引人的短视频标题，要求：\n1. 15 字以内\n2. 有悬念或价值点\n3. 符合平台风格（抖音/快手）\n4. 避免标题党",
      description: "生成吸引人的标题",
      is_default: false
    }
  ])
};

let materialIdCounter = 1;
let topicIdCounter = 1;

// 辅助函数：生成统一的 API 响应
const apiResponse = (data, message = '操作成功', code = 200) => ({
  code,
  message,
  data
});

// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============ 素材相关 API ============

// 创建文本素材
app.post('/api/materials/text', (req, res) => {
  const { title, content, source_type } = req.body;
  
  const material = {
    id: materialIdCounter++,
    title: title || '',
    content,
    source_type,
    file_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  materials.push(material);
  
  console.log(`✅ 创建文本素材: id=${material.id}, source=${source_type}`);
  
  res.json(apiResponse({
    id: material.id,
    title: material.title,
    source_type: material.source_type,
    content_length: content.length,
    created_at: material.created_at
  }, '素材创建成功'));
});

// 上传 PDF 素材
app.post('/api/materials/pdf', (req, res) => {
  // 模拟 PDF 上传和文本提取
  const material = {
    id: materialIdCounter++,
    title: '测试PDF文档',
    content: '这是从PDF中提取的模拟文本内容。在实际应用中，这里会是真实的PDF文本提取结果。本段文本用于演示PDF上传功能。\n\n核心内容：\n1. PDF文件上传成功\n2. 文本提取功能正常\n3. 系统运行流畅\n\n这个mock服务器让你可以测试完整的工作流程，而不需要真实的后端服务。',
    source_type: 'other',
    file_name: 'test-document.pdf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  materials.push(material);
  
  console.log(`✅ 上传PDF素材: id=${material.id}, file=${material.file_name}`);
  
  res.json(apiResponse({
    id: material.id,
    title: material.title,
    file_name: material.file_name,
    source_type: material.source_type,
    content_length: material.content.length,
    file_size: 0.5,
    created_at: material.created_at
  }, 'PDF上传并提取成功'));
});

// 获取素材列表
app.get('/api/materials', (req, res) => {
  const { page = 1, per_page = 20, search = '', source_type = '' } = req.query;
  
  let filtered = materials;
  
  // 搜索过滤
  if (search) {
    filtered = filtered.filter(m => 
      m.title.includes(search) || m.content.includes(search)
    );
  }
  
  // 来源过滤
  if (source_type) {
    filtered = filtered.filter(m => m.source_type === source_type);
  }
  
  const start = (parseInt(page) - 1) * parseInt(per_page);
  const end = start + parseInt(per_page);
  const paginatedMaterials = filtered.slice(start, end);
  
  console.log(`✅ 获取素材列表: page=${page}, total=${filtered.length}`);
  
  res.json(apiResponse({
    materials: paginatedMaterials,
    total: filtered.length,
    page: parseInt(page),
    per_page: parseInt(per_page)
  }));
});

// 获取单个素材详情
app.get('/api/materials/:id', (req, res) => {
  const material = materials.find(m => m.id === parseInt(req.params.id));
  
  if (!material) {
    return res.status(404).json(apiResponse(null, '素材不存在', 404));
  }
  
  console.log(`✅ 获取素材详情: id=${material.id}`);
  res.json(apiResponse(material));
});

// ============ AI 提炼相关 API ============

// 获取提示词列表
app.get('/api/prompts', (req, res) => {
  const prompts = JSON.parse(configs.default_prompts);
  
  console.log(`✅ 获取提示词列表: ${prompts.length} 个`);
  res.json(apiResponse({ prompts }));
});

// AI 内容提炼
app.post('/api/ai/refine', (req, res) => {
  const { material_id, prompt_name } = req.body;
  
  const material = materials.find(m => m.id === parseInt(material_id));
  
  if (!material) {
    return res.status(404).json(apiResponse(null, '素材不存在', 404));
  }
  
  // 模拟 AI 提炼结果（根据不同的提示词返回不同的内容）
  let refinedContent = '';
  
  if (prompt_name === '提取核心观点') {
    refinedContent = `【核心观点提取】

1. **观点一：** 这是从原始内容中提取的第一个核心观点，突出了主要价值点。

2. **观点二：** 这里是第二个重要观点，强调了关键信息和实用价值。

3. **观点三：** 第三个核心观点，总结了内容的深层含义和启示。

4. **观点四：** 这是补充性的观点，为整体内容提供了更多维度的理解。

（以上内容由 Mock AI 生成，实际使用时会调用真实的 AI API）`;
  } else if (prompt_name === '生成短视频脚本') {
    refinedContent = `【60秒短视频脚本】

【开头】(0-10秒)
你知道吗？这个方法可以让你效率提升3倍！今天就来告诉你怎么做。

【正文】(10-50秒)
首先，我们要明确一个核心原则：专注于最重要的事情。很多人失败的原因，就是把时间浪费在了不重要的事情上。

那怎么做呢？很简单，三个步骤：
第一，列出你的所有任务
第二，标记出最重要的3件事
第三，集中精力先完成这3件事

就这么简单！

【结尾】(50-60秒)
如果这个方法对你有帮助，记得点赞关注！我是XX，我们下期见！

（以上内容由 Mock AI 生成）`;
  } else if (prompt_name === '提炼标题') {
    refinedContent = `【吸引人的标题方案】

1. 你还在用老方法？试试这个！
2. 3分钟学会高效技巧
3. 这个秘密99%的人不知道
4. 震惊！原来还能这样做
5. 实测有效的提升方法

（以上内容由 Mock AI 生成）`;
  } else {
    refinedContent = `【AI提炼结果】

这是由自定义提示词"${prompt_name}"生成的内容。

在实际应用中，这里会展示根据你的提示词指令，由真实AI模型生成的精炼内容。

Mock服务器让你可以测试完整的工作流程，包括：
- 素材添加
- AI提炼
- 选题保存
- 列表查看
- 编辑删除

等所有功能都可以正常演示！

（以上内容由 Mock AI 生成）`;
  }
  
  // 模拟 AI 处理延迟
  setTimeout(() => {
    console.log(`✅ AI提炼完成: material_id=${material_id}, prompt=${prompt_name}`);
    
    res.json(apiResponse({
      refined_content: refinedContent,
      model: 'mock-gpt-3.5-turbo',
      tokens: {
        prompt_tokens: 150,
        completion_tokens: 200,
        total_tokens: 350
      },
      cost: 0.0007
    }, 'AI提炼成功'));
  }, 1500); // 模拟1.5秒的处理时间
});

// ============ 选题相关 API ============

// 创建选题
app.post('/api/topics', (req, res) => {
  const { material_id, title, content, tags, prompt_name } = req.body;
  
  const material = materials.find(m => m.id === parseInt(material_id));
  
  const topic = {
    id: topicIdCounter++,
    material_id: parseInt(material_id),
    title,
    refined_content: content,
    prompt_name: prompt_name || '',
    tags: JSON.stringify(tags),
    source_type: material ? material.source_type : 'other',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  topics.push(topic);
  
  console.log(`✅ 创建选题: id=${topic.id}, title=${title}`);
  
  res.json(apiResponse({
    id: topic.id,
    title: topic.title,
    tags: JSON.parse(topic.tags),
    created_at: topic.created_at
  }, '选题创建成功'));
});

// 获取选题列表
app.get('/api/topics', (req, res) => {
  const { page = 1, per_page = 20, tags = '', search = '' } = req.query;
  
  let filtered = topics;
  
  // 标签过滤
  if (tags) {
    filtered = filtered.filter(t => {
      const topicTags = JSON.parse(t.tags);
      return topicTags.includes(tags);
    });
  }
  
  // 搜索过滤
  if (search) {
    filtered = filtered.filter(t => 
      t.title.includes(search) || t.refined_content.includes(search)
    );
  }
  
  const start = (parseInt(page) - 1) * parseInt(per_page);
  const end = start + parseInt(per_page);
  const paginatedTopics = filtered.slice(start, end).map(t => ({
    ...t,
    tags: JSON.parse(t.tags)
  }));
  
  console.log(`✅ 获取选题列表: page=${page}, total=${filtered.length}`);
  
  res.json(apiResponse({
    topics: paginatedTopics,
    total: filtered.length,
    page: parseInt(page),
    per_page: parseInt(per_page)
  }));
});

// 获取单个选题详情
app.get('/api/topics/:id', (req, res) => {
  const topic = topics.find(t => t.id === parseInt(req.params.id));
  
  if (!topic) {
    return res.status(404).json(apiResponse(null, '选题不存在', 404));
  }
  
  const material = materials.find(m => m.id === topic.material_id);
  
  console.log(`✅ 获取选题详情: id=${topic.id}`);
  
  res.json(apiResponse({
    ...topic,
    tags: JSON.parse(topic.tags),
    material: material || null
  }));
});

// 更新选题
app.put('/api/topics/:id', (req, res) => {
  const { title, content, tags } = req.body;
  const topicIndex = topics.findIndex(t => t.id === parseInt(req.params.id));
  
  if (topicIndex === -1) {
    return res.status(404).json(apiResponse(null, '选题不存在', 404));
  }
  
  topics[topicIndex] = {
    ...topics[topicIndex],
    title,
    refined_content: content,
    tags: JSON.stringify(tags),
    updated_at: new Date().toISOString()
  };
  
  console.log(`✅ 更新选题: id=${topics[topicIndex].id}`);
  
  res.json(apiResponse({
    id: topics[topicIndex].id,
    title: topics[topicIndex].title,
    updated_at: topics[topicIndex].updated_at
  }, '选题更新成功'));
});

// 删除选题
app.delete('/api/topics/:id', (req, res) => {
  const topicIndex = topics.findIndex(t => t.id === parseInt(req.params.id));
  
  if (topicIndex === -1) {
    return res.status(404).json(apiResponse(null, '选题不存在', 404));
  }
  
  const deletedTopic = topics.splice(topicIndex, 1)[0];
  
  console.log(`✅ 删除选题: id=${deletedTopic.id}`);
  
  res.json(apiResponse(null, '选题删除成功'));
});

// ============ 配置相关 API ============

// 获取配置
app.get('/api/configs', (req, res) => {
  console.log('✅ 获取配置信息');
  res.json(apiResponse(configs));
});

// 更新配置
app.put('/api/configs', (req, res) => {
  configs = { ...configs, ...req.body };
  
  console.log('✅ 更新配置信息');
  res.json(apiResponse(null, '配置更新成功'));
});

// ============ 根路径 ============
app.get('/', (req, res) => {
  res.json({
    message: '🎉 ContentHub Mock API Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      materials: [
        'POST /api/materials/text',
        'POST /api/materials/pdf',
        'GET /api/materials',
        'GET /api/materials/:id'
      ],
      ai: [
        'GET /api/prompts',
        'POST /api/ai/refine'
      ],
      topics: [
        'POST /api/topics',
        'GET /api/topics',
        'GET /api/topics/:id',
        'PUT /api/topics/:id',
        'DELETE /api/topics/:id'
      ],
      configs: [
        'GET /api/configs',
        'PUT /api/configs'
      ]
    }
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('\n');
  console.log('🎉 ====================================');
  console.log('🚀 ContentHub Mock API Server 已启动！');
  console.log('🎉 ====================================');
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📖 API文档: http://localhost:${PORT}/`);
  console.log('');
  console.log('✨ 可用的 API:');
  console.log('   - 素材管理: /api/materials/*');
  console.log('   - AI提炼: /api/ai/*');
  console.log('   - 选题管理: /api/topics/*');
  console.log('   - 配置管理: /api/configs');
  console.log('');
  console.log('💡 提示: 这是一个Mock服务器，所有数据仅存在内存中');
  console.log('🛑 停止服务器: Ctrl + C');
  console.log('====================================\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 Mock API Server 已关闭');
  process.exit(0);
});

