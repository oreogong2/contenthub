/**
 * ContentHub 使用统计功能
 * 记录和显示 AI API 使用情况
 */

// 使用统计数据结构
const usageStats = {
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  byModel: {
    'gpt-4': { requests: 0, tokens: 0, cost: 0 },
    'gpt-3.5-turbo': { requests: 0, tokens: 0, cost: 0 },
    'deepseek-chat': { requests: 0, tokens: 0, cost: 0 }
  },
  dailyUsage: {},
  monthlyUsage: {}
}

// 价格表（每1000 tokens）
const pricing = {
  'gpt-4': {
    input: 0.03,   // $0.03 per 1K tokens
    output: 0.06   // $0.06 per 1K tokens
  },
  'gpt-3.5-turbo': {
    input: 0.001,  // $0.001 per 1K tokens
    output: 0.002  // $0.002 per 1K tokens
  },
  'deepseek-chat': {
    input: 0.00014,  // $0.00014 per 1K tokens
    output: 0.00028  // $0.00028 per 1K tokens
  }
}

// 计算费用
function calculateCost(model, inputTokens, outputTokens) {
  const modelPricing = pricing[model] || pricing['gpt-3.5-turbo']
  
  const inputCost = (inputTokens / 1000) * modelPricing.input
  const outputCost = (outputTokens / 1000) * modelPricing.output
  
  return inputCost + outputCost
}

// 记录使用情况
function recordUsage(model, inputTokens, outputTokens) {
  const cost = calculateCost(model, inputTokens, outputTokens)
  const totalTokens = inputTokens + outputTokens
  
  // 更新总体统计
  usageStats.totalRequests++
  usageStats.totalTokens += totalTokens
  usageStats.totalCost += cost
  
  // 更新模型统计
  if (!usageStats.byModel[model]) {
    usageStats.byModel[model] = { requests: 0, tokens: 0, cost: 0 }
  }
  usageStats.byModel[model].requests++
  usageStats.byModel[model].tokens += totalTokens
  usageStats.byModel[model].cost += cost
  
  // 更新日期统计
  const today = new Date().toISOString().split('T')[0]
  if (!usageStats.dailyUsage[today]) {
    usageStats.dailyUsage[today] = { requests: 0, tokens: 0, cost: 0 }
  }
  usageStats.dailyUsage[today].requests++
  usageStats.dailyUsage[today].tokens += totalTokens
  usageStats.dailyUsage[today].cost += cost
  
  // 保存到本地存储
  localStorage.setItem('contenthub_usage', JSON.stringify(usageStats))
  
  console.log(`📊 使用统计: ${model} - ${totalTokens} tokens - $${cost.toFixed(4)}`)
}

// 获取使用统计
function getUsageStats() {
  const saved = localStorage.getItem('contenthub_usage')
  if (saved) {
    return JSON.parse(saved)
  }
  return usageStats
}

// 格式化费用显示
function formatCost(cost) {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`  // 显示美分
  }
  return `$${cost.toFixed(4)}`
}

// 生成使用报告
function generateUsageReport() {
  const stats = getUsageStats()
  
  return {
    summary: {
      totalRequests: stats.totalRequests,
      totalTokens: stats.totalTokens,
      totalCost: formatCost(stats.totalCost),
      averageCostPerRequest: stats.totalRequests > 0 ? formatCost(stats.totalCost / stats.totalRequests) : '$0.0000'
    },
    byModel: Object.entries(stats.byModel).map(([model, data]) => ({
      model,
      requests: data.requests,
      tokens: data.tokens,
      cost: formatCost(data.cost),
      percentage: stats.totalRequests > 0 ? ((data.requests / stats.totalRequests) * 100).toFixed(1) : 0
    })),
    recentDays: Object.entries(stats.dailyUsage)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .map(([date, data]) => ({
        date,
        requests: data.requests,
        tokens: data.tokens,
        cost: formatCost(data.cost)
      }))
  }
}

// 导出功能
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    recordUsage,
    getUsageStats,
    generateUsageReport,
    calculateCost,
    formatCost
  }
}

