/**
 * Refine.jsx - AI 提炼页面
 * 功能：显示原文、选择提示词、AI提炼
 */

import { useState, useEffect } from 'react'
import { Card, Radio, Button, message, Alert, Input, Space, Spin, Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import { materialApi, aiApi, configApi } from '../api'
import useStore from '../store/useStore'

const { TextArea } = Input

export default function Refine() {
  const navigate = useNavigate()
  const { currentMaterial, batchMaterials, setRefinedContent } = useStore()
  
  const [loading, setLoading] = useState(false)
  const [prompts, setPrompts] = useState([])
  const [selectedPromptId, setSelectedPromptId] = useState(1)
  const [material, setMaterial] = useState(null)
  const [refinedText, setRefinedText] = useState('')
  const [editedText, setEditedText] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [refineInfo, setRefineInfo] = useState(null)
  const [aiModel, setAiModel] = useState('deepseek-chat')

  // 加载数据
  useEffect(() => {
    loadPrompts()
    loadMaterial()
    loadConfig()
  }, [])

  // 加载配置
  const loadConfig = async () => {
    try {
      const response = await configApi.getConfigs()
      if (response.code === 200) {
        const configs = response.data
        setAiModel(configs.default_ai_model || 'deepseek-chat')
      }
    } catch (error) {
      console.error('加载配置失败:', error)
      // 使用默认模型
      setAiModel('deepseek-chat')
    }
  }

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
    if (batchMaterials && batchMaterials.length > 0) {
      // 批量提炼模式
      const combinedContent = batchMaterials.map(material => 
        `标题: ${material.title}\n内容: ${material.content_full}`
      ).join('\n\n---\n\n')
      
      setMaterial({
        id: 'batch',
        title: `批量提炼 (${batchMaterials.length}个素材)`,
        content: combinedContent,
        source_type: 'batch',
        materials: batchMaterials
      })
    } else if (currentMaterial) {
      // 单个素材模式
      setMaterial(currentMaterial)
    } else {
      // 如果没有素材，提示用户
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
        prompt_id: selectedPrompt.id,
        prompt_name: selectedPrompt.name
      })

      // 检查是否是批量提炼且内容过长
      if (material.source_type === 'batch' && material.content.length > 50000) {
        // 询问用户选择处理方式
        const shouldUseSmartSplit = await showBatchProcessingOptions(material.content.length)
        if (shouldUseSmartSplit) {
          // 智能分割处理大量内容
          await handleSmartBatchRefine(material, selectedPrompt)
        } else {
          // 尝试一次性处理（可能超时）
          await handleSingleRefine(material, selectedPrompt)
        }
      } else {
        // 正常处理
        await handleSingleRefine(material, selectedPrompt)
      }
    } catch (error) {
      console.error('AI提炼失败:', error)
      message.error('AI提炼失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 单个素材提炼
  const handleSingleRefine = async (material, selectedPrompt) => {
    const response = await aiApi.refine({
      material_id: material.id,
      prompt_id: selectedPrompt.id,
      model: aiModel
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

  }

  // 显示批量处理选项对话框
  const showBatchProcessingOptions = (contentLength) => {
    return new Promise((resolve) => {
      Modal.confirm({
        title: '📊 大量内容处理方式选择',
        content: (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: '#d1d5db', marginBottom: 16 }}>
              检测到内容长度：<strong>{Math.round(contentLength / 1000)}K 字符</strong>
            </p>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: '#3b82f6', marginBottom: 8 }}>🎯 方式1：智能分割处理（推荐）</h4>
              <ul style={{ color: '#d1d5db', paddingLeft: 20, marginBottom: 16 }}>
                <li>✅ 保持您的提示词框架完整性</li>
                <li>✅ 每个分块都能执行完整的多模块分析</li>
                <li>✅ 避免超时问题，处理更稳定</li>
                <li>⚠️ 无法进行跨分块的关联分析</li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: '#f59e0b', marginBottom: 8 }}>⚡ 方式2：一次性处理</h4>
              <ul style={{ color: '#d1d5db', paddingLeft: 20 }}>
                <li>✅ 完全保持您的提示词框架效果</li>
                <li>✅ 可以进行跨素材的关联分析</li>
                <li>⚠️ 可能因内容过长而超时失败</li>
                <li>⚠️ 处理时间较长，需要耐心等待</li>
              </ul>
            </div>
          </div>
        ),
        okText: '智能分割处理',
        cancelText: '一次性处理',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
        width: 600,
        okButtonProps: {
          style: { background: '#3b82f6', borderColor: '#3b82f6' }
        },
        cancelButtonProps: {
          style: { background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }
        }
      })
    })
  }

  // 智能分割处理大量内容
  const handleSmartBatchRefine = async (material, selectedPrompt) => {
    const content = material.content
    const maxChunkSize = 40000 // 每个分块最大4万字符
    
    // 按素材边界分割内容
    const chunks = []
    const materials = material.materials || []
    
    let currentChunk = ''
    let currentChunkMaterials = []
    
    for (let i = 0; i < materials.length; i++) {
      const materialContent = `标题: ${materials[i].title}\n内容: ${materials[i].content_full}`
      
      // 如果添加这个素材会超过限制，先处理当前分块
      if (currentChunk.length + materialContent.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk,
          materials: currentChunkMaterials,
          title: `分块 ${chunks.length + 1} (${currentChunkMaterials.length}个素材)`
        })
        currentChunk = materialContent
        currentChunkMaterials = [materials[i]]
      } else {
        currentChunk += (currentChunk ? '\n\n---\n\n' : '') + materialContent
        currentChunkMaterials.push(materials[i])
      }
    }
    
    // 添加最后一个分块
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        materials: currentChunkMaterials,
        title: `分块 ${chunks.length} (${currentChunkMaterials.length}个素材)`
      })
    }
    
    message.info(`内容已智能分割为 ${chunks.length} 个分块，开始处理...`)
    
    const results = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      message.info(`正在处理 ${chunk.title}...`)
      
      try {
        // 为每个分块创建临时素材
        const tempMaterial = {
          id: `chunk_${i}`,
          title: chunk.title,
          content: chunk.content,
          source_type: 'batch_chunk'
        }
        
        const response = await aiApi.refine({
          material_id: tempMaterial.id,
          prompt_id: selectedPrompt.id,
          model: aiModel
        })
        
        if (response.code === 200) {
          const result = response.data.refined_content || response.data.refined_text
          results.push({
            title: chunk.title,
            content: result,
            materials: chunk.materials,
            tokens: response.data.tokens?.total_tokens || 0,
            cost: response.data.cost || 0
          })
        } else {
          results.push({
            title: chunk.title,
            content: `处理失败: ${response.message}`,
            materials: chunk.materials,
            tokens: 0,
            cost: 0
          })
        }
      } catch (error) {
        results.push({
          title: chunk.title,
          content: `处理失败: ${error.message}`,
          materials: chunk.materials,
          tokens: 0,
          cost: 0
        })
      }
    }
    
    // 合并所有结果
    const combinedResult = results.map((result, index) => 
      `【${result.title}】\n${result.content}\n\n---\n\n`
    ).join('')
    
    const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0)
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0)
    
    setRefinedText(combinedResult)
    setEditedText(combinedResult)
    setRefineInfo({
      prompt_name: selectedPrompt.name,
      model_used: aiModel,
      tokens_used: totalTokens,
      cost_usd: totalCost
    })
    setShowResult(true)
    message.success(`智能分割处理完成！共处理 ${chunks.length} 个分块，${materials.length} 个素材`)
  }

  // 批量素材分批提炼（保留原方法作为备选）
  const handleBatchRefine = async (material, selectedPrompt) => {
    const materials = material.materials || []
    const results = []
    
    message.info(`开始分批处理 ${materials.length} 个素材，请耐心等待...`)
    
    for (let i = 0; i < materials.length; i++) {
      const currentMaterial = materials[i]
      message.info(`正在处理第 ${i + 1}/${materials.length} 个素材: ${currentMaterial.title}`)
      
      try {
        const response = await aiApi.refine({
          material_id: currentMaterial.id,
          prompt_id: selectedPrompt.id,
          model: aiModel
        })
        
        if (response.code === 200) {
          const result = response.data.refined_content || response.data.refined_text
          results.push({
            title: currentMaterial.title,
            content: result,
            tokens: response.data.tokens?.total_tokens || 0,
            cost: response.data.cost || 0
          })
        } else {
          results.push({
            title: currentMaterial.title,
            content: `处理失败: ${response.message}`,
            tokens: 0,
            cost: 0
          })
        }
      } catch (error) {
        results.push({
          title: currentMaterial.title,
          content: `处理失败: ${error.message}`,
          tokens: 0,
          cost: 0
        })
      }
    }
    
    // 合并所有结果
    const combinedResult = results.map((result, index) => 
      `【${index + 1}】${result.title}\n${result.content}\n\n---\n\n`
    ).join('')
    
    const totalTokens = results.reduce((sum, result) => sum + result.tokens, 0)
    const totalCost = results.reduce((sum, result) => sum + result.cost, 0)
    
    setRefinedText(combinedResult)
    setEditedText(combinedResult)
    setRefineInfo({
      prompt_name: selectedPrompt.name,
      model_used: aiModel,
      tokens_used: totalTokens,
      cost_usd: totalCost
    })
    setShowResult(true)
    message.success(`批量提炼完成！共处理 ${materials.length} 个素材`)
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

