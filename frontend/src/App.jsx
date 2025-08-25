import React, { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import SetupForm from './components/forms/SetupForm'
import LoginForm from './components/forms/LoginForm'
import AdminPanel from './components/AdminPanel'
import PublicView from './components/PublicView'
import { authService } from './services/auth'
import { getToken, setToken, removeToken } from './utils/auth'
import { updateUrl, parseContentIdFromPath } from './utils/navigation'

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('public') // 'public', 'admin', 'setup'
  const [contentId, setContentId] = useState(null) // URL パラメータから取得するコンテンツID
  const [needsSetup, setNeedsSetup] = useState(false)
  const [resetCategoryTrigger, setResetCategoryTrigger] = useState(0)
  const [showLoginModal, setShowLoginModal] = useState(false) // 初期セットアップが必要かどうか
  
  // URLパスを処理
  useEffect(() => {
    const id = parseContentIdFromPath()
    if (id) {
      setContentId(id)
    }
    
    // URLが変更された時の処理
    const handlePopState = () => {
      const id = parseContentIdFromPath()
      setContentId(id)
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  // 認証状態確認
  useEffect(() => {
    const token = getToken()
    if (token) {
      checkAuth()
    } else {
      checkSetupNeeded()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const userData = await authService.checkAuth()
      setUser({ username: userData.username, email: userData.email, role: userData.role })
      setView('public')
    } catch (error) {
      console.error('認証確認失敗:', error)
      removeToken()
    }
    setIsLoading(false)
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const { access_token, username: userName, role } = response
      setToken(access_token)
      setUser({ username: userName, email: email, role })
      setShowLoginModal(false)
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
      console.error('ログイン失敗:', error)
      return false
    }
  }

  const checkSetupNeeded = async () => {
    try {
      const response = await authService.checkSetupNeeded()
      if (response.needs_setup) {
        setNeedsSetup(true)
        setView('setup')
      }
    } catch (error) {
      console.error('セットアップ状態確認失敗:', error)
    }
    setIsLoading(false)
  }

  const handleSetup = async (email, username, password) => {
    try {
      const response = await authService.initialSetup(email, username, password)
      const { access_token, username: userName, role } = response
      setToken(access_token)
      setUser({ username: userName, email: email, role })
      setNeedsSetup(false)
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
      console.error('初期セットアップ失敗:', error)
      return false
    }
  }

  const handleLogout = () => {
    removeToken()
    setUser(null)
    setView('public')
  }

  const handleHomeClick = () => {
    setView('public')
    setContentId(null)
    updateUrl(null)
    setResetCategoryTrigger(prev => prev + 1) // カテゴリリセットをトリガー
  }

  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onHomeClick={handleHomeClick} />
      
      <main className="main-content">
        {view === 'setup' && (
          <SetupForm onSetup={handleSetup} />
        )}
        
        {view === 'admin' && user?.role === 'admin' && (
          <AdminPanel user={user} onUpdate={setUser} />
        )}
        
        {(view === 'public' || (user?.role !== 'admin')) && view !== 'setup' && !needsSetup && (
          <PublicView contentId={contentId} setContentId={setContentId} resetCategory={resetCategoryTrigger} />
        )}
      </main>
      
      <Footer 
        onLogin={() => setShowLoginModal(true)} 
        needsSetup={needsSetup}
        user={user}
        onAdminClick={() => setView('admin')}
      />
      
      {/* ログインモーダル */}
      {showLoginModal && (
        <LoginForm 
          onLogin={handleLogin} 
          onCancel={() => setShowLoginModal(false)} 
        />
      )}
    </div>
  )
}

export default App