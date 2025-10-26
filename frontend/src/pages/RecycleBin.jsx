/**
 * RecycleBin.jsx - 回收站页面
 * 功能：显示已删除的素材，支持恢复和永久删除
 */

import { useState, useEffect } from 'react'
import { Card, Button, Space, message, Empty, List, Tag, Popconfirm, Modal } from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, UndoOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'

export default function RecycleBin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [viewingMaterial, setViewingMaterial] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 加载回收站素材
  const loadMaterials = async () => {
    setLoading(true)
    try {
      const response = await materialApi.getRecycleBin({
        page,
        per_page: perPage
      })

      if (response.code === 200) {
        setMaterials(response.data.materials || [])
        setTotal(response.data.total || 0)
      } else {
        message.error(response.message || '加载失败')
      }
    } catch (error) {
      console.error('加载回收站素材失败:', error)
      message.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [page])

  // 恢复素材
  const handleRestore = async (materialId) => {
    setRestoring(true)
    try {
      const response = await materialApi.restore(materialId)
      if (response.code === 200) {
        message.success('素材已恢复')
        loadMaterials() // 重新加载列表
      } else {
        message.error(response.message || '恢复失败')
      }
    } catch (error) {
      console.error('恢复素材失败:', error)
      message.error('恢复失败，请重试')
    } finally {
      setRestoring(false)
    }
  }

  // 永久删除素材
  const handlePermanentDelete = async (materialId) => {
    setDeleting(true)
    try {
      const response = await materialApi.permanentDelete(materialId)
      if (response.code === 200) {
        message.success('素材已永久删除')
        loadMaterials() // 重新加载列表
      } else {
        message.error(response.message || '删除失败')
      }
    } catch (error) {
      console.error('永久删除素材失败:', error)
      message.error('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  // 格式化日期
  const formatDate = (isoString) => {
    const date = new Date(isoString)
    const now = new Date()
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const timeStr = `${hours}:${minutes}`
    
    if (diff === 0) {
      return `今天 ${timeStr}`
    } else if (diff === 1) {
      return `昨天 ${timeStr}`
    } else if (diff < 7) {
      return `${diff} 天前`
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${month}-${day} ${timeStr}`
    }
  }

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/materials')}
          style={{ marginBottom: 16 }}
        >
          返回素材库
        </Button>
        
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
          🗑️ 回收站
        </h1>
        <p style={{ color: '#9ca3af', fontSize: 16 }}>
          已删除的素材会在这里保留，您可以恢复或永久删除它们
        </p>
      </div>

      {/* 回收站内容 */}
      <Card
        title={
          <Space>
            <span style={{ fontSize: 18, fontWeight: 600 }}>已删除的素材</span>
            <Tag color="orange">{total} 个</Tag>
          </Space>
        }
        loading={loading}
        style={{
          borderRadius: 16,
          background: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {materials.length === 0 ? (
          <Empty
            description="回收站为空"
            style={{ padding: '60px 0' }}
          />
        ) : (
          <List
            dataSource={materials}
            renderItem={(material) => (
              <List.Item
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '16px',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
                        {material.title || '无标题'}
                      </span>
                      <Tag color="red">已删除</Tag>
                      {material.tags && material.tags.length > 0 && (
                        <Space>
                          {material.tags.map((tag, index) => (
                            <Tag key={index} color="blue" size="small">
                              {tag}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      <div style={{ color: '#888', marginBottom: 8 }}>
                        {material.content}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        <Space>
                          <span>来源: {material.source_type}</span>
                          <span>创建: {formatDate(material.created_at)}</span>
                          <span style={{ color: '#ef4444' }}>
                            删除: {formatDate(material.deleted_at)}
                          </span>
                        </Space>
                      </div>
                    </div>
                  }
                />
                
                <Space>
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => setViewingMaterial(material)}
                  >
                    查看
                  </Button>
                  
                  <Popconfirm
                    title="恢复素材"
                    description="确定要恢复这个素材吗？"
                    onConfirm={() => handleRestore(material.id)}
                    okText="恢复"
                    cancelText="取消"
                    okButtonProps={{ loading: restoring }}
                  >
                    <Button
                      type="link"
                      icon={<UndoOutlined />}
                      style={{ color: '#10b981' }}
                    >
                      恢复
                    </Button>
                  </Popconfirm>
                  
                  <Popconfirm
                    title="永久删除"
                    description="确定要永久删除这个素材吗？此操作不可撤销！"
                    onConfirm={() => handlePermanentDelete(material.id)}
                    okText="永久删除"
                    cancelText="取消"
                    okButtonProps={{ 
                      danger: true, 
                      loading: deleting 
                    }}
                  >
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      永久删除
                    </Button>
                  </Popconfirm>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 素材详情模态框 */}
      <Modal
        title="素材详情"
        open={!!viewingMaterial}
        onCancel={() => setViewingMaterial(null)}
        footer={[
          <Button key="close" onClick={() => setViewingMaterial(null)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {viewingMaterial && (
          <div>
            <h3>{viewingMaterial.title || '无标题'}</h3>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="red">已删除</Tag>
                <Tag>{viewingMaterial.source_type}</Tag>
                {viewingMaterial.tags && viewingMaterial.tags.map((tag, index) => (
                  <Tag key={index} color="blue">{tag}</Tag>
                ))}
              </Space>
            </div>
            <div style={{ 
              background: '#f5f5f5', 
              padding: 16, 
              borderRadius: 8,
              whiteSpace: 'pre-wrap',
              maxHeight: 400,
              overflow: 'auto'
            }}>
              {viewingMaterial.content_full || viewingMaterial.content}
            </div>
            <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
              <p>创建时间: {new Date(viewingMaterial.created_at).toLocaleString()}</p>
              <p>删除时间: {new Date(viewingMaterial.deleted_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
