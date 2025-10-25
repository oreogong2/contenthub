/**
 * TopicDetail.jsx - 选题详情页
 * 功能：展示选题完整内容、原始素材、编辑/删除操作
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Tag, Divider, Spin, message, Modal, Collapse } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { topicApi } from '../api'

const { Panel } = Collapse

export default function TopicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [topic, setTopic] = useState(null)

  // 加载选题详情
  useEffect(() => {
    loadTopicDetail()
  }, [id])

  const loadTopicDetail = async () => {
    setLoading(true)
    
    try {
      console.log('加载选题详情:', id)
      
      const response = await topicApi.getDetail(id)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        setTopic(response.data)
      } else {
        message.error(response.message || '加载失败')
        setTimeout(() => navigate('/topics'), 1500)
      }
      
    } catch (error) {
      console.error('加载选题详情失败:', error)
      message.error('加载失败，请重试')
      setTimeout(() => navigate('/topics'), 1500)
    } finally {
      setLoading(false)
    }
  }

  // 编辑选题
  const handleEdit = () => {
    navigate(`/topics/${id}/edit`)
  }

  // 删除选题
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '删除后无法恢复，确定要删除这个选题吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await topicApi.delete(id)
          
          if (response.code === 200) {
            message.success('选题已删除')
            navigate('/topics')
          } else {
            message.error(response.message || '删除失败')
          }
        } catch (error) {
          console.error('删除失败:', error)
          message.error('删除失败，请重试')
        }
      }
    })
  }

  // 格式化日期
  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (!topic) {
    return null
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/topics')}
        style={{ marginBottom: 24 }}
      >
        返回列表
      </Button>

      {/* 选题详情卡片 */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(17, 24, 39, 0.6)',
          backdropFilter: 'blur(10px)',
          marginBottom: 24
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 标题和操作按钮 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start' 
          }}>
            <h1 style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              margin: 0,
              color: '#fff',
              flex: 1,
              paddingRight: 20
            }}>
              {topic.title}
            </h1>
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  border: 'none'
                }}
              >
                编辑
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              >
                删除
              </Button>
            </Space>
          </div>

          {/* 标签 */}
          <div>
            <Space wrap>
              {topic.tags.map((tag, index) => (
                <Tag
                  key={index}
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

          {/* 元信息 */}
          <div style={{ color: '#888', fontSize: 14 }}>
            <Space split="·" wrap>
              <span>📅 创建时间：{formatDate(topic.created_at)}</span>
              {topic.updated_at && (
                <span>🔄 更新时间：{formatDate(topic.updated_at)}</span>
              )}
              <span>📍 来源：{topic.source_type || '未知'}</span>
              {topic.prompt_name && (
                <span>🤖 提示词：{topic.prompt_name}</span>
              )}
            </Space>
          </div>

          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '12px 0' }} />

          {/* 选题内容 */}
          <div>
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              marginBottom: 16,
              color: '#d1d5db'
            }}>
              📝 选题内容
            </h3>
            <div style={{ 
              color: '#e5e7eb',
              lineHeight: 1.8,
              fontSize: 15,
              whiteSpace: 'pre-wrap',
              padding: 20,
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              {topic.refined_content}
            </div>
          </div>
        </Space>
      </Card>

      {/* 原始素材卡片 */}
      {topic.material && (
        <Card
          title={
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              📄 原始素材
            </span>
          }
          style={{
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(17, 24, 39, 0.6)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* 素材信息 */}
            <div style={{ color: '#888', fontSize: 13 }}>
              <Space split="·">
                {topic.material.title && (
                  <span>标题：{topic.material.title}</span>
                )}
                <span>来源：{topic.material.source_type || '未知'}</span>
                {topic.material.file_name && (
                  <span>文件：{topic.material.file_name}</span>
                )}
                <span>创建时间：{formatDate(topic.material.created_at)}</span>
              </Space>
            </div>

            {/* 素材内容（折叠） */}
            <Collapse
              defaultActiveKey={[]}
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <Panel 
                header="查看原始内容" 
                key="1"
                style={{ borderBottom: 'none' }}
              >
                <div style={{ 
                  color: '#d1d5db',
                  lineHeight: 1.8,
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 400,
                  overflow: 'auto',
                  padding: 12
                }}>
                  {topic.material.content}
                </div>
              </Panel>
            </Collapse>

            {/* 统计信息 */}
            <div style={{ 
              padding: 16,
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <Space split="·" style={{ color: '#93c5fd', fontSize: 13 }}>
                <span>原文字数：{topic.material.content?.length || 0} 字</span>
                <span>提炼后字数：{topic.refined_content?.length || 0} 字</span>
                <span>压缩比：{
                  topic.material.content?.length > 0
                    ? Math.round((topic.refined_content?.length / topic.material.content.length) * 100)
                    : 0
                }%</span>
              </Space>
            </div>
          </Space>
        </Card>
      )}
    </div>
  )
}

