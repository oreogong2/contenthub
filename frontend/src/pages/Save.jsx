/**
 * Save.jsx - 保存选题页面
 * 功能：标题输入、标签选择、选题保存
 */

import { Card } from 'antd'
import useStore from '../store/useStore'

export default function Save() {
  const { refinedContent } = useStore()

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <Card title="💾 保存为选题">
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          <h2>选题保存功能</h2>
          <p>将在任务 #6 中实现</p>
          {refinedContent && (
            <div style={{ marginTop: 20, textAlign: 'left' }}>
              <p><strong>提炼结果：</strong></p>
              <p>提示词：{refinedContent.prompt_name}</p>
              <p>内容长度：{refinedContent.refined_text?.length} 字</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

