/**
 * Materials.jsx - 素材库页面（优化版）
 * 功能：瀑布流布局、高级筛选、批量AI提炼
 */

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Spin, Empty, message, Checkbox, Tag, Select, Modal } from 'antd'
import { SearchOutlined, ThunderboltOutlined, ClearOutlined, FilterOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'
import useStore from '../store/useStore'

const { Search } = Input
const { TextArea } = Input

// 来源类型映射
const SOURCE_TYPES = {
  'twitter': { label: '推特', emoji: '🐦', color: '#1DA1F2' },
  'xiaohongshu': { label: '小红书', emoji: '📕', color: '#FF2442' },
  'podcast': { label: '播客', emoji: '🎙️', color: '#9333EA' },
  'douyin': { label: '抖音', emoji: '📱', color: '#FE2C55' },
  'other': { label: '其他', emoji: '📝', color: '#64748B' }
}

export default function Materials() {
  const navigate = useNavigate()
  const { setCurrentMaterial } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50) // 瀑布流显示更多
  const [selectedIds, setSelectedIds] = useState([])
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sourceFilter, setSourceFilter] = useState(undefined)
  const [showFilters, setShowFilters] = useState(false)
  
  // 查看素材详情
  const [viewingMaterial, setViewingMaterial] = useState(null)

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
      
      if (sourceFilter) {
        params.source_type = sourceFilter
      }
      
      const response = await materialApi.getList(params)
      
      if (response.code === 200) {
        const items = response.data.items || []
        setMaterials(items)
        setTotal(response.data.total || items.length)
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
  }, [page, sourceFilter])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    loadMaterials()
  }

  // 清除筛选
  const handleClearFilters = () => {
    setSearchKeyword('')
    setSourceFilter(undefined)
    setPage(1)
    message.success('筛选条件已清除')
    setTimeout(() => loadMaterials(), 100)
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

    const selectedMaterial = materials.find(m => m.id === selectedIds[0])
    if (selectedMaterial) {
      setCurrentMaterial({
        id: selectedMaterial.id,
        content: selectedMaterial.content_full,
        source_type: selectedMaterial.source_type,
        title: selectedMaterial.title
      })
      navigate('/refine')
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
  
  // 查看素材详情
  const handleViewMaterial = (material, e) => {
    e.stopPropagation() // 阻止卡片点击事件
    setViewingMaterial(material)
  }

  // 加载更多
  const handleLoadMore = () => {
    if (materials.length < total) {
      setPage(page + 1)
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

      {/* 搜索和筛选栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 主操作栏 */}
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Space>
              <Search
                size="large"
                placeholder="搜索标题或内容..."
                allowClear
                enterButton={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 400 }}
              />
              <Button
                size="large"
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? '收起筛选' : '高级筛选'}
              </Button>
            </Space>
            <Space>
              <Button
                size="large"
                icon={<ClearOutlined />}
                onClick={handleClearFilters}
                disabled={!searchKeyword && !sourceFilter}
              >
                清除筛选
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
                AI 提炼 ({selectedIds.length})
              </Button>
            </Space>
          </Space>

          {/* 高级筛选 */}
          {showFilters && (
            <div style={{ 
              padding: 16, 
              background: 'rgba(17, 24, 39, 0.5)',
              borderRadius: 8 
            }}>
              <Space size="large" wrap>
                {/* 来源平台筛选 */}
                <div>
                  <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>来源平台</div>
                  <Select
                    size="large"
                    placeholder="全部平台"
                    allowClear
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    style={{ width: 180 }}
                    options={[
                      { label: '🐦 推特', value: 'twitter' },
                      { label: '📕 小红书', value: 'xiaohongshu' },
                      { label: '🎙️ 播客', value: 'podcast' },
                      { label: '📱 抖音', value: 'douyin' },
                      { label: '📝 其他', value: 'other' }
                    ]}
                  />
                </div>

                <div style={{ paddingTop: 24 }}>
                  <Button 
                    type="primary" 
                    onClick={handleSearch}
                  >
                    应用筛选
                  </Button>
                </div>
              </Space>
            </div>
          )}

          {/* 批量操作 */}
          {materials.length > 0 && (
            <div style={{ paddingTop: 8 }}>
              <Checkbox
                checked={selectedIds.length === materials.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < materials.length}
                onChange={handleSelectAll}
              >
                <span style={{ color: '#d1d5db' }}>全选本页</span>
              </Checkbox>
            </div>
          )}
        </Space>
      </Card>

      {/* 素材列表 - 瀑布流布局 */}
      {loading && materials.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#888' }}>加载中...</div>
        </div>
      ) : materials.length === 0 ? (
        <Empty
          description={
            searchKeyword || sourceFilter
              ? '没有找到匹配的素材'
              : '还没有添加任何素材'
          }
          style={{ padding: 60 }}
        >
          {!searchKeyword && !sourceFilter && (
            <Button type="primary" onClick={() => navigate('/')}>
              立即添加
            </Button>
          )}
        </Empty>
      ) : (
        <>
          {/* 瀑布流网格 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: 24
          }}>
            {materials.map(material => {
              const sourceInfo = SOURCE_TYPES[material.source_type] || SOURCE_TYPES.other
              const isSelected = selectedIds.includes(material.id)
              
              return (
                <Card
                  key={material.id}
                  hoverable
                  style={{
                    borderRadius: 12,
                    border: isSelected
                      ? '2px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(17, 24, 39, 0.6)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s'
                  }}
                  bodyStyle={{ padding: 16 }}
                >
                  {/* 复选框和来源标签 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectOne(material.id)}
                    />
                    <Tag 
                      color={sourceInfo.color}
                      style={{ margin: 0, borderRadius: 6 }}
                    >
                      {sourceInfo.emoji} {sourceInfo.label}
                    </Tag>
                  </div>

                  {/* 标题 */}
                  <h3 style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    marginBottom: 12,
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {material.title}
                  </h3>

                  {/* 内容预览 */}
                  <div style={{ 
                    color: '#d1d5db', 
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginBottom: 16,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical',
                    minHeight: 88
                  }}>
                    {material.content}
                  </div>

                  {/* 元信息和操作 */}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: 12,
                    marginTop: 8
                  }}>
                    <div style={{ color: '#888', fontSize: 12 }}>
                      <div>📅 {formatDate(material.created_at)}</div>
                      <div>📝 {material.content_length} 字</div>
                    </div>
                    <Space size="small">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => handleViewMaterial(material, e)}
                        style={{ color: '#3b82f6' }}
                      >
                        查看
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectOne(material.id)
                        }}
                        style={{ 
                          color: isSelected ? '#10b981' : '#888'
                        }}
                      >
                        {isSelected ? '✓ 已选' : '选择'}
                      </Button>
                    </Space>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* 加载更多 */}
          {materials.length < total && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Button
                size="large"
                onClick={handleLoadMore}
                loading={loading}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#3b82f6'
                }}
              >
                加载更多 ({materials.length} / {total})
              </Button>
            </div>
          )}
        </>
      )}

      {/* 素材详情弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{viewingMaterial?.title || '素材详情'}</span>
            {viewingMaterial && (
              <Tag color={SOURCE_TYPES[viewingMaterial.source_type]?.color}>
                {SOURCE_TYPES[viewingMaterial.source_type]?.emoji} {SOURCE_TYPES[viewingMaterial.source_type]?.label}
              </Tag>
            )}
          </div>
        }
        open={viewingMaterial !== null}
        onCancel={() => setViewingMaterial(null)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setViewingMaterial(null)}>
            关闭
          </Button>,
          <Button
            key="select"
            type="primary"
            onClick={() => {
              if (viewingMaterial) {
                setCurrentMaterial({
                  id: viewingMaterial.id,
                  content: viewingMaterial.content_full,
                  source_type: viewingMaterial.source_type,
                  title: viewingMaterial.title
                })
                navigate('/refine')
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none'
            }}
          >
            AI 提炼此素材
          </Button>
        ]}
      >
        {viewingMaterial && (
          <div>
            {/* 元信息 */}
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 8,
              color: '#888',
              fontSize: 13
            }}>
              <Space split="·">
                <span>📅 {formatDate(viewingMaterial.created_at)}</span>
                <span>📝 {viewingMaterial.content_length} 字</span>
                {viewingMaterial.file_name && (
                  <span>📄 {viewingMaterial.file_name}</span>
                )}
              </Space>
            </div>

            {/* 完整内容 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: '#d1d5db' }}>
                完整内容
              </div>
              <TextArea
                value={viewingMaterial.content_full}
                readOnly
                autoSize={{ minRows: 10, maxRows: 30 }}
                style={{
                  background: 'rgba(17, 24, 39, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d1d5db'
                }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
