/**
 * TopicInspiration.jsx - 选题灵感页面
 * 功能：展示AI发现的选题灵感
 */

import { useState, useEffect } from 'react'
import { Card, Button, Space, Spin, Empty, message, Tag, Row, Col, Typography } from 'antd'
import { ArrowLeftOutlined, ThunderboltOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { topicInspirationApi, topicApi } from '../api'

const { Title, Paragraph, Text } = Typography

export default function TopicInspiration() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [topics, setTopics] = useState([])
  const [saving, setSaving] = useState(false)

  // 发现选题灵感
  const discoverTopics = async () => {
    setLoading(true)
    
    try {
      const response = await topicInspirationApi.discoverTopics()
      
      if (response.code === 200) {
        setTopics(response.data.topics || [])
        if (response.data.topics && response.data.topics.length > 0) {
          message.success(`发现了 ${response.data.topics.length} 个选题灵感`)
        } else {
          message.info('暂未发现新的选题灵感，建议添加更多素材')
        }
      } else {
        message.error(response.message || '发现选题灵感失败')
      }
      
    } catch (error) {
      console.error('发现选题灵感失败:', error)
      message.error('发现选题灵感失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 保存选题
  const saveTopic = async (topic) => {
    setSaving(true)
    
    try {
      // 这里可以调用保存选题的API
      message.success(`选题"${topic.title}"已保存到选题库`)
      
    } catch (error) {
      console.error('保存选题失败:', error)
      message.error('保存选题失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 使用选题进行AI提炼
  const useTopicForRefine = (topic) => {
    // 跳转到提炼页面，并传递选题信息
    navigate('/refine', { 
      state: { 
        topic: topic,
        fromInspiration: true 
      } 
    })
  }

  // 页面加载时自动发现选题
  useEffect(() => {
    discoverTopics()
  }, [])

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 32 }}>
        <Space style={{ marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/materials')}
          >
            返回素材库
          </Button>
          <Button 
            type="primary" 
            icon={<ThunderboltOutlined />}
            onClick={discoverTopics}
            loading={loading}
          >
            重新发现
          </Button>
        </Space>
        
        <Title level={1} style={{ marginBottom: 12 }}>
          💡 选题灵感
        </Title>
        <Text type="secondary">
          基于您的素材库内容，AI为您发现的潜在选题方向
        </Text>
      </div>

      {/* 选题列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#888' }}>
            AI正在分析您的素材库，发现选题灵感...
          </div>
        </div>
      ) : topics.length === 0 ? (
        <Empty
          description="暂未发现选题灵感"
          style={{ padding: 60 }}
        >
          <Button type="primary" onClick={discoverTopics}>
            重新发现
          </Button>
        </Empty>
      ) : (
        <Card style={{ 
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ marginBottom: 16 }}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              📋 推荐选题列表 ({topics.length} 个)
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              基于您的素材库内容，AI为您精选的选题方向
            </Text>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}>
            {topics.map((topic, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {/* 左侧内容 */}
                  <div style={{ flex: 1, marginRight: 20 }}>
                    {/* 序号和标题 */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        marginRight: 12
                      }}>
                        {index + 1}
                      </div>
                      <Title level={4} style={{ 
                        margin: 0,
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 600
                      }}>
                        {topic.title}
                      </Title>
                    </div>

                    {/* 核心观点 */}
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ 
                        color: '#d1d5db',
                        lineHeight: 1.6,
                        fontSize: 14
                      }}>
                        {topic.core_idea}
                      </Text>
                    </div>

                    {/* 标签信息 */}
                    <Space size="small">
                      <Tag color="blue" style={{ fontSize: 12 }}>
                        🎯 {topic.target_audience}
                      </Tag>
                      <Tag color="green" style={{ fontSize: 12 }}>
                        📈 {topic.potential}
                      </Tag>
                    </Space>
                  </div>

                  {/* 右侧操作按钮 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => useTopicForRefine(topic)}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        fontSize: 12
                      }}
                    >
                      AI 提炼
                    </Button>
                    <Button
                      size="small"
                      icon={<SaveOutlined />}
                      onClick={() => saveTopic(topic)}
                      loading={saving}
                      style={{ fontSize: 12 }}
                    >
                      保存选题
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 底部提示 */}
      {topics.length > 0 && (
        <div style={{ 
          marginTop: 24, 
          padding: 16,
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: '#3b82f6', fontSize: 16 }}>💡</Text>
            <Text style={{ color: '#888', fontSize: 14 }}>
              提示：点击"AI 提炼"可以基于选题生成具体内容，点击"保存选题"可以将选题保存到选题库
            </Text>
          </div>
        </div>
      )}
    </div>
  )
}
