/**
 * Materials.jsx - 素材库页面
 * 功能：展示所有素材、选择素材、批量AI提炼
 */

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Spin, Empty, message, Pagination, Checkbox } from 'antd'
import { SearchOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'
import useStore from '../store/useStore'

const { Search } = Input

// 来源类型映射
const SOURCE_TYPES = {
  'twitter': '推特',
  'xiaohongshu': '小红书',
  'podcast': '播客',
  'douyin': '抖音',
  'other': '其他'
}

export default function Materials() {
  const navigate = useNavigate()
  const { setCurrentMaterial } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  // 加载素材列表
  const loadMaterials = async () => {
    setLoading(true)
    
    try {
      const params = {
        page,
        per_page: perPage
      }
      
      if (searchKeyword) {
        params.search = searchKeyword
      }
      
      console.log('加载素材列表:', params)
      
      const response = await materialApi.getList(params)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        setMaterials(response.data.items)
        setTotal(response.data.total)
      } else {
        message.error(response.message || '加载失败')
      }
      
    } catch (error) {
      console.error('加载素材失败:', error)
      message.error('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadMaterials()
  }, [page])

  // 搜索
  const handleSearch = (value) => {
    setSearchKeyword(value)
    setPage(1)
    setTimeout(() => loadMaterials(), 100)
  }

  // 分页
  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 全选/取消全选
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(materials.map(m => m.id))
    } else {
      setSelectedIds([])
    }
  }

  // 单选
  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // AI提炼选中的素材
  const handleRefineSelected = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要提炼的素材')
      return
    }

    if (selectedIds.length > 1) {
      message.info('批量提炼功能即将推出，当前仅支持单个素材提炼')
      return
    }

    // 获取选中的第一个素材
    const selectedMaterial = materials.find(m => m.id === selectedIds[0])
    if (selectedMaterial) {
      // 设置当前素材到store
      setCurrentMaterial({
        id: selectedMaterial.id,
        content: selectedMaterial.content_full,
        source_type: selectedMaterial.source_type,
        title: selectedMaterial.title
      })
      // 跳转到提炼页
      navigate('/refine')
    }
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
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
          📚 素材库
        </h1>
        <div style={{ color: '#888', fontSize: 14 }}>
          共 {total} 个素材 {selectedIds.length > 0 && `· 已选择 ${selectedIds.length} 个`}
        </div>
      </div>

      {/* 搜索和操作 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 搜索框 */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Search
              size="large"
              placeholder="搜索素材标题或内容..."
              allowClear
              enterButton={<><SearchOutlined /> 搜索</>}
              onSearch={handleSearch}
              style={{ maxWidth: 600 }}
            />
            <Space>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchKeyword('')
                  setPage(1)
                  setSelectedIds([])
                  loadMaterials()
                }}
              >
                刷新
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={handleRefineSelected}
                disabled={selectedIds.length === 0}
                style={{
                  background: selectedIds.length > 0 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : undefined,
                  border: 'none'
                }}
              >
                AI 提炼选中 ({selectedIds.length})
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      {/* 素材列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#888' }}>加载中...</div>
        </div>
      ) : materials.length === 0 ? (
        <Empty
          description={
            searchKeyword
              ? '没有找到匹配的素材'
              : '还没有添加任何素材'
          }
          style={{ padding: 60 }}
        >
          {!searchKeyword && (
            <Button type="primary" onClick={() => navigate('/')}>
              立即添加
            </Button>
          )}
        </Empty>
      ) : (
        <>
          {/* 全选选项 */}
          <div style={{ marginBottom: 16, padding: '0 8px' }}>
            <Checkbox
              checked={selectedIds.length === materials.length}
              indeterminate={selectedIds.length > 0 && selectedIds.length < materials.length}
              onChange={handleSelectAll}
            >
              <span style={{ color: '#d1d5db' }}>全选本页</span>
            </Checkbox>
          </div>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {materials.map(material => (
              <Card
                key={material.id}
                style={{
                  borderRadius: 12,
                  border: selectedIds.includes(material.id)
                    ? '2px solid #3b82f6'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(17, 24, 39, 0.6)',
                  backdropFilter: 'blur(10px)'
                }}
                bodyStyle={{ padding: 24 }}
              >
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* 复选框 */}
                  <div>
                    <Checkbox
                      checked={selectedIds.includes(material.id)}
                      onChange={() => handleSelectOne(material.id)}
                    />
                  </div>

                  {/* 内容 */}
                  <div style={{ flex: 1 }}>
                    {/* 标题 */}
                    <h3 style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      marginBottom: 12,
                      color: '#fff'
                    }}>
                      {material.title}
                    </h3>

                    {/* 内容预览 */}
                    <div style={{ 
                      color: '#d1d5db', 
                      marginBottom: 16,
                      lineHeight: 1.6,
                      maxHeight: 60,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {material.content}
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
                        <span>📅 {formatDate(material.created_at)}</span>
                        <span>📍 {SOURCE_TYPES[material.source_type] || material.source_type}</span>
                        <span>📝 {material.content_length} 字</span>
                        {material.file_name && (
                          <span>📄 {material.file_name}</span>
                        )}
                      </Space>
                      
                      <Button 
                        type="link" 
                        style={{ padding: 0 }}
                        onClick={() => {
                          setSelectedIds([material.id])
                          handleRefineSelected()
                        }}
                      >
                        立即提炼 →
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </>
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

