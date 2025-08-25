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
  const [view, setView] = useState('public') // 'public', 'login', 'admin'
  
  // 認証状態確認
  useEffect(() => {
    const token = getToken()
    if (token) {
      checkAuth(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const checkAuth = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data)
      setView(response.data.role === 'admin' ? 'admin' : 'public')
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
      setUser({ username: userName, role })
      setView(role === 'admin' ? 'admin' : 'public')
      return true
    } catch (error) {
      console.error('ログイン失敗:', error)
      return false
    }
  }

  const handleLogout = () => {
    removeToken()
    setUser(null)
    setView('public')
  }

  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div className="app">
      <Header user={user} onLogin={() => setView('login')} onLogout={handleLogout} onProfile={() => setView('profile')} />
      
      {view === 'login' && (
        <LoginForm onLogin={handleLogin} onCancel={() => setView('public')} />
      )}
      
      {view === 'admin' && user?.role === 'admin' && (
        <AdminPanel />
      )}
      
      {view === 'profile' && user && (
        <ProfileEdit user={user} onUpdate={setUser} onCancel={() => setView(user?.role === 'admin' ? 'admin' : 'public')} />
      )}
      
      {(view === 'public' || (user?.role !== 'admin')) && view !== 'profile' && (
        <PublicView />
      )}
    </div>
  )
}

// ヘッダーコンポーネント
function Header({ user, onLogin, onLogout, onProfile }) {
  return (
    <header className="header">
      <h1>MAV CMS</h1>
      <div className="auth-section">
        {user ? (
          <div>
            <span>ようこそ、{user.username}さん</span>
            {user.role === 'admin' && <span className="admin-badge">管理者</span>}
            <button onClick={onProfile}>プロファイル</button>
            <button onClick={onLogout}>ログアウト</button>
          </div>
        ) : (
          <button onClick={onLogin}>管理者ログイン</button>
        )}
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

// 管理者パネル
function AdminPanel() {
  const [contents, setContents] = useState([])
  const [editingContent, setEditingContent] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadContents()
  }, [])

  const loadContents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/`)
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
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('本当に削除しますか？')) return
    
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/contents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadContents()
    } catch (error) {
      console.error('削除失敗:', error)
    }
  }

  return (
    <div className="admin-panel">
      <h2>管理者画面</h2>
      
      <button onClick={() => { setShowForm(true); setEditingContent(null) }}>
        新規コンテンツ作成
      </button>

      {(showForm || editingContent) && (
        <ContentForm
          content={editingContent}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingContent(null) }}
        />
      )}

      <div className="content-list">
        <h3>コンテンツ一覧</h3>
        {contents.map(content => (
          <div key={content.id} className="content-item">
            <h4>{content.title}</h4>
            <p>{content.content.substring(0, 100)}...</p>
            <div className="content-actions">
              <button onClick={() => setEditingContent(content)}>編集</button>
              <button onClick={() => handleDelete(content.id)}>削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// コンテンツフォーム
function ContentForm({ content, onSave, onCancel }) {
  const [title, setTitle] = useState(content?.title || '')
  const [contentText, setContentText] = useState(content?.content || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ title, content: contentText })
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
      
      onUpdate({ ...user, username: response.data.username, email: response.data.email })
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

// 公開ビュー
function PublicView() {
  const [contents, setContents] = useState([])

  useEffect(() => {
    loadContents()
  }, [])

  const loadContents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/`)
      setContents(response.data)
    } catch (error) {
      console.error('コンテンツ取得失敗:', error)
    }
  }

  return (
    <div className="public-view">
      <h2>コンテンツ一覧</h2>
      {contents.length === 0 ? (
        <p>まだコンテンツがありません。</p>
      ) : (
        <div className="content-list">
          {contents.map(content => (
            <article key={content.id} className="content-article">
              <h3>{content.title}</h3>
              <div className="content-body">{content.content}</div>
              <div className="content-meta">
                投稿日: {new Date(content.created_at).toLocaleString()}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default App