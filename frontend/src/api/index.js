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
  
  // 获取素材详情
  getDetail: (id) => api.get(`/materials/${id}`)
}

// ========== AI 提炼 API ==========

export const aiApi = {
  // 提炼内容
  refine: (data) => api.post('/ai/refine', data, {
    timeout: 60000 // AI 调用可能需要较长时间
  }),
  
  // 获取提示词列表
  getPrompts: () => api.get('/prompts')
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

export default api

