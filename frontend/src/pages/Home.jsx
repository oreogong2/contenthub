/**
 * Home.jsx - 新建素材页面
 * 功能：文本输入、PDF上传、来源选择（优化版）
 */

import { useState, useEffect } from 'react'
import { Input, Button, message, Card, Space, Upload, Radio, Divider, Select, Tag, Progress, Tabs } from 'antd'
import { InboxOutlined, SaveOutlined, PlusOutlined, LinkOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi, tagApi } from '../api'

const { TextArea } = Input
const { Dragger } = Upload

export default function Home() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [sourceType, setSourceType] = useState('twitter')
  const [pdfFiles, setPdfFiles] = useState([])
  const [pdfInfo, setPdfInfo] = useState([])
  const [urlInput, setUrlInput] = useState('')
  const [activeTab, setActiveTab] = useState('text')
  
  // 标签相关状态
  const [availableTags, setAvailableTags] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  
  // 上传进度相关状态
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [currentUploadFile, setCurrentUploadFile] = useState('')

  // 来源平台选项
  const sourceTypes = [
    { label: '🐦 推特', value: 'twitter' },
    { label: '📕 小红书', value: 'xiaohongshu' },
    { label: '🎙️ 播客', value: 'podcast' },
    { label: '📱 抖音', value: 'douyin' },
    { label: '📝 其他', value: 'other' }
  ]

  // 加载可用标签
  const loadAvailableTags = async () => {
    try {
      const response = await tagApi.getList()
      console.log('标签API响应:', response)
      if (response.code === 200) {
        // 后端返回格式: {tags: [...]}
        const tagsData = response.data?.tags || []
        setAvailableTags(Array.isArray(tagsData) ? tagsData : [])
      }
    } catch (error) {
      console.error('加载标签失败:', error)
      setAvailableTags([])
    }
  }

  // 组件挂载时加载标签
  useEffect(() => {
    loadAvailableTags()
  }, [])

  // 清空表单
  const handleClear = () => {
    setTitle('')
    setTextContent('')
    setSourceType('twitter')
    setPdfFiles([])
    setPdfInfo([])
    setSelectedTags([])
    setUploadProgress(0)
    setIsUploading(false)
    setCurrentUploadFile('')
    setUrlInput('')
    setActiveTab('text')
    message.info('已清空')
  }

  // PDF 上传配置
  const uploadProps = {
    name: 'file',
    multiple: true,  // 支持多文件上传
    accept: '.pdf',
    maxCount: 10,  // 最多10个文件
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      if (!isPDF) {
        message.error('只能上传 PDF 文件')
        return Upload.LIST_IGNORE
      }
      
      const isLt50M = file.size / 1024 / 1024 < 50
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB')
        return Upload.LIST_IGNORE
      }
      
      // 添加到文件列表
      setPdfFiles(prev => [...prev, file])
      setPdfInfo(prev => [...prev, {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      }])
      
      // 清空文本输入（互斥）
      setTextContent('')
      
      message.success(`${file.name} 已选择`)
      return false
    },
    onRemove: (file) => {
      setPdfFiles(prev => prev.filter(f => f.name !== file.name))
      setPdfInfo(prev => prev.filter(info => info.name !== file.name))
    }
  }

  // 提交文本素材
  const handleSubmitText = async () => {
    if (!textContent.trim()) {
      message.error('请输入素材内容')
      return
    }

    if (textContent.length > 50000) {
      message.error('内容过长，最多50000字')
      return
    }

    setLoading(true)
    
    try {
      const formData = {
        title: title || undefined,
        content: textContent,
        source_type: sourceType,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      }
      
      const response = await materialApi.createText(formData)
      
      if (response.code === 200) {
        message.success('✅ 素材已保存到素材库')
        
        // 清空表单
        handleClear()
        
        // 跳转到素材库
        setTimeout(() => {
          navigate('/materials')
        }, 500)
      } else {
        message.error(response.message || '保存失败')
      }
      
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 提交 PDF
  const handleSubmitPDF = async () => {
    if (pdfFiles.length === 0) {
      message.error('请先选择 PDF 文件')
      return
    }

    setLoading(true)
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      let successCount = 0
      let totalWords = 0
      
      // 逐个上传PDF文件
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        setCurrentUploadFile(file.name)
        
        // 计算当前文件进度
        const fileProgress = ((i + 1) / pdfFiles.length) * 100
        setUploadProgress(fileProgress)
        
        message.info(`正在上传第 ${i + 1}/${pdfFiles.length} 个文件: ${file.name}`)
        
        const formDataObj = new FormData()
        formDataObj.append('file', file)
        formDataObj.append('source_type', sourceType)
        if (title) {
          formDataObj.append('title', title)
        }
        if (selectedTags.length > 0) {
          formDataObj.append('tags', JSON.stringify(selectedTags))
        }
        
        const response = await materialApi.uploadPdf(formDataObj)
        
        if (response.code === 200) {
          successCount++
          totalWords += response.data.word_count || 0
        } else {
          message.error(`${file.name} 上传失败: ${response.message}`)
        }
      }
      
      // 上传完成
      setUploadProgress(100)
      setCurrentUploadFile('')
      
      if (successCount > 0) {
        message.success(`✅ 成功上传 ${successCount}/${pdfFiles.length} 个PDF文件！共提取了 ${totalWords} 字`)
        
        // 清空表单
        handleClear()
        
        // 跳转到素材库
        setTimeout(() => {
          navigate('/materials')
        }, 500)
      } else {
        message.error('所有PDF文件上传失败')
      }
      
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败，请重试')
    } finally {
      setLoading(false)
      setIsUploading(false)
      setUploadProgress(0)
      setCurrentUploadFile('')
    }
  }

  // 提交URL素材
  const handleSubmitUrl = async () => {
    if (!urlInput.trim()) {
      message.error('请输入链接地址')
      return
    }

    // 简单的URL格式验证
    const urlPattern = /^https?:\/\/.+\..+/
    if (!urlPattern.test(urlInput.trim())) {
      message.error('请输入有效的链接地址（以http://或https://开头）')
      return
    }

    setLoading(true)
    
    try {
      const params = {
        url: urlInput.trim(),
        source_type: sourceType,
        title: title || undefined
      }
      
      message.info('正在处理链接，请稍候...')
      
      const response = await materialApi.createFromUrl(params)
      
      if (response.code === 200) {
        message.success(`✅ 成功提取素材！找到 ${response.data.images_count} 个图片，共 ${response.data.content_length} 字`)
        
        // 清空表单
        handleClear()
        
        // 跳转到素材库
        setTimeout(() => {
          navigate('/materials')
        }, 500)
      } else {
        message.error(response.message || '处理失败')
      }
      
    } catch (error) {
      console.error('处理链接失败:', error)
      message.error('处理链接失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      <Card
        title={
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            ✨ 新建素材
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 来源平台 - 单选按钮组 */}
          <div>
            <div style={{ marginBottom: 16, fontWeight: 600, color: '#d1d5db' }}>
              来源平台
            </div>
            <Radio.Group
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              size="large"
              buttonStyle="solid"
            >
              {sourceTypes.map(type => (
                <Radio.Button 
                  key={type.value} 
                  value={type.value}
                  style={{
                    marginRight: 12,
                    marginBottom: 12,
                    borderRadius: 8,
                    border: 'none',
                    height: 48
                  }}
                >
                  {type.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {/* 标签选择 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              🏷️ 标签分类（可选）
            </div>
            <Select
              mode="tags"
              size="large"
              placeholder="选择或创建标签，方便后续分类管理"
              value={selectedTags}
              onChange={setSelectedTags}
              style={{ width: '100%' }}
              options={Array.isArray(availableTags) ? availableTags.map(tag => ({
                label: tag.name,
                value: tag.name
              })) : []}
              tagRender={(props) => {
                const { label, closable, onClose } = props
                return (
                  <Tag
                    color="blue"
                    closable={closable}
                    onClose={onClose}
                    style={{ marginRight: 3 }}
                  >
                    {label}
                  </Tag>
                )
              }}
            />
            {selectedTags.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#9ca3af' }}>
                已选择 {selectedTags.length} 个标签
              </div>
            )}
          </div>

          {/* 素材标题 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              素材标题（可选）
            </div>
            <Input
              size="large"
              placeholder="给素材起个名字，方便后续查找"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* 输入方式选择 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'text',
                label: (
                  <span>
                    <FileTextOutlined />
                    文本输入
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                      📝 粘贴文本内容
                    </div>
                    <TextArea
                      size="large"
                      rows={10}
                      placeholder="直接粘贴文本内容...&#10;&#10;例如：&#10;• 推特长推&#10;• 小红书笔记&#10;• 播客逐字稿&#10;• 文章内容"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      maxLength={50000}
                      showCount
                    />
                    {textContent && (
                      <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                        <Button size="large" onClick={handleClear}>
                          清空
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          loading={loading}
                          onClick={handleSubmitText}
                          icon={<SaveOutlined />}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            height: 48
                          }}
                        >
                          💾 保存到素材库
                        </Button>
                      </Space>
                    )}
                  </div>
                )
              },
              {
                key: 'url',
                label: (
                  <span>
                    <LinkOutlined />
                    链接提取
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                      🔗 输入链接地址
                    </div>
                    <Input
                      size="large"
                      placeholder="粘贴推特、小红书、微博等链接地址..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      style={{ marginBottom: 16 }}
                    />
                    <div style={{ 
                      marginBottom: 16, 
                      padding: 12, 
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: 8,
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      <div style={{ color: '#60a5fa', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                        💡 支持的功能：
                      </div>
                      <div style={{ color: '#d1d5db', fontSize: 13, lineHeight: 1.6 }}>
                        • 自动提取网页中的图片<br/>
                        • 使用OCR识别图片中的文字<br/>
                        • 支持推特、小红书、微博等平台<br/>
                        • 支持直接图片链接
                      </div>
                    </div>
                    {urlInput && (
                      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                        <Button size="large" onClick={handleClear}>
                          清空
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          loading={loading}
                          onClick={handleSubmitUrl}
                          icon={<SaveOutlined />}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            border: 'none',
                            height: 48
                          }}
                        >
                          🔍 提取并保存
                        </Button>
                      </Space>
                    )}
                  </div>
                )
              },
              {
                key: 'pdf',
                label: (
                  <span>
                    <FilePdfOutlined />
                    PDF上传
                  </span>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                      📄 上传PDF文件
                    </div>
                    <Dragger 
                      {...uploadProps}
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
                        点击或拖拽 PDF 文件到此区域（支持批量上传）
                      </p>
                      <p className="ant-upload-hint" style={{ color: '#9ca3af' }}>
                        支持文本版 PDF 文档（最大50MB，最多10个文件）<br />
                        系统会自动提取文字内容<br />
                        <span style={{ color: '#f59e0b' }}>⚠️ 不支持扫描版 PDF</span>
                      </p>
                    </Dragger>
                    
                    {pdfInfo.length > 0 && (
                      <div style={{ 
                        marginTop: 16, 
                        padding: 16, 
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: 12,
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        <div style={{ color: '#6ee7b7', marginBottom: 8 }}>
                          ✅ 已选择 {pdfInfo.length} 个文件
                        </div>
                        {pdfInfo.map((info, index) => (
                          <div key={index} style={{ color: '#d1d5db', marginBottom: 4 }}>
                            📄 {info.name} ({info.size})
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 上传进度条 */}
                    {isUploading && (
                      <div style={{ 
                        marginTop: 16, 
                        padding: 16, 
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderRadius: 12,
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        <div style={{ color: '#60a5fa', marginBottom: 8, fontWeight: 600 }}>
                          📤 正在上传文件...
                        </div>
                        {currentUploadFile && (
                          <div style={{ color: '#d1d5db', marginBottom: 12, fontSize: 14 }}>
                            当前文件: {currentUploadFile}
                          </div>
                        )}
                        <Progress 
                          percent={Math.round(uploadProgress)} 
                          status={uploadProgress === 100 ? 'success' : 'active'}
                          strokeColor={{
                            '0%': '#3b82f6',
                            '100%': '#10b981',
                          }}
                          style={{ marginBottom: 8 }}
                        />
                        <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
                          {Math.round(uploadProgress)}% 完成
                        </div>
                      </div>
                    )}
                    
                    {pdfFiles.length > 0 && (
                      <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
                        <Button size="large" onClick={handleClear}>
                          取消
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          loading={loading}
                          onClick={handleSubmitPDF}
                          icon={<SaveOutlined />}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            height: 48
                          }}
                        >
                          💾 批量上传到素材库
                        </Button>
                      </Space>
                    )}
                  </div>
                )
              }
            ]}
            style={{ marginTop: 16 }}
          />
        </Space>
      </Card>

      {/* 使用提示 */}
      <Card title="💡 使用说明">
        <ul style={{ lineHeight: 2, color: '#d1d5db', paddingLeft: 20, margin: 0 }}>
          <li>💾 素材会自动保存到素材库，随时可以回来提炼</li>
          <li>📚 建议先积累一批素材，然后在素材库中批量处理</li>
          <li>🔍 支持的来源：推特、小红书、播客、抖音等</li>
          <li>🔗 链接提取：支持推特、小红书、微博等平台的图片文字识别</li>
          <li>📄 PDF 限制：最大50MB，最多10个文件，仅支持文本版</li>
          <li>🖼️ OCR功能：自动识别图片中的中英文文字内容</li>
        </ul>
      </Card>
    </div>
  )
}
