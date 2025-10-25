/**
 * Home.jsx - 新建素材页面
 * 功能：文本输入、PDF上传、来源选择
 */

import { useState } from 'react'
import { Input, Select, Button, message, Card, Space, Upload, Divider } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'
import useStore from '../store/useStore'

const { TextArea } = Input
const { Dragger } = Upload

export default function Home() {
  const navigate = useNavigate()
  const { setCurrentMaterial } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    source_type: 'twitter'
  })
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfInfo, setPdfInfo] = useState(null)

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
    setPdfFile(null)
    setPdfInfo(null)
    message.info('表单已清空')
  }

  // PDF 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf',
    maxCount: 1,
    beforeUpload: (file) => {
      // 验证文件类型
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      if (!isPDF) {
        message.error('只能上传 PDF 文件！')
        return Upload.LIST_IGNORE
      }
      
      // 验证文件大小（50MB）
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB！')
        return Upload.LIST_IGNORE
      }
      
      // 保存文件到状态，但不自动上传
      setPdfFile(file)
      setPdfInfo({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      })
      
      // 清空文本输入（二选一）
      setFormData(prev => ({ ...prev, content: '' }))
      
      message.success(`${file.name} 已选择`)
      return false // 阻止自动上传
    },
    onRemove: () => {
      setPdfFile(null)
      setPdfInfo(null)
    }
  }

  // 提交 PDF
  const handlePdfSubmit = async () => {
    if (!pdfFile) {
      message.error('请先选择 PDF 文件')
      return
    }

    setLoading(true)
    
    try {
      // 创建 FormData
      const formDataObj = new FormData()
      formDataObj.append('file', pdfFile)
      formDataObj.append('source_type', formData.source_type)
      if (formData.title) {
        formDataObj.append('title', formData.title)
      }

      console.log('上传 PDF:', pdfFile.name)
      
      // 调用API上传PDF
      const response = await materialApi.uploadPdf(formDataObj)
      
      console.log('API响应:', response)
      
      if (response.code === 200) {
        message.success(`PDF 上传成功！已提取 ${response.data.word_count} 字`)
        
        // 保存素材信息到状态
        setCurrentMaterial({
          id: response.data.id,
          title: response.data.title,
          content: `（从 PDF 提取的文本，共 ${response.data.word_count} 字）`,
          source_type: response.data.source_type,
          file_name: response.data.file_name,
          word_count: response.data.word_count
        })
        
        // 跳转到提炼页面
        setTimeout(() => {
          navigate('/refine')
        }, 500)
      } else {
        message.error(response.message || 'PDF 上传失败')
      }
      
    } catch (error) {
      console.error('上传失败:', error)
      message.error(error.message || 'PDF 上传失败，请重试')
    } finally {
      setLoading(false)
    }
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
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
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
              rows={8}
              placeholder="直接粘贴文本内容...&#10;&#10;例如：&#10;• 推特长推的完整内容&#10;• 小红书爆款笔记文案&#10;• 播客逐字稿的精彩片段&#10;&#10;粘贴后点击下方按钮进入 AI 提炼"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              maxLength={50000}
              showCount
              disabled={pdfFile !== null}
            />
            {formData.content && (
              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
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
            )}
          </div>

          {/* 分隔线 */}
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <span style={{ color: '#6b7280', fontWeight: 600 }}>OR</span>
          </Divider>

          {/* PDF 上传 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              方式 2 · 上传 PDF
            </div>
            <Dragger 
              {...uploadProps}
              disabled={formData.content.trim().length > 0}
              style={{
                background: 'rgba(17, 24, 39, 0.4)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
                borderRadius: 12
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#3b82f6', fontSize: 64 }} />
              </p>
              <p className="ant-upload-text" style={{ color: '#e8eaed', fontSize: 16, fontWeight: 600 }}>
                点击或拖拽 PDF 文件到此区域
              </p>
              <p className="ant-upload-hint" style={{ color: '#9ca3af' }}>
                支持播客逐字稿、文章等 PDF 文档<br />
                系统会自动提取文字内容<br />
                <span style={{ color: '#f59e0b' }}>⚠️ 仅支持文本版 PDF，不支持扫描版</span>
              </p>
            </Dragger>
            
            {pdfInfo && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ color: '#6ee7b7', marginBottom: 8 }}>
                  ✅ PDF 已选择
                </div>
                <div style={{ color: '#d1d5db' }}>
                  <strong>文件名：</strong> {pdfInfo.name}<br />
                  <strong>大小：</strong> {pdfInfo.size}
                </div>
              </div>
            )}
            
            {pdfFile && (
              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button size="large" onClick={handleClear}>
                  🗑️ 取消
                </Button>
                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  onClick={handlePdfSubmit}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    border: 'none'
                  }}
                >
                  📄 上传并提取文本 →
                </Button>
              </Space>
            )}
          </div>
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

