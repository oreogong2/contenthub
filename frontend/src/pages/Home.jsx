/**
 * Home.jsx - 新建素材页面
 * 功能：文本输入、PDF上传、来源选择
 */

import { useState } from 'react'
import { Input, Select, Button, message, Card, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'
import useStore from '../store/useStore'

const { TextArea } = Input

export default function Home() {
  const navigate = useNavigate()
  const { setCurrentMaterial } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    source_type: 'twitter'
  })

  // 来源平台选项
  const sourceOptions = [
    { value: 'twitter', label: '🐦 推特' },
    { value: 'xiaohongshu', label: '📱 小红书' },
    { value: 'podcast', label: '🎙️ 播客' },
    { value: 'douyin', label: '📹 抖音' },
    { value: 'other', label: '📄 其他' }
  ]

  // 表单输入变化处理
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 清空表单
  const handleClear = () => {
    setFormData({
      title: '',
      content: '',
      source_type: 'twitter'
    })
    message.info('表单已清空')
  }

  // 提交素材
  const handleSubmit = async () => {
    // 验证内容
    if (!formData.content.trim()) {
      message.error('请输入素材内容')
      return
    }

    if (formData.content.length > 50000) {
      message.error('内容过长，最多50000字')
      return
    }

    setLoading(true)
    
    try {
      console.log('提交素材:', formData)
      
      // 调用API创建素材
      const response = await materialApi.createText(formData)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        message.success('素材已添加！')
        
        // 保存素材信息到状态
        setCurrentMaterial({
          id: response.data.id,
          title: formData.title || '未命名素材',
          content: formData.content,
          source_type: formData.source_type
        })
        
        // 跳转到提炼页面
        setTimeout(() => {
          navigate('/refine')
        }, 500)
      } else {
        message.error(response.message || '添加失败')
      }
      
    } catch (error) {
      console.error('提交失败:', error)
      message.error(error.message || '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <Card
        title={
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            ✨ 添加素材
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 素材标题 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              素材标题（可选）
            </div>
            <Input
              size="large"
              placeholder="给素材起个名字，方便后续查找"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={200}
            />
          </div>

          {/* 来源平台 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              来源平台
            </div>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={formData.source_type}
              onChange={(value) => handleChange('source_type', value)}
              options={sourceOptions}
            />
          </div>

          {/* 文本输入 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              方式 1 · 粘贴文本
            </div>
            <TextArea
              size="large"
              rows={12}
              placeholder="直接粘贴文本内容...&#10;&#10;例如：&#10;• 推特长推的完整内容&#10;• 小红书爆款笔记文案&#10;• 播客逐字稿的精彩片段&#10;&#10;粘贴后点击下方按钮进入 AI 提炼"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              maxLength={50000}
              showCount
            />
          </div>

          {/* 按钮组 */}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button size="large" onClick={handleClear}>
              🗑️ 清空
            </Button>
            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={handleSubmit}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none'
              }}
            >
              🤖 下一步：AI 提炼 →
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 使用提示 */}
      <Card title="💡 使用提示">
        <ul style={{ lineHeight: 2.2, color: '#d1d5db', paddingLeft: 20 }}>
          <li>📝 推特、小红书等平台内容直接复制粘贴即可</li>
          <li>🎙️ 播客建议先用其他工具转成 PDF，然后上传（下个任务实现）</li>
          <li>⚡ 每次添加一个素材，马上进行 AI 提炼效率最高</li>
          <li>💾 内容限制：最多 50000 字</li>
        </ul>
      </Card>
    </div>
  )
}

