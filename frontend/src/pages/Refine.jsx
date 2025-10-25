/**
 * Refine.jsx - AI 提炼页面
 * 功能：显示原文、选择提示词、AI提炼
 */

import { useState, useEffect } from 'react'
import { Card, Radio, Button, message, Alert, Input, Space, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import { materialApi, aiApi } from '../api'
import useStore from '../store/useStore'

const { TextArea } = Input

export default function Refine() {
  const navigate = useNavigate()
  const { currentMaterial, setRefinedContent } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [selectedPromptId, setSelectedPromptId] = useState(1)
  const [material, setMaterial] = useState(null)
  const [refinedText, setRefinedText] = useState('')
  const [editedText, setEditedText] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [refineInfo, setRefineInfo] = useState(null)

  // 加载数据
  useEffect(() => {
    loadPrompts()
    loadMaterial()
  }, [])

  // 加载提示词列表
  const loadPrompts = async () => {
    try {
      const response = await aiApi.getPrompts()
      console.log('提示词响应:', response)
      
      if (response.code === 200) {
        const promptsList = response.data.prompts || response.data || []
        setPrompts(promptsList)
        
        // 默认选中第一个
        if (promptsList.length > 0) {
          setSelectedPromptId(promptsList[0].id)
        }
      }
    } catch (error) {
      console.error('加载提示词失败:', error)
      message.error('加载提示词失败')
    }
  }

  // 加载素材
  const loadMaterial = async () => {
    if (currentMaterial) {
      setMaterial(currentMaterial)
    } else {
      // 如果没有当前素材，提示用户
      message.warning('请先添加素材')
      setTimeout(() => {
        navigate('/')
      }, 1500)
    }
  }

  // 开始AI提炼
  const handleRefine = async () => {
    if (!material) {
      message.error('素材数据不存在')
      return
    }

    // 找到选中的提示词
    const selectedPrompt = prompts.find(p => p.id === selectedPromptId)
    if (!selectedPrompt) {
      message.error('请选择提示词')
      return
    }

    setLoading(true)
    setShowResult(false)
    
    try {
      console.log('开始AI提炼:', {
        material_id: material.id,
        prompt_name: selectedPrompt.name
      })

      // 调用AI提炼API
      const response = await aiApi.refine({
        material_id: material.id,
        prompt_name: selectedPrompt.name  // 发送提示词名称
      })

      console.log('AI响应:', response)

      if (response.code === 200) {
        const result = response.data.refined_content || response.data.refined_text
        setRefinedText(result)
        setEditedText(result)
        setRefineInfo({
          prompt_name: selectedPrompt.name,
          model_used: response.data.model || 'mock-ai',
          tokens_used: response.data.tokens?.total_tokens || 0,
          cost_usd: response.data.cost || 0
        })
        setShowResult(true)
        message.success('AI 提炼完成！')
      } else {
        message.error(response.message || 'AI 提炼失败')
      }

    } catch (error) {
      console.error('AI提炼失败:', error)
      
      // 根据错误类型显示不同提示
      const errorMsg = error.message || 'AI 提炼失败'
      if (errorMsg.includes('API Key')) {
        message.error('API Key 未配置，请先在设置中配置 OpenAI API Key')
      } else if (errorMsg.includes('超时')) {
        message.error('AI 服务超时，请稍后重试')
      } else {
        message.error(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  // 重新提炼
  const handleReRefine = () => {
    setShowResult(false)
    setRefinedText('')
    setEditedText('')
    setRefineInfo(null)
  }

  // 保存并跳转
  const handleGoToSave = () => {
    // 保存提炼结果到状态
    setRefinedContent({
      material_id: material.id,
      refined_text: editedText,
      prompt_name: refineInfo?.prompt_name,
      source_type: material.source_type
    })
    
    // 跳转到保存页面
    navigate('/save')
  }

  if (!material) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 20, color: '#888' }}>加载中...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '90%', margin: '0 auto', padding: '40px 20px' }}>
      {/* 原文预览 */}
      <Card 
        title={
          <div>
            <span style={{ fontSize: 20, fontWeight: 700 }}>📄 原始素材</span>
            <div style={{ fontSize: 14, fontWeight: 400, color: '#888', marginTop: 8 }}>
              {material.title || '未命名素材'} · {material.source_type} · {material.content?.length || 0} 字
            </div>
          </div>
        }
        style={{ marginBottom: 24 }}
      >
        <div style={{
          maxHeight: 200,
          overflow: 'auto',
          background: 'rgba(17, 24, 39, 0.8)',
          padding: 16,
          borderRadius: 12,
          color: '#d1d5db',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap'
        }}>
          {material.content?.substring(0, 500)}
          {material.content?.length > 500 && '...'}
        </div>
      </Card>

      {/* AI 提炼 */}
      <Card 
        title={<span style={{ fontSize: 20, fontWeight: 700 }}>🤖 AI 提炼</span>}
        style={{ marginBottom: 24 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 提示词选择 */}
          <div>
            <div style={{ marginBottom: 16, fontWeight: 600, color: '#d1d5db' }}>
              选择提示词
            </div>
            <Radio.Group 
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {prompts.map(prompt => (
                  <Radio 
                    key={prompt.id}
                    value={prompt.id}
                    style={{
                      padding: 16,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      width: '100%',
                      background: selectedPromptId === prompt.id 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(17, 24, 39, 0.5)',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#e8eaed', marginBottom: 4 }}>
                        {prompt.name}
                        {prompt.is_default && (
                          <span style={{
                            marginLeft: 8,
                            padding: '2px 8px',
                            background: '#10b981',
                            color: 'white',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            默认
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#9ca3af' }}>
                        {prompt.description}
                      </div>
                    </div>
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>

          {/* 提示信息 */}
          <Alert
            message="💡 提示"
            description={
              <div>
                <p>• AI 提炼大约需要 5-15 秒</p>
                <p>• 使用 GPT-3.5-turbo 模型，费用约 ￥0.01-0.05</p>
                <p>• 需要配置 OpenAI API Key（可在设置中配置）</p>
              </div>
            }
            type="info"
            showIcon
          />

          {/* 开始提炼按钮 */}
          {!showResult && (
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleRefine}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                border: 'none'
              }}
            >
              {loading ? '🤖 AI 提炼中...' : '🚀 开始 AI 提炼'}
            </Button>
          )}
        </Space>
      </Card>

      {/* 提炼结果 */}
      {showResult && (
        <Card 
          title={
            <div>
              <span style={{ fontSize: 20, fontWeight: 700 }}>✅ 提炼完成</span>
              {refineInfo && (
                <div style={{ fontSize: 13, fontWeight: 400, color: '#888', marginTop: 8 }}>
                  使用提示词：{refineInfo.prompt_name} · 
                  模型：{refineInfo.model_used} · 
                  Tokens：{refineInfo.tokens_used} · 
                  费用：${refineInfo.cost_usd}
                </div>
              )}
            </div>
          }
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 提炼结果展示 */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                提炼结果
              </div>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                padding: 20,
                borderRadius: 12,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#e8eaed',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap'
              }}>
                {refinedText}
              </div>
            </div>

            {/* 编辑区域 */}
            <div>
              <div style={{ marginBottom: 12, fontWeight: 600, color: '#d1d5db' }}>
                编辑提炼结果（可选）
              </div>
              <TextArea
                rows={8}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="如果需要修改，在这里编辑..."
                maxLength={5000}
                showCount
              />
            </div>

            {/* 按钮组 */}
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button size="large" onClick={handleReRefine}>
                🔄 重新提炼
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={handleGoToSave}
                disabled={!editedText.trim()}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none'
                }}
              >
                💾 保存为选题 →
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  )
}

