/**
 * Settings.jsx - 全局设置页
 * 功能：AI模型选择、API Key配置、标签管理
 */

import { useState, useEffect } from 'react'
import { Card, Select, Input, Button, Space, Tag, message, Divider, Alert } from 'antd'
import { SaveOutlined, PlusOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons'
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
  
  // UI 状态
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [customTagInput, setCustomTagInput] = useState('')

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
        preset_tags: JSON.stringify(presetTags)
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

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '40px 20px' }}>
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
    </div>
  )
}

