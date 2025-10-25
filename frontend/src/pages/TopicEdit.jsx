/**
 * TopicEdit.jsx - 选题编辑页
 * 功能：编辑选题的标题、内容和标签
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Input, Button, Space, Tag, message, Spin } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { topicApi } from '../api'

const { TextArea } = Input

// 预设标签
const PRESET_TAGS = [
  '商业思维',
  '科技趋势',
  '生活方式',
  '创业故事',
  '个人成长',
  '情感励志'
]

export default function TopicEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [originalData, setOriginalData] = useState(null)

  // 加载选题数据
  useEffect(() => {
    loadTopicData()
  }, [id])

  const loadTopicData = async () => {
    setLoading(true)
    
    try {
      console.log('加载选题数据:', id)
      
      const response = await topicApi.getDetail(id)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        const topic = response.data
        setTitle(topic.title)
        setContent(topic.refined_content)
        setSelectedTags(topic.tags)
        setOriginalData(topic)
      } else {
        message.error(response.message || '加载失败')
        setTimeout(() => navigate(`/topics/${id}`), 1500)
      }
      
    } catch (error) {
      console.error('加载选题数据失败:', error)
      message.error('加载失败，请重试')
      setTimeout(() => navigate(`/topics/${id}`), 1500)
    } finally {
      setLoading(false)
    }
  }

  // 切换标签选择
  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  // 添加自定义标签
  const handleAddCustomTag = () => {
    const tag = customTagInput.trim()
    if (!tag) {
      message.warning('请输入标签名称')
      return
    }
    
    if (selectedTags.includes(tag)) {
      message.warning('标签已存在')
      return
    }
    
    setSelectedTags([...selectedTags, tag])
    setCustomTagInput('')
    setShowCustomInput(false)
    message.success(`标签 "${tag}" 已添加`)
  }

  // 保存编辑
  const handleSave = async () => {
    // 验证
    if (!title.trim()) {
      message.error('请输入选题标题')
      return
    }

    if (title.length > 200) {
      message.error('标题最长200字')
      return
    }

    if (!content.trim()) {
      message.error('内容不能为空')
      return
    }

    if (selectedTags.length === 0) {
      message.error('请至少选择一个标签')
      return
    }

    setSaving(true)

    try {
      console.log('保存选题:', {
        material_id: originalData.material_id,
        title,
        refined_content: content,
        prompt_name: originalData.prompt_name,
        tags: selectedTags,
        source_type: originalData.source_type
      })

      const response = await topicApi.update(id, {
        material_id: originalData.material_id,
        title: title.trim(),
        refined_content: content.trim(),
        prompt_name: originalData.prompt_name,
        tags: selectedTags,
        source_type: originalData.source_type
      })

      console.log('API响应:', response)

      if (response.code === 200) {
        message.success('选题已更新！')
        
        // 跳转回详情页
        setTimeout(() => {
          navigate(`/topics/${id}`)
        }, 500)
      } else {
        message.error(response.message || '保存失败')
      }

    } catch (error) {
      console.error('保存失败:', error)
      message.error(error.message || '保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '40px 20px',
        textAlign: 'center' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#888' }}>加载中...</div>
      </div>
    )
  }

  if (!originalData) {
    return null
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/topics/${id}`)}
        style={{ marginBottom: 24 }}
      >
        返回详情
      </Button>

      <Card 
        title={<span style={{ fontSize: 20, fontWeight: 700 }}>✏️ 编辑选题</span>}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 选题标题 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              选题标题 <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <Input
              size="large"
              placeholder="选题标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>

          {/* 选题内容 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              选题内容 <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <TextArea
              rows={12}
              placeholder="选题内容"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
              showCount
            />
          </div>

          {/* 选择标签 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              选择标签 <span style={{ color: '#ef4444' }}>*</span> 
              <span style={{ color: '#888', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>
                (至少选1个)
              </span>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Space wrap>
                {PRESET_TAGS.map(tag => (
                  <Tag
                    key={tag}
                    style={{
                      padding: '6px 12px',
                      fontSize: 14,
                      cursor: 'pointer',
                      border: selectedTags.includes(tag) 
                        ? '2px solid #3b82f6' 
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      background: selectedTags.includes(tag) 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                        : 'rgba(17, 24, 39, 0.6)',
                      color: selectedTags.includes(tag) ? '#fff' : '#d1d5db'
                    }}
                    onClick={() => handleToggleTag(tag)}
                  >
                    {selectedTags.includes(tag) && '✓ '}{tag}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* 自定义标签 */}
            <div>
              {!showCustomInput ? (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setShowCustomInput(true)}
                >
                  添加自定义标签
                </Button>
              ) : (
                <Space>
                  <Input
                    size="large"
                    placeholder="输入标签名称"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onPressEnter={handleAddCustomTag}
                    style={{ width: 200 }}
                    maxLength={20}
                  />
                  <Button size="large" type="primary" onClick={handleAddCustomTag}>
                    添加
                  </Button>
                  <Button size="large" onClick={() => {
                    setShowCustomInput(false)
                    setCustomTagInput('')
                  }}>
                    取消
                  </Button>
                </Space>
              )}
            </div>

            {/* 已选标签 */}
            {selectedTags.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                  已选择 {selectedTags.length} 个标签：
                </div>
                <Space wrap>
                  {selectedTags.map(tag => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => handleToggleTag(tag)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 13,
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
            )}
          </div>

          {/* 按钮组 */}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              size="large" 
              onClick={() => navigate(`/topics/${id}`)}
            >
              取消
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              disabled={!title.trim() || !content.trim() || selectedTags.length === 0}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none'
              }}
            >
              保存修改
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

