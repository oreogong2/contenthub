/**
 * API 调用封装
 * 统一管理所有 HTTP 请求
 */

import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    console.log('API 请求:', config.method.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    console.log('API 响应:', response.data)
    return response.data
  },
  error => {
    console.error('响应错误:', error)
    const message = error.response?.data?.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

// ========== 素材相关 API ==========

export const materialApi = {
  // 创建文本素材
  createText: (data) => api.post('/materials/text', data),
  
  // 上传 PDF 素材
  uploadPdf: (formData) => {
    // 注意：FormData 会自动设置 Content-Type，不需要手动设置
    return api.post('/materials/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000 // PDF 处理可能需要更长时间
    })
  },
  
  // 通过URL创建素材
  createFromUrl: (data) => api.post('/materials/url', null, {
    params: data,
    timeout: 120000 // URL处理可能需要较长时间
  }),
  
  // 获取素材列表
  getList: (params) => api.get('/materials', { params }),
  
  // 获取素材详情
  getDetail: (id) => api.get(`/materials/${id}`),
  
  // 删除素材
  delete: (id) => api.delete(`/materials/${id}`),
  
  // 回收站相关
  getRecycleBin: (params) => api.get('/recycle-bin', { params }),
  restore: (id) => api.post(`/materials/${id}/restore`),
  permanentDelete: (id) => api.delete(`/materials/${id}/permanent`)
}

// ========== AI 提炼 API ==========

export const aiApi = {
  // 提炼内容
  refine: (data) => api.post('/ai/refine', data, {
    timeout: 150000 // AI 调用可能需要较长时间，增加到150秒
  }),
  
  // 获取提示词列表
  getPrompts: () => api.get('/prompts'),
  
  // 更新提示词列表
  updatePrompts: (prompts) => api.put('/prompts', { prompts }),
  
  // 删除提示词
  deletePrompt: (promptId) => api.delete(`/prompts/${promptId}`)
}

// ========== 标签相关 API ==========

export const tagApi = {
  // 获取所有标签
  getList: () => api.get('/tags'),
  
  // 创建标签
  create: (data) => api.post('/tags', data),
  
  // 更新标签
  update: (id, data) => api.put(`/tags/${id}`, data),
  
  // 删除标签
  delete: (id) => api.delete(`/tags/${id}`),
  
  // 批量更新素材标签
  updateMaterialTags: (data) => api.put('/materials/tags', data)
}

// ========== 选题相关 API ==========

export const topicApi = {
  // 创建选题
  create: (data) => api.post('/topics', data),
  
  // 获取选题列表
  getList: (params) => api.get('/topics', { params }),
  
  // 获取选题详情
  getDetail: (id) => api.get(`/topics/${id}`),
  
  // 更新选题
  update: (id, data) => api.put(`/topics/${id}`, data),
  
  // 删除选题
  delete: (id) => api.delete(`/topics/${id}`)
}

// ========== 配置相关 API ==========
export const configApi = {
  // 获取所有配置
  getConfigs: () => api.get('/configs'),
  
  // 更新配置
  updateConfigs: (data) => api.put('/configs', data)
}

// ========== 选题灵感相关 API ==========
export const topicInspirationApi = {
  // 发现选题灵感
  discoverTopics: () => api.post('/ai/discover-topics'),

  // 获取选题提示词
  getTopicPrompt: () => api.get('/ai/get-topic-prompt'),

  // 设置选题提示词
  setTopicPrompt: (prompt) => api.post('/ai/set-topic-prompt', { prompt })
}

// ========== 使用统计相关 API ==========
export const usageStatsApi = {
  // 获取使用统计
  getStats: (days = 30) => api.get('/usage-stats', { params: { days } }),

  // 记录使用统计
  recordStats: (data) => api.post('/usage-stats', data)
}

export default api

