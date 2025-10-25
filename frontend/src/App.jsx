/**
 * ContentHub 主应用组件
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { ConfigProvider, Layout, Menu, theme } from 'antd'
import Home from './pages/Home'
import Refine from './pages/Refine'
import Save from './pages/Save'
import './App.css'

const { Header, Content } = Layout

// 导航栏组件
function Navigation() {
  const location = useLocation()
  
  const menuItems = [
    { key: '/', label: '📝 新建素材', path: '/' },
    { key: '/topics', label: '💾 我的选题', path: '/topics' },
    { key: '/settings', label: '⚙️ 设置', path: '/settings' }
  ]

  return (
    <Header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        background: 'rgba(26, 31, 53, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        📝 ContentHub
      </div>
      
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          justifyContent: 'flex-end'
        }}
      >
        {menuItems.map(item => (
          <Menu.Item key={item.key}>
            <Link to={item.path}>{item.label}</Link>
          </Menu.Item>
        ))}
      </Menu>
    </Header>
  )
}

// 占位页面组件
function PlaceholderPage({ title, taskNumber }) {
  return (
    <div style={{ 
      maxWidth: 1200, 
      margin: '0 auto', 
      padding: '80px 20px',
      textAlign: 'center' 
    }}>
      <h1 style={{ fontSize: 48, marginBottom: 20 }}>{title}</h1>
      <p style={{ fontSize: 18, color: '#888' }}>
        此功能将在任务 #{taskNumber} 中实现
      </p>
    </div>
  )
}

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 12
        }
      }}
    >
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <Navigation />
          <Content
            style={{
              background: 'linear-gradient(135deg, #1a1f35 0%, #0f1419 100%)',
              position: 'relative'
            }}
          >
            {/* 背景装饰 */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `
                  radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)
                `,
                pointerEvents: 'none',
                zIndex: 0
              }}
            />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/refine" element={<Refine />} />
                <Route path="/save" element={<Save />} />
                <Route path="/topics" element={<PlaceholderPage title="我的选题" taskNumber="7" />} />
                <Route path="/settings" element={<PlaceholderPage title="设置" taskNumber="10" />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Router>
    </ConfigProvider>
  )
}

export default App
