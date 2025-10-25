/**
 * Topics.jsx - 选题列表页面
 * 功能：展示所有选题、搜索、标签筛选、分页
 */

import { useState, useEffect } from 'react'
import { Card, Input, Tag, Space, Button, Spin, Empty, message, Pagination } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { topicApi } from '../api'

const { Search } = Input

// 预设标签
const PRESET_TAGS = [
  '商业思维',
  '科技趋势',
  '生活方式',
  '创业故事',
  '个人成长',
  '情感励志'
]

export default function Topics() {
  const [loading, setLoading] = useState(false)
  const [topics, setTopics] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)

  // 加载选题列表
  const loadTopics = async () => {
    setLoading(true)
    
    try {
      const params = {
        page,
        per_page: perPage
      }
      
      if (searchKeyword) {
        params.search = searchKeyword
      }
      
      if (selectedTag) {
        params.tags = selectedTag
      }
      
      console.log('加载选题列表:', params)
      
      const response = await topicApi.getList(params)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        setTopics(response.data.items)
        setTotal(response.data.total)
      } else {
        message.error(response.message || '加载失败')
      }
      
    } catch (error) {
      console.error('加载选题失败:', error)
      message.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadTopics()
  }, [page, selectedTag])

  // 搜索
  const handleSearch = (value) => {
    setSearchKeyword(value)
    setPage(1) // 重置到第一页
    setTimeout(() => loadTopics(), 100)
  }

  // 标签筛选
  const handleTagFilter = (tag) => {
    if (selectedTag === tag) {
      setSelectedTag(null) // 取消筛选
    } else {
      setSelectedTag(tag) // 选择筛选
    }
    setPage(1) // 重置到第一页
  }

  // 分页
  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 格式化日期
  const formatDate = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now - date
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 7) {
      return date.toLocaleDateString('zh-CN')
    } else if (days > 0) {
      return `${days} 天前`
    } else if (hours > 0) {
      return `${hours} 小时前`
    } else if (minutes > 0) {
      return `${minutes} 分钟前`
    } else {
      return '刚刚'
    }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 20px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          📚 选题库
        </h1>
        <div style={{ color: '#888', fontSize: 14 }}>
          共 {total} 个选题
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 搜索框 */}
          <Search
            size="large"
            placeholder="搜索选题标题或内容..."
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            onSearch={handleSearch}
            style={{ maxWidth: 600 }}
          />

          {/* 标签筛选 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              按标签筛选：
            </div>
            <Space wrap>
              {PRESET_TAGS.map(tag => (
                <Tag
                  key={tag}
                  style={{
                    padding: '6px 12px',
                    fontSize: 14,
                    cursor: 'pointer',
                    border: selectedTag === tag
                      ? '2px solid #3b82f6'
                      : '1px solid rgba(255, 255, 255, 0.2)',
                    background: selectedTag === tag
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
                      : 'rgba(17, 24, 39, 0.6)',
                    color: selectedTag === tag ? '#fff' : '#d1d5db'
                  }}
                  onClick={() => handleTagFilter(tag)}
                >
                  {selectedTag === tag && '✓ '}{tag}
                </Tag>
              ))}
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSelectedTag(null)
                  setSearchKeyword('')
                  setPage(1)
                }}
              >
                重置
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {/* 选题列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#888' }}>加载中...</div>
        </div>
      ) : topics.length === 0 ? (
        <Empty
          description={
            searchKeyword || selectedTag
              ? '没有找到匹配的选题'
              : '还没有保存任何选题'
          }
          style={{ padding: 60 }}
        />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {topics.map(topic => (
            <Card
              key={topic.id}
              hoverable
              style={{
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(17, 24, 39, 0.6)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer'
              }}
              bodyStyle={{ padding: 24 }}
              onClick={() => navigate(`/topics/${topic.id}`)}
            >
              <div>
                {/* 标题 */}
                <h3 style={{ 
                  fontSize: 18, 
                  fontWeight: 600, 
                  marginBottom: 12,
                  color: '#fff'
                }}>
                  {topic.title}
                </h3>

                {/* 内容预览 */}
                <div style={{ 
                  color: '#d1d5db', 
                  marginBottom: 16,
                  lineHeight: 1.6,
                  maxHeight: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {topic.refined_content}
                </div>

                {/* 标签 */}
                <div style={{ marginBottom: 16 }}>
                  <Space wrap>
                    {topic.tags.map((tag, index) => (
                      <Tag
                        key={index}
                        style={{
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
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: '#888',
                  fontSize: 13
                }}>
                  <Space split="·">
                    <span>📅 {formatDate(topic.created_at)}</span>
                    <span>📍 {topic.source_type || '未知'}</span>
                    {topic.prompt_name && (
                      <span>🤖 {topic.prompt_name}</span>
                    )}
                  </Space>
                  
                  <Button 
                    type="link" 
                    style={{ padding: 0 }}
                    onClick={() => navigate(`/topics/${topic.id}`)}
                  >
                    查看详情 →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      )}

      {/* 分页 */}
      {total > perPage && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={perPage}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => `共 ${total} 条`}
          />
        </div>
      )}
    </div>
  )
}

