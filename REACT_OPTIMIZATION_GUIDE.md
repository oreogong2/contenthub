# React 前端优化指南

本文档记录 ContentHub 前端 React 组件的优化建议和修复方案。

## 📋 待优化问题

### 1. useEffect 依赖项缺失 ⚠️

**问题位置**:
- `frontend/src/pages/Materials.jsx:253-257`
- `frontend/src/pages/Topics.jsx:74`
- `frontend/src/pages/RecycleBin.jsx:46`
- 其他组件

**当前代码问题**:
```javascript
// ❌ 错误：函数未包含在依赖数组中
useEffect(() => {
  loadMaterials()
  loadTags()
  getDailyInspiration()
}, [page, sourceFilter, tagFilter])  // 缺少函数依赖
```

**修复方案**:

#### 方案 A: 使用 useCallback（推荐）

```javascript
import { useState, useEffect, useCallback } from 'react'

// 1. 用 useCallback 包装所有数据加载函数
const loadMaterials = useCallback(async () => {
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

    const response = await materialApi.getMaterials(params)

    if (response.code === 200) {
      setMaterials(response.data.materials || [])
      setTotal(response.data.total || 0)
    }
  } catch (error) {
    message.error('加载失败：' + error.message)
  } finally {
    setLoading(false)
  }
}, [page, perPage, searchKeyword, sourceFilter, tagFilter])  // ✅ 包含所有依赖

const loadTags = useCallback(async () => {
  try {
    const response = await tagApi.getTags()
    if (response.code === 200) {
      setTags(response.data || [])
    }
  } catch (error) {
    console.error('加载标签失败:', error)
  }
}, [])  // ✅ 无外部依赖

// 2. useEffect 只依赖函数本身
useEffect(() => {
  loadMaterials()
  loadTags()
}, [loadMaterials, loadTags])  // ✅ 正确依赖
```

#### 方案 B: 将函数定义移到 useEffect 内部

```javascript
useEffect(() => {
  // 将函数定义放在 useEffect 内部
  const loadMaterials = async () => {
    setLoading(true)
    // ... 加载逻辑
  }

  const loadTags = async () => {
    // ... 加载逻辑
  }

  loadMaterials()
  loadTags()
}, [page, perPage, searchKeyword, sourceFilter, tagFilter])  // ✅ 正确依赖
```

---

### 2. Materials.jsx 组件过大 📦

**问题**: Materials.jsx 有 1494 行代码，难以维护和测试

**影响**:
- 代码可读性差
- 难以复用
- 性能优化困难
- 增加 bug 风险

**拆分方案**:

#### 建议拆分结构

```
frontend/src/pages/Materials/
├── index.jsx                 # 主组件（约 200 行）
├── components/
│   ├── MaterialCard.jsx      # 素材卡片组件
│   ├── MaterialFilters.jsx   # 筛选器组件
│   ├── MaterialStats.jsx     # 统计面板组件
│   ├── BatchActions.jsx      # 批量操作组件
│   ├── TagManager.jsx        # 标签管理组件
│   └── MaterialViewer.jsx    # 素材详情查看器
├── hooks/
│   ├── useMaterials.js       # 素材数据管理 Hook
│   ├── useTags.js            # 标签管理 Hook
│   └── useBatchOperations.js # 批量操作 Hook
└── utils/
    └── materialHelpers.js    # 工具函数
```

#### 实施步骤

**第一步：提取工具函数**

创建 `frontend/src/pages/Materials/utils/materialHelpers.js`:

```javascript
// 来源类型映射
export const SOURCE_TYPE_MAP = {
  'twitter': { label: '推特', emoji: '🐦', color: '#1DA1F2' },
  'xiaohongshu': { label: '小红书', emoji: '📕', color: '#FF2442' },
  'podcast': { label: '播客', emoji: '🎙️', color: '#9333EA' },
  'douyin': { label: '抖音', emoji: '📱', color: '#FE2C55' },
  'weibo': { label: '微博', emoji: '📱', color: '#FF6B35' },
  'other': { label: '其他', emoji: '📝', color: '#64748B' }
}

// 格式化日期
export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 截取文本
export const truncateText = (text, maxLength = 200) => {
  if (!text) return ''
  return text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text
}
```

**第二步：提取自定义 Hook**

创建 `frontend/src/pages/Materials/hooks/useMaterials.js`:

```javascript
import { useState, useCallback } from 'react'
import { message } from 'antd'
import { materialApi } from '../../../api'

export const useMaterials = () => {
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50)

  const loadMaterials = useCallback(async (filters = {}) => {
    setLoading(true)

    try {
      const params = {
        page,
        per_page: perPage,
        ...filters
      }

      const response = await materialApi.getMaterials(params)

      if (response.code === 200) {
        setMaterials(response.data.materials || [])
        setTotal(response.data.total || 0)
      }
    } catch (error) {
      message.error('加载失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }, [page, perPage])

  const deleteMaterial = useCallback(async (id) => {
    try {
      const response = await materialApi.deleteMaterial(id)

      if (response.code === 200) {
        message.success('删除成功')
        await loadMaterials()
        return true
      }
    } catch (error) {
      message.error('删除失败：' + error.message)
      return false
    }
  }, [loadMaterials])

  return {
    loading,
    materials,
    total,
    page,
    perPage,
    setPage,
    loadMaterials,
    deleteMaterial
  }
}
```

**第三步：拆分 UI 组件**

创建 `frontend/src/pages/Materials/components/MaterialCard.jsx`:

```javascript
import { Card, Tag, Button, Space, Checkbox } from 'antd'
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { SOURCE_TYPE_MAP, formatDate, truncateText } from '../utils/materialHelpers'

export default function MaterialCard({
  material,
  selected,
  onSelect,
  onView,
  onDelete
}) {
  const sourceInfo = SOURCE_TYPE_MAP[material.source_type] || SOURCE_TYPE_MAP['other']

  return (
    <Card
      hoverable
      className="material-card"
      style={{
        height: '100%',
        borderLeft: `4px solid ${sourceInfo.color}`,
        opacity: selected ? 0.8 : 1
      }}
      bodyStyle={{ padding: '16px' }}
    >
      <div style={{ marginBottom: '12px' }}>
        <Checkbox
          checked={selected}
          onChange={(e) => onSelect(material.id, e.target.checked)}
        />
        <Tag color={sourceInfo.color} style={{ marginLeft: '8px' }}>
          {sourceInfo.emoji} {sourceInfo.label}
        </Tag>
      </div>

      <h3 style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {material.title || '无标题'}
      </h3>

      <p style={{
        color: '#666',
        fontSize: '14px',
        lineHeight: '1.6',
        marginBottom: '12px'
      }}>
        {truncateText(material.content, 150)}
      </p>

      <div style={{
        fontSize: '12px',
        color: '#999',
        marginBottom: '12px'
      }}>
        {formatDate(material.created_at)}
      </div>

      {material.tags && JSON.parse(material.tags).length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {JSON.parse(material.tags).map(tag => (
            <Tag key={tag} style={{ marginBottom: '4px' }}>
              {tag}
            </Tag>
          ))}
        </div>
      )}

      <Space>
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => onView(material)}
        >
          查看
        </Button>
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(material.id)}
        >
          删除
        </Button>
      </Space>
    </Card>
  )
}
```

**第四步：重构主组件**

创建 `frontend/src/pages/Materials/index.jsx`:

```javascript
import { useEffect } from 'react'
import { Row, Col, Spin } from 'antd'
import { useMaterials } from './hooks/useMaterials'
import { useTags } from './hooks/useTags'
import MaterialCard from './components/MaterialCard'
import MaterialFilters from './components/MaterialFilters'
import MaterialStats from './components/MaterialStats'
import BatchActions from './components/BatchActions'

export default function Materials() {
  // 使用自定义 Hook
  const {
    loading,
    materials,
    total,
    page,
    setPage,
    loadMaterials,
    deleteMaterial
  } = useMaterials()

  const { tags, loadTags } = useTags()

  // 初始加载
  useEffect(() => {
    loadMaterials()
    loadTags()
  }, [loadMaterials, loadTags])  // ✅ 正确依赖

  return (
    <div className="materials-page">
      <MaterialStats total={total} />
      <MaterialFilters onFilter={loadMaterials} tags={tags} />
      <BatchActions selectedCount={selectedIds.length} />

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {materials.map(material => (
            <Col xs={24} sm={12} md={8} lg={6} key={material.id}>
              <MaterialCard
                material={material}
                selected={selectedIds.includes(material.id)}
                onSelect={handleSelect}
                onView={handleView}
                onDelete={deleteMaterial}
              />
            </Col>
          ))}
        </Row>
      </Spin>
    </div>
  )
}
```

---

### 3. 性能优化建议

#### 使用 React.memo 避免不必要的重渲染

```javascript
import { memo } from 'react'

const MaterialCard = memo(function MaterialCard({ material, onSelect, onView, onDelete }) {
  // 组件代码
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.material.id === nextProps.material.id &&
         prevProps.selected === nextProps.selected
})

export default MaterialCard
```

#### 使用虚拟列表优化大数据渲染

安装 react-window:
```bash
npm install react-window react-virtualized-auto-sizer
```

使用示例:
```javascript
import { FixedSizeGrid as Grid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

function MaterialGrid({ materials }) {
  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 4 + columnIndex
    const material = materials[index]

    if (!material) return null

    return (
      <div style={style}>
        <MaterialCard material={material} />
      </div>
    )
  }

  return (
    <AutoSizer>
      {({ height, width }) => (
        <Grid
          columnCount={4}
          columnWidth={width / 4}
          height={height}
          rowCount={Math.ceil(materials.length / 4)}
          rowHeight={350}
          width={width}
        >
          {Cell}
        </Grid>
      )}
    </AutoSizer>
  )
}
```

#### 使用 useMemo 缓存计算结果

```javascript
import { useMemo } from 'react'

function MaterialStats({ materials }) {
  // 只在 materials 变化时重新计算
  const stats = useMemo(() => {
    const bySource = {}
    materials.forEach(m => {
      bySource[m.source_type] = (bySource[m.source_type] || 0) + 1
    })
    return bySource
  }, [materials])

  return <div>{/* 渲染统计信息 */}</div>
}
```

---

## 📝 实施优先级

### 高优先级（建议立即修复）
1. **修复 useEffect 依赖项** - 防止状态不同步和无限循环
2. **提取自定义 Hook** - 提高代码复用性

### 中优先级（本周完成）
3. **拆分大型组件** - 提高可维护性
4. **使用 React.memo** - 优化性能

### 低优先级（后续优化）
5. **实现虚拟列表** - 优化大数据渲染
6. **添加骨架屏** - 改善加载体验

---

## ✅ 测试检查清单

修改后请确保：
- [ ] 没有 React Hook 警告
- [ ] 没有无限循环渲染
- [ ] 筛选功能正常工作
- [ ] 分页功能正常工作
- [ ] 批量操作正常工作
- [ ] 性能没有明显下降（使用 React DevTools Profiler）

---

## 📚 参考资源

- [React Hooks 官方文档](https://react.dev/reference/react)
- [useCallback 最佳实践](https://react.dev/reference/react/useCallback)
- [React.memo 使用指南](https://react.dev/reference/react/memo)
- [react-window 文档](https://react-window.vercel.app/)

---

**创建日期**: 2025-10-26
**状态**: 📋 待实施
