/**
 * Refine.jsx - AI 提炼页面
 * 功能：显示原文、选择提示词、AI提炼
 */

import { Card } from 'antd'
import useStore from '../store/useStore'

export default function Refine() {
  const { currentMaterial } = useStore()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <Card title="AI 提炼素材">
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          <h2>AI 提炼功能</h2>
          <p>将在任务 #5 中实现</p>
          {currentMaterial && (
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <p><strong>当前素材：</strong></p>
              <p>标题：{currentMaterial.title}</p>
              <p>来源：{currentMaterial.source_type}</p>
              <p>内容长度：{currentMaterial.content?.length} 字</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

