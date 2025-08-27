import { useState, useEffect } from 'react'
import { authService } from '../../services/auth'
import { getToken, setToken } from '../../utils/auth'

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
      const response = await authService.updateProfile({
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined
      })
      
      if (response.access_token) {
        setToken(response.access_token)
      }
      
      const updatedUser = { ...user, username: response.username, email: response.email }
      onUpdate(updatedUser)
      setUsername(response.username)
      setEmail(response.email)
      setMessage('プロファイルを更新しました')
    } catch (error) {
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
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      })
      
      setMessage('パスワードを変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
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

export default AdminProfileEdit