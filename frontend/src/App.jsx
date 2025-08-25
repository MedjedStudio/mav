import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ローカルストレージからトークンを取得
const getToken = () => localStorage.getItem('token')
const setToken = (token) => localStorage.setItem('token', token)
const removeToken = () => localStorage.removeItem('token')

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('public') // 'public', 'login', 'admin', 'setup'
  const [contentId, setContentId] = useState(null) // URL パラメータから取得するコンテンツID
  const [needsSetup, setNeedsSetup] = useState(false)
  const [resetCategoryTrigger, setResetCategoryTrigger] = useState(0) // 初期セットアップが必要かどうか
  
  // URLパスを処理
  useEffect(() => {
    const path = window.location.pathname
    const contentMatch = path.match(/\/content\/(\d+)/)
    if (contentMatch) {
      setContentId(parseInt(contentMatch[1], 10))
    }
    
    // URLが変更された時の処理
    const handlePopState = () => {
      const newPath = window.location.pathname
      const newMatch = newPath.match(/\/content\/(\d+)/)
      setContentId(newMatch ? parseInt(newMatch[1], 10) : null)
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  // 認証状態確認
  useEffect(() => {
    const token = getToken()
    if (token) {
      checkAuth(token)
    } else {
      checkSetupNeeded()
    }
  }, [])

  const checkAuth = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser({ username: response.data.username, email: response.data.email, role: response.data.role })
      setView('public')
    } catch (error) {
      console.error('認証確認失敗:', error)
      removeToken()
    }
    setIsLoading(false)
  }

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })
      const { access_token, username: userName, role } = response.data
      setToken(access_token)
      setUser({ username: userName, email: email, role })
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
      console.error('ログイン失敗:', error)
      return false
    }
  }

  const checkSetupNeeded = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/setup-status`)
      if (response.data.needs_setup) {
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
      const response = await axios.post(`${API_BASE_URL}/auth/initial-setup`, {
        email,
        username,
        password
      })
      const { access_token, username: userName, role } = response.data
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

  const updateUrl = (id) => {
    const url = id ? `/content/${id}` : '/'
    window.history.pushState({}, '', url)
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
        
        {view === 'login' && (
          <LoginForm onLogin={handleLogin} onCancel={() => setView('public')} />
        )}
        
        {view === 'admin' && user?.role === 'admin' && (
          <AdminPanel user={user} onUpdate={setUser} />
        )}
        
        {view === 'profile' && user && (
          <ProfileEdit user={user} onUpdate={setUser} onCancel={() => setView(user?.role === 'admin' ? 'admin' : 'public')} />
        )}
        
        {(view === 'public' || (user?.role !== 'admin')) && view !== 'profile' && view !== 'setup' && !needsSetup && (
          <PublicView contentId={contentId} setContentId={setContentId} resetCategory={resetCategoryTrigger} />
        )}
      </main>
      
      <Footer 
        onLogin={() => setView('login')} 
        needsSetup={needsSetup}
        user={user}
        onAdminClick={() => setView('admin')}
      />
    </div>
  )
}

// ヘッダーコンポーネント
function Header({ user, onLogout, onHomeClick }) {
  const [showDropdown, setShowDropdown] = useState(false)
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu')) {
        setShowDropdown(false)
      }
    }
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title" onClick={onHomeClick}>MAV</h1>
        <div className="auth-section">
          {user && (
            <div className="user-menu">
              <button 
                className="user-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {user.username}
              </button>
              {showDropdown && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { onLogout(); setShowDropdown(false) }}>
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ログインフォーム
function LoginForm({ onLogin, onCancel }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const success = await onLogin(email, password)
    if (!success) {
      setError('ログインに失敗しました')
    }
    setIsLoading(false)
  }

  return (
    <div className="login-form">
      <h2>管理者ログイン</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>メールアドレス:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>パスワード:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-buttons">
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </div>
  )
}

// 初期セットアップフォーム
function SetupForm({ onSetup }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    const success = await onSetup(email, username, password)
    if (!success) {
      setError('初期セットアップに失敗しました')
    }
    setIsLoading(false)
  }

  return (
    <div className="setup-form">
      <div className="setup-header">
        <h1>MAV 初期セットアップ</h1>
        <p>管理者アカウントを作成してください</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>メールアドレス:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>ユーザー名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>パスワード:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div>
          <label>パスワード（確認）:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-buttons">
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'セットアップ中...' : 'セットアップ完了'}
          </button>
        </div>
      </form>
    </div>
  )
}

// 管理者パネル
function AdminPanel({ user, onUpdate }) {
  const [contents, setContents] = useState([])
  const [editingContent, setEditingContent] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('contents') // 'contents', 'categories', or 'profile'
  
  // カテゴリ管理用の状態
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  
  // 確認モーダル用の状態
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })

  useEffect(() => {
    loadContents()
    loadCategories()
  }, [])

  const loadContents = async () => {
    const token = getToken()
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setContents(response.data)
    } catch (error) {
      console.error('コンテンツ取得失敗:', error)
    }
  }

  const handleSave = async (contentData) => {
    const token = getToken()
    try {
      if (editingContent) {
        await axios.put(`${API_BASE_URL}/contents/${editingContent.id}`, contentData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE_URL}/contents/`, contentData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      loadContents()
      setEditingContent(null)
      setShowForm(false)
    } catch (error) {
      console.error('保存失敗:', error)
      alert(`保存に失敗しました: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleDelete = async (id) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/contents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadContents()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
      console.error('削除失敗:', error)
    }
  }

  const showDeleteConfirm = (id, title) => {
    setConfirmModal({
      isOpen: true,
      title: 'コンテンツ削除',
      message: `「${title}」を削除しますか？`,
      onConfirm: () => handleDelete(id)
    })
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setCategories(response.data)
    } catch (error) {
      console.error('カテゴリ取得失敗:', error)
    }
  }

  const handleCategorySave = async (categoryData) => {
    const token = getToken()
    try {
      if (editingCategory) {
        await axios.put(`${API_BASE_URL}/categories/${editingCategory.id}`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE_URL}/categories/`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      loadCategories()
      setEditingCategory(null)
      setShowCategoryForm(false)
    } catch (error) {
      console.error('保存失敗:', error)
      alert(error.response?.data?.detail || '保存に失敗しました')
    }
  }

  const handleCategoryDelete = async (id) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadCategories()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
      console.error('削除失敗:', error)
      alert(error.response?.data?.detail || '削除に失敗しました')
    }
  }

  const showCategoryDeleteConfirm = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'カテゴリ削除',
      message: `「${name}」カテゴリを削除しますか？\nこのカテゴリの記事は「未分類」になります。`,
      onConfirm: () => handleCategoryDelete(id, name)
    })
  }

  const handleViewChange = (view) => {
    setActiveView(view)
    setShowForm(false)
    setEditingContent(null)
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  return (
    <div className="admin-panel">
      <AdminSidebar 
        activeView={activeView} 
        onViewChange={handleViewChange} 
      />

      <div className="admin-main">
        {activeView === 'profile' ? (
          <AdminProfileEdit user={user} onUpdate={onUpdate} />
        ) : activeView === 'categories' ? (
          (showCategoryForm || editingCategory) ? (
            <CategoryForm
              category={editingCategory}
              onSave={handleCategorySave}
              onCancel={() => { setShowCategoryForm(false); setEditingCategory(null) }}
            />
          ) : (
            <div className="content-list">
              <div className="content-list-header">
                <h3>カテゴリ一覧</h3>
                <button 
                  className="btn-primary"
                  onClick={() => { setShowCategoryForm(true); setEditingCategory(null) }}
                >
                  新規カテゴリ作成
                </button>
              </div>
              {categories.map(category => (
                <div key={category.id} className="content-item">
                  <h4>{category.name}</h4>
                  <p>{category.description || '説明なし'}</p>
                  <div className="content-actions">
                    <button onClick={() => setEditingCategory(category)}>編集</button>
                    <button onClick={() => showCategoryDeleteConfirm(category.id, category.name)}>削除</button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (showForm || editingContent) ? (
          <ContentForm
            content={editingContent}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingContent(null) }}
          />
        ) : (
          <div className="content-list">
            <div className="content-list-header">
              <h3>コンテンツ一覧</h3>
              <button 
                className="btn-primary"
                onClick={() => { setShowForm(true); setEditingContent(null) }}
              >
                新規コンテンツ作成
              </button>
            </div>
            {contents.map(content => (
              <div key={content.id} className="content-item">
                <h4>{content.title}</h4>
                <p>{content.content.substring(0, 100)}...</p>
                {content.categories && content.categories.length > 0 && (
                  <div style={{ margin: '0.5rem 0' }}>
                    {content.categories.map(cat => (
                      <span key={cat} className="content-category" style={{ marginRight: '8px' }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                <div className="content-actions">
                  <button onClick={() => setEditingContent(content)}>編集</button>
                  <button onClick={() => showDeleteConfirm(content.id, content.title)}>削除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  )
}

// コンテンツフォーム
function ContentForm({ content, onSave, onCancel }) {
  const [title, setTitle] = useState(content?.title || '')
  const [contentText, setContentText] = useState(content?.content || '')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (content && content.categories && availableCategories.length > 0) {
      // 既存コンテンツのカテゴリIDを設定
      const categoryIds = availableCategories
        .filter(cat => content.categories.includes(cat.name))
        .map(cat => cat.id)
      setSelectedCategoryIds(categoryIds)
    } else if (!content) {
      // 新規作成時はカテゴリを選択しない（未分類として扱う）
      setSelectedCategoryIds([])
    }
  }, [content, availableCategories])

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setAvailableCategories(response.data)
    } catch (error) {
      console.error('カテゴリ取得失敗:', error)
    }
  }

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ title, content: contentText, category_ids: selectedCategoryIds })
  }

  return (
    <div className="content-form">
      <h3>{content ? 'コンテンツ編集' : '新規コンテンツ作成'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>タイトル:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>カテゴリ:</label>
          <div className="category-checkboxes">
            {availableCategories.map(cat => (
              <div key={cat.id} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`category-${cat.id}`}
                  checked={selectedCategoryIds.includes(cat.id)}
                  onChange={() => handleCategoryChange(cat.id)}
                />
                <label htmlFor={`category-${cat.id}`}>{cat.name}</label>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label>内容:</label>
          <textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={10}
            required
          />
        </div>
        <div className="form-buttons">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </div>
  )
}


// 管理メニューコンポーネント
function AdminSidebar({ activeView, onViewChange }) {
  return (
    <div className="admin-sidebar">
      <h2>管理メニュー</h2>
      <nav className="admin-nav">
        <button 
          className={activeView === 'contents' ? 'active' : ''}
          onClick={() => onViewChange('contents')}
        >
          コンテンツ管理
        </button>
        <button 
          className={activeView === 'categories' ? 'active' : ''}
          onClick={() => onViewChange('categories')}
        >
          カテゴリ管理
        </button>
        <button 
          className={activeView === 'profile' ? 'active' : ''}
          onClick={() => onViewChange('profile')}
        >
          プロフィール
        </button>
      </nav>
    </div>
  )
}

// カテゴリフォーム
function CategoryForm({ category, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ name, description })
  }

  return (
    <div className="content-form">
      <h3>{category ? 'カテゴリ編集' : '新規カテゴリ作成'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>カテゴリ名:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>説明:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-buttons">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </div>
  )
}

// 管理パネル用プロファイル編集
function AdminProfileEdit({ user, onUpdate }) {
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email)
  }, [user.username, user.email])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, {
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.data.access_token) {
        setToken(response.data.access_token)
      }
      
      const updatedUser = { ...user, username: response.data.username, email: response.data.email }
      onUpdate(updatedUser)
      setUsername(response.data.username)
      setEmail(response.data.email)
      setMessage('プロファイルを更新しました')
    } catch (error) {
      console.error('プロファイル更新失敗:', error)
      setError(error.response?.data?.detail || 'プロファイル更新に失敗しました')
    }
    setIsLoading(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません')
      return
    }
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()
      await axios.put(`${API_BASE_URL}/auth/password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setMessage('パスワードを変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('パスワード変更失敗:', error)
      setError(error.response?.data?.detail || 'パスワード変更に失敗しました')
    }
    setIsLoading(false)
  }

  return (
    <div className="content-list">
      <div className="content-list-header">
        <h3>プロフィール設定</h3>
      </div>
      
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="content-item">
        <h4>基本情報</h4>
        <form onSubmit={handleProfileUpdate}>
          <div>
            <label>ユーザー名:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label>メールアドレス:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-buttons">
            <button type="submit" disabled={isLoading}>
              {isLoading ? '更新中...' : 'プロフィール更新'}
            </button>
          </div>
        </form>
      </div>

      <div className="content-item">
        <h4>パスワード変更</h4>
        <form onSubmit={handlePasswordChange}>
          <div>
            <label>現在のパスワード:</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label>新しいパスワード:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label>新しいパスワード（確認）:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-buttons">
            <button type="submit" disabled={isLoading}>
              {isLoading ? '変更中...' : 'パスワード変更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// プロファイル編集
function ProfileEdit({ user, onUpdate, onCancel }) {
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // ユーザー情報が変更された時にフォームの値を更新
  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email)
  }, [user.username, user.email])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, {
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // メールアドレス変更時に新しいトークンが返される場合は保存
      if (response.data.access_token) {
        setToken(response.data.access_token)
      }
      
      const updatedUser = { ...user, username: response.data.username, email: response.data.email }
      onUpdate(updatedUser)
      setUsername(response.data.username)
      setEmail(response.data.email)
      setMessage('プロファイルを更新しました')
    } catch (error) {
      console.error('プロファイル更新失敗:', error)
      setError(error.response?.data?.detail || 'プロファイル更新に失敗しました')
    }
    setIsLoading(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません')
      return
    }
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()
      await axios.put(`${API_BASE_URL}/auth/password`, {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setMessage('パスワードを変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('パスワード変更失敗:', error)
      setError(error.response?.data?.detail || 'パスワード変更に失敗しました')
    }
    setIsLoading(false)
  }

  return (
    <div className="profile-edit">
      <h2>プロファイル編集</h2>
      
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="profile-forms">
        <div className="profile-form">
          <h3>基本情報</h3>
          <form onSubmit={handleProfileUpdate}>
            <div>
              <label>ユーザー名:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label>メールアドレス:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={isLoading}>
                {isLoading ? '更新中...' : 'プロファイル更新'}
              </button>
            </div>
          </form>
        </div>

        <div className="profile-form">
          <h3>パスワード変更</h3>
          <form onSubmit={handlePasswordChange}>
            <div>
              <label>現在のパスワード:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label>新しいパスワード:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label>新しいパスワード（確認）:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={isLoading}>
                {isLoading ? '変更中...' : 'パスワード変更'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="form-buttons">
        <button type="button" onClick={onCancel}>戻る</button>
      </div>
    </div>
  )
}

// 確認モーダル
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-danger" onClick={onConfirm}>
            削除
          </button>
          <button onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

// 公開ビュー
function PublicView({ contentId, setContentId, resetCategory }) {
  const [contents, setContents] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedContent, setSelectedContent] = useState(null)
  const [view, setView] = useState('timeline') // 'timeline' または 'content'

  useEffect(() => {
    loadContents()
    loadCategories()
  }, [])

  useEffect(() => {
    if (resetCategory) {
      setSelectedCategory(null)
    }
  }, [resetCategory])

  useEffect(() => {
    loadContents()
  }, [selectedCategory])

  // URL パラメータで指定されたコンテンツを読み込み
  useEffect(() => {
    if (contentId) {
      loadContentById(contentId)
    } else {
      setView('timeline')
      setSelectedContent(null)
    }
  }, [contentId])

  const loadContents = async () => {
    try {
      const url = selectedCategory 
        ? `${API_BASE_URL}/contents/?category=${encodeURIComponent(selectedCategory)}`
        : `${API_BASE_URL}/contents/`
      const response = await axios.get(url)
      setContents(response.data)
    } catch (error) {
      console.error('コンテンツ取得失敗:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setCategories(response.data.map(cat => cat.name))
    } catch (error) {
      console.error('カテゴリ取得失敗:', error)
    }
  }

  const loadContentById = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/${id}`)
      setSelectedContent(response.data)
      setView('content')
    } catch (error) {
      console.error('コンテンツ取得失敗:', error)
      // コンテンツが見つからない場合はタイムラインに戻る
      handleBackToTimeline()
    }
  }

  const updateUrl = (id) => {
    const url = id ? `/content/${id}` : '/'
    window.history.pushState({}, '', url)
  }

  const handleContentClick = (content) => {
    setSelectedContent(content)
    setView('content')
    setContentId(content.id)
    updateUrl(content.id)
  }

  const handleBackToTimeline = () => {
    setView('timeline')
    setSelectedContent(null)
    setContentId(null)
    updateUrl(null)
  }

  if (view === 'content' && selectedContent) {
    return (
      <div className="public-view">
        <div className="main-content">
          <div className="content-nav">
            <a href="#" onClick={(e) => { e.preventDefault(); handleBackToTimeline() }} className="back-link">
              BACK
            </a>
          </div>
          <article className="content-detail">
            <header className="content-header">
              <h1>{selectedContent.title}</h1>
              <div className="content-meta">
                <span>投稿日: {new Date(selectedContent.created_at).toLocaleString()}</span>
                <div>
                  {selectedContent.categories && selectedContent.categories.map(cat => (
                    <span key={cat} className="content-category" style={{ marginLeft: '8px' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </header>
            <div className="content-body">
              {selectedContent.content}
            </div>
          </article>
        </div>
        
        <div className="sidebar">
          <h3>カテゴリ</h3>
          <ul className="category-filter">
            <li>
              <button 
                className={selectedCategory === null ? 'active' : ''}
                onClick={() => { 
                  setSelectedCategory(null)
                  handleBackToTimeline()
                }}
              >
                すべて
              </button>
            </li>
            {categories.map(category => (
              <li key={category}>
                <button 
                  className={selectedCategory === category ? 'active' : ''}
                  onClick={() => { 
                    setSelectedCategory(category)
                    handleBackToTimeline()
                  }}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="public-view">
      <div className="main-content">
        <h2>
          {selectedCategory ? `「${selectedCategory}」の記事` : 'コンテンツ一覧'}
        </h2>
        {contents.length === 0 ? (
          <p>まだコンテンツがありません。</p>
        ) : (
          <div className="content-timeline">
            {contents.map(content => (
              <article key={content.id} className="timeline-item" onClick={() => handleContentClick(content)}>
                <h3>{content.title}</h3>
                <p className="content-excerpt">
                  {content.content.length > 100 
                    ? content.content.substring(0, 100) + '...' 
                    : content.content
                  }
                </p>
                <div className="content-meta">
                  <span>投稿日: {new Date(content.created_at).toLocaleString()}</span>
                  <div>
                    {content.categories && content.categories.map(cat => (
                      <span key={cat} className="content-category" style={{ marginLeft: '8px' }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      
      <div className="sidebar">
        <h3>カテゴリ</h3>
        <ul className="category-filter">
          <li>
            <button 
              className={selectedCategory === null ? 'active' : ''}
              onClick={() => setSelectedCategory(null)}
            >
              すべて
            </button>
          </li>
          {categories.map(category => (
            <li key={category}>
              <button 
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// フッターコンポーネント
function Footer({ onLogin, needsSetup, user, onAdminClick }) {
  const handleAdminClick = () => {
    if (user) {
      // 既にログイン済みの場合はAdmin画面に移動
      onAdminClick()
    } else {
      // 未ログインの場合はログイン画面に移動
      onLogin()
    }
  }

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p>&copy; 2025 Medjed Studio. All rights reserved.</p>
          {!needsSetup && (
            <button onClick={handleAdminClick} className="admin-login-link">
              Admin
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}

export default App