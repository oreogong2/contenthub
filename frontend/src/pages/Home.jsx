/**
 * Home.jsx - 新建素材页面
 * 功能：文本输入、PDF上传、来源选择（优化版）
 */

import { useState } from 'react'
import { Input, Button, message, Card, Space, Upload, Radio, Divider } from 'antd'
import { InboxOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { materialApi } from '../api'

const { TextArea } = Input
const { Dragger } = Upload

export default function Home() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [sourceType, setSourceType] = useState('twitter')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfInfo, setPdfInfo] = useState(null)

  // 来源平台选项
  const sourceTypes = [
    { label: '🐦 推特', value: 'twitter' },
    { label: '📕 小红书', value: 'xiaohongshu' },
    { label: '🎙️ 播客', value: 'podcast' },
    { label: '📱 抖音', value: 'douyin' },
    { label: '📝 其他', value: 'other' }
  ]

  // 清空表单
  const handleClear = () => {
    setTitle('')
    setTextContent('')
    setSourceType('twitter')
    setPdfFile(null)
    setPdfInfo(null)
    message.info('已清空')
  }

  // PDF 上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf',
    maxCount: 1,
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
      
      setPdfFile(file)
      setPdfInfo({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      })
      
      // 清空文本输入（互斥）
      setTextContent('')
      
      message.success(`${file.name} 已选择`)
      return false
    },
    onRemove: () => {
      setPdfFile(null)
      setPdfInfo(null)
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
        source_type: sourceType
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
    if (!pdfFile) {
      message.error('请先选择 PDF 文件')
      return
    }

    setLoading(true)
    
    try {
      const formDataObj = new FormData()
      formDataObj.append('file', pdfFile)
      formDataObj.append('source_type', sourceType)
      if (title) {
        formDataObj.append('title', title)
      }
      
      const response = await materialApi.uploadPdf(formDataObj)
      
      if (response.code === 200) {
        message.success(`✅ PDF 已保存！提取了 ${response.data.word_count} 字`)
        
        // 清空表单
        handleClear()
        
        // 跳转到素材库
        setTimeout(() => {
          navigate('/materials')
        }, 500)
      } else {
        message.error(response.message || 'PDF 保存失败')
      }
      
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败，请重试')
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

          {/* 文本输入 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              📝 方式1：粘贴文本
            </div>
            <TextArea
              size="large"
              rows={10}
              placeholder="直接粘贴文本内容...&#10;&#10;例如：&#10;• 推特长推&#10;• 小红书笔记&#10;• 播客逐字稿&#10;• 文章内容"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              maxLength={50000}
              showCount
              disabled={pdfFile !== null}
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

          {/* 分隔线 */}
          <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }}>
            <span style={{ color: '#6b7280', fontWeight: 600 }}>OR</span>
          </Divider>

          {/* PDF 上传 */}
          <div>
            <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
              📄 方式2：上传 PDF
            </div>
            <Dragger 
              {...uploadProps}
              disabled={textContent.trim().length > 0}
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
                支持文本版 PDF 文档（最大50MB）<br />
                系统会自动提取文字内容<br />
                <span style={{ color: '#f59e0b' }}>⚠️ 不支持扫描版 PDF</span>
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
                  ✅ 文件已选择
                </div>
                <div style={{ color: '#d1d5db' }}>
                  📄 {pdfInfo.name} ({pdfInfo.size})
                </div>
              </div>
            )}
            
            {pdfFile && (
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
                  💾 上传到素材库
                </Button>
              </Space>
            )}
          </div>
        </Space>
      </Card>

      {/* 使用提示 */}
      <Card title="💡 使用说明">
        <ul style={{ lineHeight: 2, color: '#d1d5db', paddingLeft: 20, margin: 0 }}>
          <li>💾 素材会自动保存到素材库，随时可以回来提炼</li>
          <li>📚 建议先积累一批素材，然后在素材库中批量处理</li>
          <li>🔍 支持的来源：推特、小红书、播客、抖音等</li>
          <li>📄 PDF 限制：最大50MB，仅支持文本版</li>
        </ul>
      </Card>
    </div>
  )
}
