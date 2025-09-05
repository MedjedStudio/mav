import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import SetupForm from './components/forms/SetupForm'
import LoginForm from './components/forms/LoginForm'
import AdminPanel from './components/AdminPanel'
import PublicView from './components/PublicView'
import ProfileView from './components/ProfileView'
import { authService } from './services/auth'
import { getToken, setToken, removeToken } from './utils/auth'
import { updateUrl, parseContentIdFromPath } from './utils/navigation'
import { UserProvider } from './contexts/UserContext'

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('public') // 'public', 'admin', 'setup', 'profile'
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
      setUser({ 
        id: userData.id,           // Add the missing id field
        username: userData.username, 
        email: userData.email, 
        role: userData.role,
        profile: userData.profile,
        timezone: userData.timezone || 1
      })
      setView('public')
    } catch (error) {
      removeToken()
    }
    setIsLoading(false)
      // グローバルなログアウト関数をwindowに登録
      window.handleGlobalLogout = () => {
        removeToken()
        setUser(null)
        setView('public')
        setShowLoginModal(true)
      }
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await authService.login(email, password)
      const { access_token, role } = response
      setToken(access_token)
      // After login, fetch full user data to get the id field
      const userData = await authService.checkAuth()
      setUser({ 
        id: userData.id,
        username: userData.username, 
        email: userData.email, 
        role: userData.role,
        profile: userData.profile,
        timezone: userData.timezone || 1
      })
      setShowLoginModal(false)
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
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
    }
    setIsLoading(false)
  }

  const handleSetup = async (email, username, password) => {
    try {
      const response = await authService.initialSetup(email, username, password)
      const { access_token, role } = response
      setToken(access_token)
      // After setup, fetch full user data to get the id field
      const userData = await authService.checkAuth()
      setUser({ 
        id: userData.id,
        username: userData.username, 
        email: userData.email, 
        role: userData.role,
        profile: userData.profile,
        timezone: userData.timezone || 1
      })
      setNeedsSetup(false)
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
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

  const handleProfileClick = () => {
    setView('profile')
  }


  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <UserProvider user={user} setUser={setUser}>
      <div className="app">
        <Header user={user} onLogout={handleLogout} onHomeClick={handleHomeClick} onProfileClick={handleProfileClick} onAdminClick={() => setView('admin')} />
        
        <main className="main-content">
          {view === 'setup' && (
            <SetupForm onSetup={handleSetup} />
          )}
          
          {view === 'admin' && user && (user?.role === 'admin' || user?.role === 'member') && (
            <AdminPanel user={user} />
          )}
          
          {view === 'profile' && user && (
            <ProfileView user={user} onUpdate={setUser} />
          )}
          
          {view === 'public' && view !== 'setup' && !needsSetup && (
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
    </UserProvider>
  )
}

export default App