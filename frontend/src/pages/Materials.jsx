/**
 * Materials.jsx - 素材库页面（优化版）
 * 功能：瀑布流布局、高级筛选、批量AI提炼
 */

import { useState, useEffect } from 'react'
import { Card, Input, Button, Space, Spin, Empty, message, Checkbox, Tag, Select, Modal, Popconfirm, Row, Col, Statistic } from 'antd'
import { SearchOutlined, ThunderboltOutlined, ClearOutlined, FilterOutlined, EyeOutlined, DeleteOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi, tagApi } from '../api'
import useStore from '../store/useStore'
import { Pie, Column } from '@ant-design/charts'

const { Search } = Input
const { TextArea } = Input

// 来源类型映射
const SOURCE_TYPE_MAP = {
  'twitter': { label: '推特', emoji: '🐦', color: '#1DA1F2' },
  'xiaohongshu': { label: '小红书', emoji: '📕', color: '#FF2442' },
  'podcast': { label: '播客', emoji: '🎙️', color: '#9333EA' },
  'douyin': { label: '抖音', emoji: '📱', color: '#FE2C55' },
  'weibo': { label: '微博', emoji: '📱', color: '#FF6B35' },
  'other': { label: '其他', emoji: '📝', color: '#64748B' }
}

export default function Materials() {
  const navigate = useNavigate()
  const { setCurrentMaterial, setBatchMaterials } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50) // 瀑布流显示更多
  const [selectedIds, setSelectedIds] = useState([])
  
  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sourceFilter, setSourceFilter] = useState(undefined)
  const [tagFilter, setTagFilter] = useState(undefined)
  const [showFilters, setShowFilters] = useState(false)
  
  // 查看素材详情
  const [viewingMaterial, setViewingMaterial] = useState(null)
  
  // 删除状态
  const [deleting, setDeleting] = useState(false)
  
  // 标签相关状态
  const [tags, setTags] = useState([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [materialTags, setMaterialTags] = useState([])
  const [newTagInput, setNewTagInput] = useState('')
  
  // 统计相关状态
  const [showStatistics, setShowStatistics] = useState(false)
  const [statisticsData, setStatisticsData] = useState({
    tagStats: [],
    sourceStats: [],
    totalMaterials: 0,
    totalWords: 0
  })
  
  // 每日灵感相关状态
  const [dailyInspiration, setDailyInspiration] = useState(null)
  const [inspirationLoading, setInspirationLoading] = useState(false)

  // 获取每日灵感
  const getDailyInspiration = async () => {
    setInspirationLoading(true)
    try {
      // 生成基于日期的随机种子，确保每天的内容相对固定
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const seed = today.split('-').join('')
      
      // 灵感主题列表
      const inspirationTopics = [
        "💡 如何用AI提升工作效率",
        "🚀 创业者的思维模式",
        "📱 短视频内容创作技巧",
        "🎯 个人品牌建设策略",
        "💼 职场沟通的艺术",
        "🌟 产品设计的用户体验",
        "📈 数据分析驱动决策",
        "🎨 创意营销案例分析",
        "🔍 市场趋势洞察",
        "⚡ 时间管理方法论",
        "🎪 社交媒体运营策略",
        "💎 投资理财基础知识",
        "🏃‍♂️ 健康生活方式",
        "📚 终身学习的重要性",
        "🌍 可持续发展理念",
        "🎵 音乐与情感表达",
        "🍳 美食文化的传承",
        "🏠 家居设计美学",
        "✈️ 旅行见闻分享",
        "🎭 电影艺术赏析"
      ]
      
      // 使用日期种子生成随机索引
      const randomIndex = parseInt(seed) % inspirationTopics.length
      const selectedTopic = inspirationTopics[randomIndex]
      
      // 生成相关的子主题
      const subTopics = [
        "从用户痛点出发",
        "数据驱动的决策",
        "创新思维的应用",
        "跨领域知识整合",
        "实践案例分享",
        "未来趋势预测"
      ]
      
      const randomSubIndex = (parseInt(seed) + 1) % subTopics.length
      const selectedSubTopic = subTopics[randomSubIndex]
      
      setDailyInspiration({
        topic: selectedTopic,
        subTopic: selectedSubTopic,
        date: today,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'][randomIndex % 8]
      })
      
    } catch (error) {
      console.error('获取每日灵感失败:', error)
    } finally {
      setInspirationLoading(false)
    }
  }

  // 计算统计数据
  const calculateStatistics = (materialsList) => {
    const tagCount = {}
    const sourceCount = {}
    let totalWords = 0
    
    materialsList.forEach(material => {
      // 统计标签
      if (material.tags && Array.isArray(material.tags)) {
        material.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1
        })
      }
      
      // 统计来源
      const sourceType = material.source_type || 'other'
      sourceCount[sourceType] = (sourceCount[sourceType] || 0) + 1
      
      // 统计字数
      if (material.content_length) {
        totalWords += material.content_length
      }
    })
    
    // 转换为图表数据格式
    const tagStats = Object.entries(tagCount)
      .map(([tag, count]) => ({
        type: tag,
        value: count,
        percent: ((count / materialsList.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
    
    const sourceStats = Object.entries(sourceCount)
      .map(([source, count]) => ({
        source: SOURCE_TYPE_MAP[source]?.label || source,
        count: count,
        emoji: SOURCE_TYPE_MAP[source]?.emoji || '📝',
        color: SOURCE_TYPE_MAP[source]?.color || '#64748B'
      }))
      .sort((a, b) => b.count - a.count)
    
    setStatisticsData({
      tagStats,
      sourceStats,
      totalMaterials: materialsList.length,
      totalWords
    })
  }

  // 加载所有素材数据用于统计
  const loadAllMaterialsForStats = async () => {
    try {
      const response = await materialApi.getList({ 
        page: 1, 
        per_page: 1000 // 获取足够多的数据用于统计
      })
      
      if (response.code === 200) {
        const allMaterials = response.data.items || []
        calculateStatistics(allMaterials)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

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
      
      if (tagFilter) {
        params.tag = tagFilter
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

  // 加载标签列表
  const loadTags = async () => {
    try {
      const response = await tagApi.getList()
      if (response.code === 200) {
        setTags(response.data.tags || [])
      }
    } catch (error) {
      console.error('加载标签失败:', error)
    }
  }

  // 初始加载
  useEffect(() => {
    loadMaterials()
    loadTags()
    getDailyInspiration()
  }, [page, sourceFilter, tagFilter])

  // 搜索
  const handleSearch = () => {
    setPage(1)
    loadMaterials()
  }

  // 清除筛选
  const handleClearFilters = () => {
    setSearchKeyword('')
    setSourceFilter(undefined)
    setTagFilter(undefined)
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
    console.log('AI提炼按钮被点击，选中素材数量:', selectedIds.length)
    
    if (selectedIds.length === 0) {
      message.warning('请先选择要提炼的素材')
      return
    }

    if (selectedIds.length > 1) {
      message.info('批量提炼功能即将推出，当前仅支持单个素材提炼')
      return
    }

    const selectedMaterial = materials.find(m => m.id === selectedIds[0])
    console.log('选中的素材:', selectedMaterial)
    
    if (selectedMaterial) {
      setCurrentMaterial({
        id: selectedMaterial.id,
        content: selectedMaterial.content_full,
        source_type: selectedMaterial.source_type,
        title: selectedMaterial.title
      })
      console.log('准备跳转到提炼页面')
      navigate('/refine')
    }
  }

  // 批量提炼选中的素材
  const handleBatchRefine = () => {
    console.log('批量提炼按钮被点击，选中素材数量:', selectedIds.length)
    
    if (selectedIds.length < 2) {
      message.warning('请选择至少2个素材进行批量提炼')
      return
    }

    // 获取选中的素材
    const selectedMaterials = materials.filter(m => selectedIds.includes(m.id))
    console.log('选中的素材:', selectedMaterials)
    
    // 设置批量素材到全局状态
    setBatchMaterials(selectedMaterials)
    
    console.log('准备跳转到批量提炼页面')
    navigate('/refine', { state: { isBatch: true } })
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

  // 删除单个素材
  const handleDeleteMaterial = async (materialId) => {
    console.log('开始删除素材:', materialId)
    setDeleting(true)
    
    try {
      const response = await materialApi.delete(materialId)
      console.log('删除响应:', response)
      
      if (response.code === 200) {
        // 从列表中移除
        setMaterials(materials.filter(m => m.id !== materialId))
        setTotal(total - 1)
        
        // 如果删除的是已选中的素材，从选中列表中移除
        if (selectedIds.includes(materialId)) {
          setSelectedIds(selectedIds.filter(id => id !== materialId))
        }
        
        message.success('素材删除成功')
      } else {
        message.error(response.data.message || '删除失败')
      }
      
    } catch (error) {
      console.error('删除素材失败:', error)
      message.error('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  // 批量删除选中的素材
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要删除的素材')
      return
    }

    console.log('🗑️ 开始批量删除，选中ID:', selectedIds)
    setDeleting(true)

    try {
      // 逐个删除选中的素材
      const deletePromises = selectedIds.map(id => {
        console.log('删除素材 ID:', id)
        return materialApi.delete(id)
      })

      const results = await Promise.allSettled(deletePromises)

      // 调试：打印所有结果
      console.log('删除结果:', results)
      results.forEach((result, index) => {
        console.log(`结果 ${index}:`, {
          status: result.status,
          value: result.value,
          reason: result.reason
        })
      })

      // 检查删除结果
      const successResults = results.filter(result => {
        if (result.status === 'fulfilled') {
          console.log('成功结果value:', result.value)
          // 响应拦截器返回 response.data，所以直接检查 code
          return result.value && result.value.code === 200
        }
        return false
      })

      const successCount = successResults.length
      const failedCount = selectedIds.length - successCount

      console.log(`✅ 成功: ${successCount}, ❌ 失败: ${failedCount}`)

      if (successCount > 0) {
        message.success(`成功删除 ${successCount} 个素材${failedCount > 0 ? `，${failedCount} 个失败` : ''}`)

        // 清空选中状态
        setSelectedIds([])

        // 刷新列表
        await loadMaterials()
      } else {
        message.error('删除失败，请重试')
        console.error('所有删除都失败了')
      }

    } catch (error) {
      console.error('❌ 批量删除异常:', error)
      message.error('删除失败：' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  // 打开标签编辑弹窗
  const handleEditTags = (material) => {
    setEditingMaterial(material)
    setMaterialTags(material.tags || [])
    setShowTagModal(true)
  }

  // 保存素材标签
  const handleSaveMaterialTags = async () => {
    if (!editingMaterial) return

    try {
      const response = await tagApi.updateMaterialTags({
        material_ids: [editingMaterial.id],
        tags: materialTags
      })

      if (response.code === 200) {
        // 更新本地数据
        setMaterials(materials.map(m => 
          m.id === editingMaterial.id 
            ? { ...m, tags: materialTags }
            : m
        ))
        
        message.success('标签保存成功')
        setShowTagModal(false)
        loadTags() // 重新加载标签使用次数
      } else {
        message.error(response.message || '保存失败')
      }
    } catch (error) {
      console.error('保存标签失败:', error)
      message.error('保存失败，请重试')
    }
  }

  // 批量设置标签
  const handleBatchSetTags = () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要设置标签的素材')
      return
    }
    
    setEditingMaterial({ id: 'batch', title: `批量设置标签 (${selectedIds.length}个素材)` })
    setMaterialTags([])
    setShowTagModal(true)
  }

  // 批量保存标签
  const handleBatchSaveTags = async () => {
    try {
      const response = await tagApi.updateMaterialTags({
        material_ids: selectedIds,
        tags: materialTags
      })

      if (response.code === 200) {
        // 更新本地数据
        setMaterials(materials.map(m => 
          selectedIds.includes(m.id)
            ? { ...m, tags: materialTags }
            : m
        ))
        
        message.success(`成功为 ${selectedIds.length} 个素材设置标签`)
        setShowTagModal(false)
        setSelectedIds([])
        loadTags() // 重新加载标签使用次数
      } else {
        message.error(response.message || '保存失败')
      }
    } catch (error) {
      console.error('批量保存标签失败:', error)
      message.error('保存失败，请重试')
    }
  }

  // 创建新标签
  const handleCreateTag = async (tagName) => {
    try {
      const response = await tagApi.create({
        name: tagName,
        color: '#3b82f6' // 默认颜色
      })

      if (response.data.code === 200) {
        message.success(`标签"${tagName}"创建成功`)
        loadTags() // 重新加载标签列表
        
        // 如果当前正在编辑标签，自动添加到当前标签中
        if (showTagModal && !materialTags.includes(tagName)) {
          setMaterialTags([...materialTags, tagName])
        }
      } else {
        message.error(response.data.message || '创建标签失败')
      }
    } catch (error) {
      console.error('创建标签失败:', error)
      message.error('创建标签失败，请重试')
    }
  }

  // 快速添加自定义标签
  const handleQuickAddTag = async () => {
    if (newTagInput.trim()) {
      const tagName = newTagInput.trim()
      if (!materialTags.includes(tagName)) {
        // 检查是否已存在该标签
        const existingTag = tags.find(t => t.name === tagName)
        if (existingTag) {
          // 如果标签已存在，直接添加到当前选择
          setMaterialTags([...materialTags, tagName])
          setNewTagInput('')
          message.success(`已添加标签"${tagName}"`)
        } else {
          // 如果标签不存在，先添加到当前选择，然后创建标签
          setMaterialTags([...materialTags, tagName])
          setNewTagInput('')
          
          // 异步创建标签（不等待结果）
          try {
            const response = await tagApi.create({
              name: tagName,
              color: '#3b82f6'
            })
            if (response.data.code === 200) {
              message.success(`标签"${tagName}"创建并添加成功`)
              loadTags() // 重新加载标签列表
            }
          } catch (error) {
            console.error('创建标签失败:', error)
            // 即使创建失败，标签也已经添加到当前选择中了
            message.warning(`标签"${tagName}"已添加，但创建到标签库失败`)
          }
        }
      } else {
        message.warning('该标签已存在')
        setNewTagInput('')
      }
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

      {/* 每日灵感 */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 16,
          background: dailyInspiration ? `linear-gradient(135deg, ${dailyInspiration.color}15 0%, ${dailyInspiration.color}25 100%)` : 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${dailyInspiration ? `${dailyInspiration.color}40` : 'rgba(255, 255, 255, 0.1)'}`,
          position: 'relative',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 12 
            }}>
              <span style={{ 
                fontSize: 20, 
                marginRight: 8,
                filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))'
              }}>
                ✨
              </span>
              <h3 style={{ 
                margin: 0, 
                fontSize: 18, 
                fontWeight: 600,
                color: dailyInspiration ? dailyInspiration.color : '#d1d5db',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.2)'
              }}>
                每日灵感
              </h3>
              <span style={{ 
                marginLeft: 12, 
                fontSize: 12, 
                color: '#9ca3af',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {dailyInspiration?.date || new Date().toISOString().split('T')[0]}
              </span>
            </div>
            
            {inspirationLoading ? (
              <div style={{ color: '#9ca3af', fontSize: 14 }}>
                正在生成今日灵感...
              </div>
            ) : dailyInspiration ? (
              <div>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  marginBottom: 8,
                  color: dailyInspiration.color,
                  textShadow: '0 0 8px rgba(255, 255, 255, 0.2)'
                }}>
                  {dailyInspiration.topic}
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: '#d1d5db',
                  opacity: 0.9
                }}>
                  建议角度：{dailyInspiration.subTopic}
                </div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 14 }}>
                暂无灵感数据
              </div>
            )}
          </div>
          
          <div style={{ marginLeft: 16 }}>
            <Button
              size="small"
              onClick={getDailyInspiration}
              loading={inspirationLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#d1d5db'
              }}
            >
              🔄 刷新灵感
            </Button>
          </div>
        </div>
        
        {/* 装饰性背景元素 */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          background: dailyInspiration ? `${dailyInspiration.color}20` : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          zIndex: -1
        }} />
      </Card>

      {/* 搜索和筛选栏 */}
      <Card style={{ marginBottom: 24, position: 'relative', zIndex: 10 }}>
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
                onClick={() => navigate('/recycle-bin')}
                style={{
                  background: 'rgba(17, 24, 39, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d1d5db'
                }}
              >
                🗑️ 回收站
              </Button>
              <Button
                size="large"
                onClick={() => {
                  if (!showStatistics) {
                    loadAllMaterialsForStats()
                  }
                  setShowStatistics(!showStatistics)
                }}
                icon={showStatistics ? <BarChartOutlined /> : <PieChartOutlined />}
                style={{
                  background: showStatistics ? 'rgba(59, 130, 246, 0.8)' : 'rgba(17, 24, 39, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#d1d5db'
                }}
              >
                {showStatistics ? '📊 隐藏统计' : '📊 数据统计'}
              </Button>
              <Button
                size="large"
                type="primary"
                danger
                onClick={() => {
                  console.log('发现选题灵感按钮被点击')
                  navigate('/topic-inspiration')
                }}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none'
                }}
              >
                💡 发现选题灵感
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<ThunderboltOutlined />}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleRefineSelected()
                }}
                disabled={selectedIds.length === 0}
                style={{
                  background: selectedIds.length > 0 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: 'none',
                  cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ⚡ AI 提炼 ({selectedIds.length})
              </Button>
                <Button
                  size="large"
                  icon={<ClearOutlined />}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClearFilters()
                  }}
                  disabled={!searchKeyword && !sourceFilter && !tagFilter}
                  style={{
                    cursor: (!searchKeyword && !sourceFilter && !tagFilter) ? 'not-allowed' : 'pointer'
                  }}
                >
                  清除筛选
                </Button>
              {selectedIds.length > 1 && (
                <Button
                  size="large"
                  type="primary"
                  danger
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('批量提炼按钮被点击')
                    handleBatchRefine()
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🔥 批量提炼 ({selectedIds.length})
                </Button>
              )}
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
                      { label: '📱 微博', value: 'weibo' },
                      { label: '📝 其他', value: 'other' }
                    ]}
                  />
                </div>

                {/* 标签筛选 */}
                <div>
                  <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>标签筛选</div>
                  <Select
                    size="large"
                    placeholder="选择标签"
                    allowClear
                    value={tagFilter}
                    onChange={setTagFilter}
                    style={{ width: 180 }}
                    options={tags.map(tag => ({
                      label: tag.name,
                      value: tag.name
                    }))}
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
            <div style={{ 
              paddingTop: 8, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <Checkbox
                checked={selectedIds.length === materials.length}
                indeterminate={selectedIds.length > 0 && selectedIds.length < materials.length}
                onChange={handleSelectAll}
              >
                <span style={{ color: '#d1d5db' }}>全选本页</span>
              </Checkbox>
              
              {selectedIds.length > 0 && (
                <Space>
                  <Button
                    size="small"
                    onClick={handleBatchSetTags}
                    style={{ marginLeft: 16 }}
                  >
                    🏷️ 设置标签 ({selectedIds.length})
                  </Button>
                  <Popconfirm
                    title="确认删除"
                    description={`确定要删除选中的 ${selectedIds.length} 个素材吗？此操作不可撤销。`}
                    onConfirm={handleBatchDelete}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deleting}
                    >
                      删除选中 ({selectedIds.length})
                    </Button>
                  </Popconfirm>
                </Space>
              )}
            </div>
          )}
        </Space>
      </Card>

      {/* 统计面板 */}
      {showStatistics && (
        <Card
          title={
            <Space>
              <PieChartOutlined />
              <span>📊 素材数据统计</span>
            </Space>
          }
          style={{
            marginBottom: 24,
            borderRadius: 16,
            background: 'rgba(17, 24, 39, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
          bodyStyle={{ padding: 24 }}
        >
          {/* 关键指标 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <Statistic
                  title="总素材数"
                  value={statisticsData.totalMaterials}
                  prefix="📄"
                  valueStyle={{ color: '#60a5fa' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Statistic
                  title="总字数"
                  value={statisticsData.totalWords}
                  prefix="📝"
                  valueStyle={{ color: '#6ee7b7' }}
                  formatter={(value) => `${value.toLocaleString()} 字`}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <Statistic
                  title="标签种类"
                  value={statisticsData.tagStats.length}
                  prefix="🏷️"
                  valueStyle={{ color: '#c084fc' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <Statistic
                  title="来源平台"
                  value={statisticsData.sourceStats.length}
                  prefix="🌐"
                  valueStyle={{ color: '#fbbf24' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 图表区域 */}
          <Row gutter={[24, 24]}>
            {/* 标签分布饼图 */}
            <Col xs={24} lg={12}>
              <Card
                title="🏷️ 标签分布"
                size="small"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {statisticsData.tagStats.length > 0 ? (
                  <Pie
                    data={statisticsData.tagStats}
                    angleField="value"
                    colorField="type"
                    radius={0.8}
                    label={{
                      type: 'outer',
                      content: '{name} {percentage}'
                    }}
                    interactions={[{ type: 'element-active' }]}
                    height={300}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    暂无标签数据
                  </div>
                )}
              </Card>
            </Col>

            {/* 来源平台柱状图 */}
            <Col xs={24} lg={12}>
              <Card
                title="🌐 来源平台分布"
                size="small"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {statisticsData.sourceStats.length > 0 ? (
                  <Column
                    data={statisticsData.sourceStats}
                    xField="source"
                    yField="count"
                    color={({ source }) => {
                      const stat = statisticsData.sourceStats.find(s => s.source === source)
                      return stat?.color || '#64748B'
                    }}
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.8
                      }
                    }}
                    height={300}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    暂无来源数据
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      )}

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
              const sourceInfo = SOURCE_TYPE_MAP[material.source_type] || SOURCE_TYPE_MAP.other
              const isSelected = selectedIds.includes(material.id)
              
              return (
                <Card
                  key={material.id}
                  hoverable
                  onClick={() => handleSelectOne(material.id)}
                  style={{
                    borderRadius: 12,
                    border: isSelected
                      ? '2px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: isSelected 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(17, 24, 39, 0.6)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  styles={{ body: { padding: 16 } }}
                >
                  {/* 顶部操作栏 */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 12,
                    position: 'relative'
                  }}>
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleSelectOne(material.id)}
                    />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag 
                        color={sourceInfo.color}
                        style={{ margin: 0, borderRadius: 6 }}
                      >
                        {sourceInfo.emoji} {sourceInfo.label}
                      </Tag>
                      
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除这个素材吗？此操作不可撤销。"
                        onConfirm={(e) => {
                          e.stopPropagation()
                          console.log('删除素材:', material.id)
                          handleDeleteMaterial(material.id)
                        }}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            color: '#ef4444',
                            opacity: 1,
                            transition: 'opacity 0.3s',
                            zIndex: 10,
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.8'
                          }}
                        />
                      </Popconfirm>
                    </div>
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
                    marginBottom: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    minHeight: 66
                  }}>
                    {material.content}
                  </div>

                  {/* 标签显示 */}
                  {material.tags && material.tags.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <Space wrap size="small">
                        {material.tags.map((tagName, index) => {
                          const tag = tags.find(t => t.name === tagName)
                          return (
                            <Tag
                              key={index}
                              color={tag?.color || '#3b82f6'}
                              style={{ fontSize: 11, margin: 0 }}
                            >
                              {tagName}
                            </Tag>
                          )
                        })}
                      </Space>
                    </div>
                  )}

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
                          handleEditTags(material)
                        }}
                        style={{ color: '#10b981' }}
                      >
                        🏷️
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
              <Tag color={SOURCE_TYPE_MAP[viewingMaterial.source_type]?.color}>
                {SOURCE_TYPE_MAP[viewingMaterial.source_type]?.emoji} {SOURCE_TYPE_MAP[viewingMaterial.source_type]?.label}
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

      {/* 标签编辑弹窗 */}
      <Modal
        title={editingMaterial?.id === 'batch' ? '批量设置标签' : '编辑标签'}
        open={showTagModal}
        onOk={editingMaterial?.id === 'batch' ? handleBatchSaveTags : handleSaveMaterialTags}
        onCancel={() => setShowTagModal(false)}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        {editingMaterial && (
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: '#d1d5db' }}>
                {editingMaterial.title}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                素材标签
              </div>
              
              {/* 快速添加标签 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 13, color: '#888' }}>
                  快速添加标签（直接添加到当前素材）
                </div>
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="输入标签名称，回车或点击添加"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onPressEnter={handleQuickAddTag}
                    style={{ 
                      background: 'rgba(17, 24, 39, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#d1d5db'
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={handleQuickAddTag}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none'
                    }}
                  >
                    添加
                  </Button>
                </Space.Compact>
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  💡 新标签会自动创建并添加到下方列表中
                </div>
              </div>

              {/* 选择现有标签 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 13, color: '#888' }}>
                  选择现有标签
                </div>
                <Select
                  mode="multiple"
                  placeholder="从现有标签中选择"
                  value={materialTags}
                  onChange={setMaterialTags}
                  style={{ width: '100%' }}
                  options={tags.map(tag => ({
                    label: tag.name,
                    value: tag.name
                  }))}
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                  showSearch
                />
              </div>

              {/* 当前标签显示 */}
              {materialTags.length > 0 && (
                <div>
                  <div style={{ marginBottom: 8, fontSize: 13, color: '#888' }}>
                    已选择 {materialTags.length} 个标签：
                  </div>
                  <Space wrap>
                    {materialTags.map((tagName, index) => {
                      const tag = tags.find(t => t.name === tagName)
                      return (
                        <Tag
                          key={index}
                          color={tag?.color || '#3b82f6'}
                          closable
                          onClose={() => {
                            setMaterialTags(materialTags.filter(t => t !== tagName))
                          }}
                          style={{ marginBottom: 4 }}
                        >
                          {tagName}
                        </Tag>
                      )
                    })}
                  </Space>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
