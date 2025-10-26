/**
 * Zustand 全局状态管理
 */

import { create } from 'zustand'

const useStore = create((set) => ({
  // 当前素材
  currentMaterial: null,
  setCurrentMaterial: (material) => set({ currentMaterial: material }),
  
  // 批量素材
  batchMaterials: [],
  setBatchMaterials: (materials) => set({ batchMaterials: materials }),
  
  // 提炼结果
  refinedContent: null,
  setRefinedContent: (content) => set({ refinedContent: content }),
  
  // 配置信息
  configs: {},
  setConfigs: (configs) => set({ configs }),
  
  // 清空状态
  clearAll: () => set({
    currentMaterial: null,
    batchMaterials: [],
    refinedContent: null
  })
}))

export default useStore


