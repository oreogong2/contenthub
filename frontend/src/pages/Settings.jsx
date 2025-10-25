/**
 * Settings.jsx - 全局设置页
 * 功能：AI模型选择、API Key配置、标签管理
 */

import { useState, useEffect } from 'react'
import { Card, Select, Input, Button, Space, Tag, message, Divider, Alert, List, Modal } from 'antd'
import { SaveOutlined, PlusOutlined, EyeInvisibleOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import axios from 'axios'

const { TextArea } = Input

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // 配置状态
  const [aiModel, setAiModel] = useState('gpt-4')
  const [openaiKey, setOpenaiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [deepseekKey, setDeepseekKey] = useState('')
  const [presetTags, setPresetTags] = useState([])
  const [prompts, setPrompts] = useState([])
  
  // UI 状态
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [customTagInput, setCustomTagInput] = useState('')
  
  // 提示词编辑
  const [promptModalVisible, setPromptModalVisible] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [promptForm, setPromptForm] = useState({
    name: '',
    content: '',
    description: ''
  })

  // 加载配置
  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    setLoading(true)
    
    try {
      const response = await axios.get('/api/configs')
      
      console.log('配置加载成功:', response.data)
      
      if (response.data.code === 200) {
        const data = response.data.data
        
        setAiModel(data.default_ai_model || 'gpt-4')
        setOpenaiKey(data.openai_api_key || '')
        setClaudeKey(data.claude_api_key || '')
        setDeepseekKey(data.deepseek_api_key || '')
        
        // 解析标签
        try {
          const tags = JSON.parse(data.preset_tags || '[]')
          setPresetTags(tags)
        } catch (e) {
          setPresetTags([
            '商业思维', '科技趋势', '生活方式',
            '创业故事', '个人成长', '情感励志'
          ])
        }
        
        // 解析提示词
        try {
          const promptsList = JSON.parse(data.default_prompts || '[]')
          setPrompts(promptsList)
        } catch (e) {
          // 使用默认提示词
          setPrompts([
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
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存配置
  const handleSave = async () => {
    setSaving(true)
    
    try {
      const configs = {
        default_ai_model: aiModel,
        openai_api_key: openaiKey,
        claude_api_key: claudeKey,
        deepseek_api_key: deepseekKey,
        preset_tags: JSON.stringify(presetTags),
        default_prompts: JSON.stringify(prompts)
      }
      
      console.log('保存配置:', configs)
      
      const response = await axios.put('/api/configs', configs)
      
      console.log('API响应:', response.data)
      
      if (response.data.code === 200) {
        message.success('配置已保存')
      } else {
        message.error(response.data.message || '保存失败')
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 添加标签
  const handleAddTag = () => {
    const tag = customTagInput.trim()
    
    if (!tag) {
      message.warning('请输入标签名称')
      return
    }
    
    if (presetTags.includes(tag)) {
      message.warning('标签已存在')
      return
    }
    
    setPresetTags([...presetTags, tag])
    setCustomTagInput('')
    message.success(`标签 "${tag}" 已添加`)
  }

  // 删除标签
  const handleRemoveTag = (tag) => {
    setPresetTags(presetTags.filter(t => t !== tag))
    message.success(`标签 "${tag}" 已删除`)
  }

  // 打开提示词编辑对话框
  const openPromptModal = (prompt = null) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setPromptForm({
        name: prompt.name,
        content: prompt.content,
        description: prompt.description || ''
      })
    } else {
      setEditingPrompt(null)
      setPromptForm({
        name: '',
        content: '',
        description: ''
      })
    }
    setPromptModalVisible(true)
  }

  // 保存提示词
  const handleSavePrompt = () => {
    if (!promptForm.name.trim()) {
      message.warning('请输入提示词名称')
      return
    }
    if (!promptForm.content.trim()) {
      message.warning('请输入提示词内容')
      return
    }

    if (editingPrompt) {
      // 编辑现有提示词
      setPrompts(prompts.map(p => 
        p.id === editingPrompt.id 
          ? { ...p, ...promptForm }
          : p
      ))
      message.success('提示词已更新')
    } else {
      // 添加新提示词
      const newId = prompts.length > 0 ? Math.max(...prompts.map(p => p.id)) + 1 : 1
      setPrompts([...prompts, {
        id: newId,
        ...promptForm,
        is_default: false
      }])
      message.success('提示词已添加')
    }

    setPromptModalVisible(false)
  }

  // 删除提示词
  const handleDeletePrompt = (promptId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个提示词吗？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk() {
        setPrompts(prompts.filter(p => p.id !== promptId))
        message.success('提示词已删除')
      }
    })
  }

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
        ⚙️ 全局设置
      </h1>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* AI 模型设置 */}
        <Card
          title={<span style={{ fontSize: 18, fontWeight: 600 }}>🤖 AI 模型设置</span>}
          loading={loading}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="AI 模型用于内容提炼功能，不同模型有不同的效果和价格"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
            
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                默认 AI 模型
              </div>
              <Select
                size="large"
                value={aiModel}
                onChange={setAiModel}
                style={{ width: '100%', maxWidth: 400 }}
                options={[
                  { value: 'gpt-4', label: 'GPT-4 - 效果最好但较贵' },
                  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo - 性价比高' },
                  { value: 'deepseek-chat', label: 'DeepSeek Chat - 最便宜（推荐）' },
                  { value: 'claude-3', label: 'Claude 3 - 待支持' }
                ]}
              />
            </div>

            {/* OpenAI API Key */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                OpenAI API Key
              </div>
              <Input.Password
                size="large"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                style={{ maxWidth: 600 }}
              />
              <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                从 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI 官网</a> 获取
              </div>
            </div>

            {/* DeepSeek API Key */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                DeepSeek API Key <span style={{ color: '#888', fontSize: 13 }}>(推荐，价格便宜)</span>
              </div>
              <Input.Password
                size="large"
                placeholder="sk-..."
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                style={{ maxWidth: 600 }}
              />
              <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                从 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">DeepSeek 官网</a> 获取 | 价格仅为 GPT-4 的 1/50
              </div>
            </div>

            {/* Claude API Key */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                Claude API Key <span style={{ color: '#888', fontSize: 13 }}>(可选)</span>
              </div>
              <Input.Password
                size="large"
                placeholder="sk-ant-..."
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                style={{ maxWidth: 600 }}
              />
              <div style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                从 <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic 官网</a> 获取
              </div>
            </div>
          </Space>
        </Card>

        {/* 标签管理 */}
        <Card
          title={<span style={{ fontSize: 18, fontWeight: 600 }}>🏷️ 标签管理</span>}
          loading={loading}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="这些标签将在保存选题时作为预设标签供选择"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />

            {/* 当前标签 */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                当前标签（{presetTags.length} 个）
              </div>
              <Space wrap>
                {presetTags.map(tag => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 14,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {tag}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* 添加标签 */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                添加新标签
              </div>
              <Space>
                <Input
                  size="large"
                  placeholder="输入标签名称"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onPressEnter={handleAddTag}
                  style={{ width: 300 }}
                  maxLength={20}
                />
                <Button
                  size="large"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddTag}
                >
                  添加
                </Button>
              </Space>
            </div>
          </Space>
        </Card>

        {/* 提示词管理 */}
        <Card
          title={<span style={{ fontSize: 18, fontWeight: 600 }}>💬 提示词管理</span>}
          loading={loading}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openPromptModal()}
            >
              添加提示词
            </Button>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="提示词用于AI提炼内容时的指令，你可以自定义提示词来满足不同的提炼需求"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />

            {/* 提示词列表 */}
            <List
              dataSource={prompts}
              renderItem={(prompt) => (
                <List.Item
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => openPromptModal(prompt)}
                    >
                      编辑
                    </Button>,
                    !prompt.is_default && (
                      <Button
                        key="delete"
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeletePrompt(prompt.id)}
                      >
                        删除
                      </Button>
                    )
                  ].filter(Boolean)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '16px',
                    borderRadius: 8,
                    marginBottom: 12
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span style={{ fontSize: 16, fontWeight: 600 }}>
                          {prompt.name}
                        </span>
                        {prompt.is_default && (
                          <Tag color="blue">默认</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ color: '#888', marginBottom: 8 }}>
                          {prompt.description}
                        </div>
                        <div style={{
                          color: '#999',
                          fontSize: 13,
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {prompt.content.length > 150 
                            ? prompt.content.substring(0, 150) + '...' 
                            : prompt.content}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Space>
        </Card>

        {/* 保存按钮 */}
        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              paddingLeft: 32,
              paddingRight: 32
            }}
          >
            保存设置
          </Button>
        </div>
      </Space>

      {/* 提示词编辑对话框 */}
      <Modal
        title={editingPrompt ? '编辑提示词' : '添加提示词'}
        open={promptModalVisible}
        onOk={handleSavePrompt}
        onCancel={() => setPromptModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 20 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              提示词名称 <span style={{ color: '#f87171' }}>*</span>
            </div>
            <Input
              size="large"
              placeholder="例如：提取核心观点"
              value={promptForm.name}
              onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
              maxLength={50}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              简短描述
            </div>
            <Input
              size="large"
              placeholder="例如：适合快速了解重点"
              value={promptForm.description}
              onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
              maxLength={100}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              提示词内容 <span style={{ color: '#f87171' }}>*</span>
            </div>
            <TextArea
              rows={8}
              placeholder="输入给AI的完整指令，例如：请从以下内容中提取 3-5 个核心观点..."
              value={promptForm.content}
              onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })}
              maxLength={2000}
              showCount
            />
          </div>

          <Alert
            message="提示：清晰的提示词能帮助AI更好地理解你的需求，生成更符合预期的内容"
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  )
}

