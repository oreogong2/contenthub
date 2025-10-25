/**
 * ContentHub 主应用组件
 */

import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <h1>ContentHub</h1>
      <h2>短视频选题素材管理器</h2>
      <p>项目初始化完成！✨</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          点击次数: {count}
        </button>
      </div>
      <p className="info">
        后端 API: <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a>
      </p>
    </div>
  )
}

export default App
