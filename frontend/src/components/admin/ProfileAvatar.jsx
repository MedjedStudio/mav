import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import Toast from '../ui/Toast'

function ProfileAvatar({ user, onUpdate }) {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  })

  // アバター情報を取得
  const fetchAvatar = async () => {
    if (!user || !user.id) {
      return
    }
    
    try {
      const url = `${API_BASE_URL}/uploads/avatar/${user.id}`
      const response = await fetch(url)
      
      if (response.ok) {
        const avatarData = await response.json()
        if (avatarData.avatar_url) {
          setAvatarUrl(avatarData.avatar_url)
          setAvatarPreview(avatarData.avatar_url)
        } else {
          setAvatarUrl('')
          setAvatarPreview('')
        }
      }
    } catch (error) {
      setAvatarUrl('')
      setAvatarPreview('')
    }
  }

  useEffect(() => {
    if (user) {
      fetchAvatar()
    }
  }, [user])

  // アバター画像選択ハンドラー
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // ファイルサイズチェック（10MB）
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。')
        return
      }
      
      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('サポートされていない画像形式です。JPEG、PNG、GIF、WebP形式を使用してください。')
        return
      }
      
      setAvatarFile(file)
      setError('')
      
      // プレビュー用のURL生成
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // アバターをアップロード
  const uploadAvatar = async () => {
    if (!avatarFile) return null
    
    const formData = new FormData()
    formData.append('file', avatarFile)
    
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/uploads/upload/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('アバターのアップロードに失敗しました')
      }
      
      const data = await response.json()
      return data.url
    } catch (error) {
      throw new Error('アバターのアップロードに失敗しました: ' + error.message)
    }
  }

  // アバター保存
  const handleSave = async () => {
    if (!avatarFile) {
      setError('画像を選択してください')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const newAvatarUrl = await uploadAvatar()
      await fetchAvatar() // 最新のアバター情報を取得
      setToast({
        isVisible: true,
        message: 'プロフィール画像を更新しました',
        type: 'success'
      })
      setIsEditing(false)
      setAvatarFile(null)
      
      // 親コンポーネントに通知（ユーザー情報は変更しない）
      if (onUpdate && typeof onUpdate === 'function') {
        // アバター更新は既存のユーザー情報に影響しないため、何も渡さない
        // onUpdate()
      }
    } catch (error) {
      setError(error.message)
    }
    setIsLoading(false)
  }

  // キャンセル
  const handleCancel = () => {
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(avatarUrl)
    setError('')
    setMessage('')
  }

  if (!isEditing) {
    // 表示モード
    return (
      <div className="profile-avatar-section">
        <div className="avatar-info">
          <h4>プロフィール画像</h4>
        </div>
        <div className="avatar-display">
          {avatarUrl ? (
            <img 
              src={avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE_URL}${avatarUrl}`} 
              alt="アバター"
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #e9ecef',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
              }}
            />
          ) : (
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '4px solid #e9ecef',
              color: '#6c757d',
              fontSize: '16px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              未設定
            </div>
          )}
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
    <div className="profile-avatar-section">
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="avatar-controls">
        <h4>プロフィール画像</h4>
      </div>
      
      <div className="avatar-display">
        {avatarPreview ? (
          <img 
            src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? 
                  avatarPreview : 
                  `${API_BASE_URL}${avatarPreview}`} 
            alt="アバタープレビュー"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #e9ecef',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          />
        ) : (
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #e9ecef',
            color: '#6c757d',
            fontSize: '14px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            未設定
          </div>
        )}
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
          id="avatar-upload"
        />
        <label 
          htmlFor="avatar-upload"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#f6f8fa',
            color: '#24292f',
            border: '1px solid #d0d7de',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '8px'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#f3f4f6'
            e.target.style.borderColor = '#d0d7de'
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#f6f8fa'
            e.target.style.borderColor = '#d0d7de'
          }}
        >
          画像を選択
        </label>
        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
          JPEG、PNG、GIF、WebP形式（最大10MB）
        </div>
      </div>
      
      <div className="form-buttons">
        <button 
          type="button"
          onClick={handleCancel}
        >
          キャンセル
        </button>
        <button 
          type="button"
          disabled={isLoading}
          onClick={handleSave}
          style={{
            padding: '5px 16px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: '#2d8659',
            color: '#ffffff',
            border: '1px solid #2d8659',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!isLoading) {
              e.target.style.backgroundColor = '#26734d'
              e.target.style.borderColor = '#26734d'
            }
          }}
          onMouseOut={(e) => {
            if (!isLoading) {
              e.target.style.backgroundColor = '#2d8659'
              e.target.style.borderColor = '#2d8659'
            }
          }}
        >
          {isLoading ? '保存中...' : '保存'}
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

export default ProfileAvatar