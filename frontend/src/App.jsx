import React, { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ローカルストレージからトークンを取得
const getToken = () => localStorage.getItem('token')
const setToken = (token) => localStorage.setItem('token', token)
const removeToken = () => localStorage.removeItem('token')

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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <h2>管理者ログイン</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
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

// 画像抽出関数
function extractFirstImage(markdown) {
  const imageRegex = /!\[.*?\]\((.*?)\)/
  const match = markdown.match(imageRegex)
  if (!match) return null
  
  const imageUrl = match[1]
  
  // 絶対URLの場合はそのまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 相対パスの場合は相対パスを返す（API_BASE_URLは表示時に追加）
  return imageUrl
}

// コンテンツから画像Markdownを除去する関数
function removeFirstImage(markdown) {
  const imageRegex = /!\[.*?\]\((.*?)\)/
  return markdown.replace(imageRegex, '').trim()
}

// 管理者パネル
function AdminPanel({ user, onUpdate }) {
  const [contents, setContents] = useState([])
  const [editingContent, setEditingContent] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('contents') // 'contents', 'categories', or 'profile'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  
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

  useEffect(() => {
    loadContents()
  }, [currentPage])

  const loadContents = async () => {
    const token = getToken()
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const allContents = response.data
      
      // ページネーション計算
      const totalItems = allContents.length
      const pages = Math.ceil(totalItems / itemsPerPage)
      setTotalPages(pages)
      
      // 現在のページが総ページ数を超えている場合は1ページ目に戻る
      if (currentPage > pages && pages > 0) {
        setCurrentPage(1)
        return
      }
      
      // 現在のページの内容を設定
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setContents(allContents.slice(startIndex, endIndex))
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
      setCurrentPage(1) // 新規作成・更新後は1ページ目に戻る
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
      setCurrentPage(1) // 削除後は1ページ目に戻る
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
        ) : activeView === 'files' ? (
          <FileManagement />
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
              <table className="admin-content-table">
                <thead>
                  <tr>
                    <th>カテゴリ名</th>
                    <th>説明</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(category => (
                    <tr key={category.id}>
                      <td>
                        <div className="content-title">{category.name}</div>
                      </td>
                      <td>
                        <div className="content-excerpt">
                          {category.description || '説明なし'}
                        </div>
                      </td>
                      <td>
                        <div className="content-actions">
                          <button onClick={() => setEditingCategory(category)}>編集</button>
                          <button onClick={() => showCategoryDeleteConfirm(category.id, category.name)}>削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <table className="admin-content-table">
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>内容</th>
                  <th>カテゴリ</th>
                  <th>作成日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {contents.map(content => (
                  <tr key={content.id}>
                    <td>
                      <div className="admin-title-cell">
                        {extractFirstImage(content.content) && (
                          <div className="admin-thumbnail">
                            <img 
                              src={extractFirstImage(content.content).startsWith('http') 
                                ? extractFirstImage(content.content) 
                                : `${API_BASE_URL}${extractFirstImage(content.content)}`} 
                              alt="サムネイル" 
                              className="admin-thumb-image"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        <div className="content-title">{content.title}</div>
                      </div>
                    </td>
                    <td>
                      <div className="content-excerpt">
                        {(() => {
                          const contentWithoutImage = removeFirstImage(content.content)
                          return contentWithoutImage.length > 120 
                            ? contentWithoutImage.substring(0, 120) + '...'
                            : contentWithoutImage
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="content-categories">
                        {content.categories && content.categories.length > 0 
                          ? content.categories.map(cat => (
                              <span key={cat} className="admin-category-tag">
                                {cat}
                              </span>
                            ))
                          : <span className="admin-category-tag">未分類</span>
                        }
                      </div>
                    </td>
                    <td>
                      {new Date(content.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="content-actions">
                        <button onClick={() => setEditingContent(content)}>編集</button>
                        <button onClick={() => showDeleteConfirm(content.id, content.title)}>削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ≪
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ＜
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  } else if (
                    page === currentPage - 3 || 
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="pagination-dots">...</span>
                  }
                  return null
                })}
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ＞
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  ≫
                </button>
              </div>
            )}
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
  const [isUploading, setIsUploading] = useState(false)

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

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = getToken()
      const response = await axios.post(`${API_BASE_URL}/uploads/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      const imageUrl = `${API_BASE_URL}${response.data.url}`
      const markdownImage = `![${response.data.original_filename}](${imageUrl})`
      
      // カーソル位置にマークダウン画像を挿入
      const textarea = document.querySelector('textarea[name="content"]')
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent = contentText.substring(0, start) + markdownImage + contentText.substring(end)
        setContentText(newContent)
        
        // カーソル位置を調整
        setTimeout(() => {
          textarea.focus()
          textarea.selectionStart = textarea.selectionEnd = start + markdownImage.length
        }, 0)
      } else {
        setContentText(prev => prev + '\n' + markdownImage)
      }
    } catch (error) {
      console.error('画像アップロード失敗:', error)
      alert('画像のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      event.target.value = '' // ファイル選択をリセット
    }
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
          <div className="content-input-container">
            <textarea
              name="content"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={10}
              required
            />
            <div className="image-upload-section">
              <label className="image-upload-btn" disabled={isUploading}>
                {isUploading ? '画像アップロード中...' : '画像を挿入'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
              </label>
              <small>JPG, PNG, GIF, WebP対応（最大10MB）</small>
            </div>
          </div>
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
          className={activeView === 'files' ? 'active' : ''}
          onClick={() => onViewChange('files')}
        >
          ファイル管理
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

function InfoModal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <button onClick={onClose} className="modal-button">OK</button>
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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    loadContents()
    loadCategories()
  }, [])

  useEffect(() => {
    if (resetCategory) {
      setSelectedCategory(null)
      setCurrentPage(1)
    }
  }, [resetCategory])

  // カテゴリ変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory])

  useEffect(() => {
    loadContents()
  }, [selectedCategory, currentPage])

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
      const allContents = response.data
      
      // ページネーション計算
      const totalItems = allContents.length
      const pages = Math.ceil(totalItems / itemsPerPage)
      setTotalPages(pages)
      
      // 現在のページが総ページ数を超えている場合は1ページ目に戻る
      if (currentPage > pages && pages > 0) {
        setCurrentPage(1)
        return
      }
      
      // 現在のページの内容を設定
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setContents(allContents.slice(startIndex, endIndex))
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
              <ReactMarkdown>{selectedContent.content}</ReactMarkdown>
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
          <>
            <div className="content-timeline">
              {contents.map(content => (
                <article key={content.id} className={`timeline-item ${extractFirstImage(content.content) ? 'has-thumbnail' : 'no-thumbnail'}`} onClick={() => handleContentClick(content)}>
                  {extractFirstImage(content.content) ? (
                    <div className="timeline-content">
                      <div className="timeline-thumbnail">
                        <img 
                          src={extractFirstImage(content.content).startsWith('http') 
                            ? extractFirstImage(content.content) 
                            : `${API_BASE_URL}${extractFirstImage(content.content)}`} 
                          alt={content.title} 
                          className="timeline-thumb-image"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      </div>
                      <div className="timeline-text">
                        <h3>{content.title}</h3>
                        <p className="content-excerpt">
                          {(() => {
                            const contentWithoutImage = removeFirstImage(content.content)
                            return contentWithoutImage.length > 100 
                              ? contentWithoutImage.substring(0, 100) + '...' 
                              : contentWithoutImage
                          })()}
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
                      </div>
                    </div>
                  ) : (
                    <div className="timeline-single-column">
                      <h3>{content.title}</h3>
                      <p className="content-excerpt">
                        {(() => {
                          const contentWithoutImage = removeFirstImage(content.content)
                          return contentWithoutImage.length > 100 
                            ? contentWithoutImage.substring(0, 100) + '...' 
                            : contentWithoutImage
                        })()}
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
                    </div>
                  )}
                </article>
              ))}
            </div>
            
            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ≪
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ＜
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  } else if (
                    page === currentPage - 3 || 
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="pagination-dots">...</span>
                  }
                  return null
                })}
                
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ＞
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  ≫
                </button>
              </div>
            )}
          </>
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

// ファイル管理コンポーネント
function FileManagement() {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  })

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      console.log('Fetching files from:', `${API_BASE_URL}/uploads/`)
      const response = await axios.get(`${API_BASE_URL}/uploads/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Files response:', response.data)
      setFiles(response.data)
    } catch (error) {
      console.error('ファイル取得失敗:', error)
      console.error('Error details:', error.response?.data)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    if (uploadedFiles.length === 0) return

    setIsUploading(true)
    
    for (const file of uploadedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const token = getToken()
        await axios.post(`${API_BASE_URL}/uploads/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } catch (error) {
        console.error('ファイルアップロード失敗:', error)
        const errorMessage = error.response?.data?.detail || error.message || '不明なエラー'
        setInfoModal({
          isOpen: true,
          title: 'アップロード失敗',
          message: `ファイル「${file.name}」のアップロードに失敗しました: ${errorMessage}`
        })
      }
    }

    setIsUploading(false)
    event.target.value = '' // ファイル選択をリセット
    loadFiles() // ファイル一覧を更新
  }

  const handleDelete = async (filename) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/uploads/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadFiles()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
      console.error('削除失敗:', error)
      alert('ファイル削除に失敗しました')
    }
  }

  const showDeleteConfirm = (filename, originalFilename) => {
    setConfirmModal({
      isOpen: true,
      title: 'ファイル削除',
      message: `「${originalFilename}」を削除しますか？`,
      onConfirm: () => handleDelete(filename)
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const copyToClipboard = (url) => {
    const markdownImage = `![画像](${API_BASE_URL}${url})`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(markdownImage).then(() => {
        setInfoModal({
          isOpen: true,
          title: 'コピー完了',
          message: 'マークダウン形式でクリップボードにコピーしました'
        })
      }).catch(err => {
        console.error('クリップボードへのコピーに失敗しました:', err)
        // フォールバック: テキストエリアを使用
        fallbackCopyToClipboard(markdownImage)
      })
    } else {
      // navigator.clipboardが利用できない場合のフォールバック
      fallbackCopyToClipboard(markdownImage)
    }
  }

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      setInfoModal({
        isOpen: true,
        title: 'コピー完了',
        message: 'マークダウン形式でクリップボードにコピーしました'
      })
    } catch (err) {
      console.error('フォールバックコピーに失敗しました:', err)
      setInfoModal({
        isOpen: true,
        title: 'コピー失敗',
        message: 'コピーに失敗しました。手動でコピーしてください: ' + text
      })
    }
    document.body.removeChild(textArea)
  }

  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div className="content-list">
      <div className="content-list-header">
        <h3>ファイル管理</h3>
        <div className="file-upload-section">
          <label className="btn-primary upload-btn" disabled={isUploading}>
            {isUploading ? 'アップロード中...' : 'ファイルをアップロード'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      
      {files.length === 0 ? (
        <p>アップロードされたファイルはありません。</p>
      ) : (
        <table className="admin-content-table">
          <thead>
            <tr>
              <th>プレビュー</th>
              <th>ファイル名</th>
              <th>サイズ</th>
              <th>操作者</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id}>
                <td>
                  <div className="file-preview">
                    {file.mime_type.startsWith('image/') ? (
                      <img 
                        src={`${API_BASE_URL}${file.url}`} 
                        alt={file.original_filename}
                        className="file-preview-image"
                      />
                    ) : (
                      <div className="file-preview-placeholder">
                        📄
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="file-info">
                    <div className="original-filename">{file.original_filename}</div>
                    <div className="filename">{file.filename}</div>
                  </div>
                </td>
                <td>{formatFileSize(file.file_size)}</td>
                <td>{file.uploader}</td>
                <td>{new Date(file.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="content-actions">
                    <button onClick={() => copyToClipboard(file.url)}>コピー</button>
                    <button onClick={() => showDeleteConfirm(file.filename, file.original_filename)}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      <InfoModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  )
}

export default App