import { useState } from 'react'
import { authService } from '../../services/auth'
import Toast from '../ui/Toast'

function ProfileSecurity({ user }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  })

  // パスワード変更
  const handleSave = async (e) => {
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
      
      setToast({
        isVisible: true,
        message: 'パスワードを変更しました',
        type: 'success'
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsEditing(false)
    } catch (error) {
      setError(error.response?.data?.detail || 'パスワード変更に失敗しました')
    }
    setIsLoading(false)
  }

  // キャンセル
  const handleCancel = () => {
    setIsEditing(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
  }

  if (!isEditing) {
    // 表示モード
    return (
      <div className="content-form">
        <h3>セキュリティ</h3>
        {message && <div className="success">{message}</div>}
        <div className="profile-display">
          <div className="profile-field">
            <label>パスワード</label>
            <div className="profile-value">••••••••</div>
          </div>
        </div>
        <div className="form-buttons">
          <button 
            type="button"
            onClick={() => setIsEditing(true)}
          >
            変更
          </button>
        </div>
        
        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
        />
      </div>
    )
  }

  // 編集モード
  return (
    <div className="content-form">
      <h3>セキュリティ</h3>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSave}>
        <div>
          <label>現在のパスワード</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="現在のパスワードを入力"
          />
        </div>
        <div>
          <label>新しいパスワード</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="6文字以上で入力してください"
          />
        </div>
        <div>
          <label>新しいパスワード（確認）</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="確認のため再入力してください"
          />
        </div>
        
        <div className="form-buttons">
          <button 
            type="button"
            onClick={handleCancel}
          >
            キャンセル
          </button>
          <button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? '変更中...' : '保存'}
          </button>
        </div>
      </form>
      
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
      />
    </div>
  )
}

export default ProfileSecurity