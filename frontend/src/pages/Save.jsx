/**
 * Save.jsx - 保存选题页面
 * 功能：标题输入、标签选择、选题保存
 */

import { useState, useEffect } from 'react'
import { Card, Input, Button, message, Space, Tag, Divider } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { topicApi } from '../api'
import useStore from '../store/useStore'

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

export default function Save() {
  const navigate = useNavigate()
  const { refinedContent, currentMaterial, clearAll } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    // 加载数据
    if (refinedContent) {
      setContent(refinedContent.refined_text || '')
    } else {
      // 如果没有提炼结果，跳转回首页
      message.warning('请先完成 AI 提炼')
      setTimeout(() => {
        navigate('/')
      }, 1500)
    }
  }, [])

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

  // 保存选题
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

    setLoading(true)

    try {
      console.log('保存选题:', {
        material_id: refinedContent?.material_id || currentMaterial?.id,
        title,
        refined_content: content,
        prompt_name: refinedContent?.prompt_name,
        tags: selectedTags,
        source_type: refinedContent?.source_type || currentMaterial?.source_type
      })

      const response = await topicApi.create({
        material_id: refinedContent?.material_id || currentMaterial?.id,
        title: title.trim(),
        refined_content: content.trim(),
        prompt_name: refinedContent?.prompt_name,
        tags: selectedTags,
        source_type: refinedContent?.source_type || currentMaterial?.source_type
      })

      console.log('API响应:', response)

      if (response.code === 200) {
        message.success('选题已保存！')
        
        // 清空状态
        clearAll()
        
        // 跳转到选题列表
        setTimeout(() => {
          navigate('/topics')
        }, 500)
      } else {
        message.error(response.message || '保存失败')
      }

    } catch (error) {
      console.error('保存失败:', error)
      message.error(error.message || '保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (!refinedContent && !currentMaterial) {
    return null
  }

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      <Card 
        title={<span style={{ fontSize: 20, fontWeight: 700 }}>💾 保存为选题</span>}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 选题标题 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              选题标题 <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <Input
              size="large"
              placeholder="给选题起个标题，例如：AI 如何改变短视频创作"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              showCount
            />
          </div>

          {/* 选题内容 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              选题内容 <span style={{ color: '#888', fontWeight: 400, fontSize: 13 }}>(已自动填充，可编辑)</span>
            </div>
            <TextArea
              rows={10}
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

          {/* 来源信息 */}
          <div>
            <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            <div style={{ color: '#888', fontSize: 13 }}>
              📅 创建时间：{new Date().toLocaleDateString('zh-CN')} · 
              📍 来源：{refinedContent?.source_type || currentMaterial?.source_type || '未知'} · 
              🤖 提示词：{refinedContent?.prompt_name || '未知'}
            </div>
          </div>

          {/* 按钮组 */}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button size="large" onClick={() => navigate('/refine')}>
              ← 返回
            </Button>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleSave}
              disabled={!title.trim() || !content.trim() || selectedTags.length === 0}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none'
              }}
            >
              💾 保存选题
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

