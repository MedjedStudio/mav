import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import Toast from '../ui/Toast'
import ConfirmModal from '../ui/ConfirmModal'

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
  const [isDragActive, setIsDragActive] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
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

  // ファイルバリデーション＆プレビュー生成
  const handleFile = (file) => {
    if (!file) return;
    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。')
      return;
    }
    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('サポートされていない画像形式です。JPEG、PNG、GIF、WebP形式を使用してください。')
      return;
    }
    setAvatarFile(file);
    setError('');
    // プレビュー用のURL生成
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // inputからの画像選択
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  // ドラッグ＆ドロップ
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  };

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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: アバターのアップロードに失敗しました`)
      }
      
      const data = await response.json()
      console.log('Avatar upload response:', data)
      return data.url
    } catch (error) {
      throw new Error(error.message || 'アバターのアップロードに失敗しました')
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

      // 親コンポーネントに通知（user.profile.avatar_urlを新URLで更新）
      if (onUpdate && typeof onUpdate === 'function' && newAvatarUrl) {
        // user.profileがオブジェクトならavatar_urlのみ上書き、文字列ならuser直下にavatar_urlを追加
        if (user.profile && typeof user.profile === 'object') {
          onUpdate({
            ...user,
            profile: {
              ...user.profile,
              avatar_url: newAvatarUrl
            }
          })
        } else {
          onUpdate({
            ...user,
            avatar_url: newAvatarUrl
          })
        }
      }
    } catch (error) {
      setError(error.message)
    }
    setIsLoading(false)
  }

  // アバター削除確認モーダルを表示
  const showDeleteConfirm = () => {
    if (!avatarUrl && !avatarPreview) {
      setError('削除するアバターがありません')
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'アバター画像を削除',
      message: 'プロフィール画像を削除しますか？この操作は元に戻せません。',
      onConfirm: handleDeleteAvatar
    })
  }

  // アバター削除実行
  const handleDeleteAvatar = async () => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/uploads/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('アバターの削除に失敗しました')
      }

      // アバター情報をクリア
      setAvatarUrl('')
      setAvatarPreview('')
      setAvatarFile(null)
      setToast({
        isVisible: true,
        message: 'プロフィール画像を削除しました',
        type: 'success'
      })
      setIsEditing(false)

      // 親コンポーネントに通知
      if (onUpdate && typeof onUpdate === 'function') {
        if (user.profile && typeof user.profile === 'object') {
          onUpdate({
            ...user,
            profile: {
              ...user.profile,
              avatar_url: null
            }
          })
        } else {
          onUpdate({
            ...user,
            avatar_url: null
          })
        }
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

      <div
        className="avatar-display"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragActive ? '1.5px dashed #0969da' : '1.5px dashed #d0d7de',
          background: isDragActive ? '#f6f8fa' : '#ffffff',
          width: '100%',
          minHeight: '220px',
          padding: '24px 0',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 0 16px 0',
          boxShadow: '0 1.5px 4px rgba(27,31,35,0.04)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        title="画像をドラッグ＆ドロップでアップロードできます"
      >
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flex:1,width:'100%'}}>
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
                border: '2px solid #e9ecef',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                marginBottom: '12px',
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
              color: '#6c757d',
              fontSize: '15px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              marginBottom: '12px',
            }}>
              未設定
            </div>
          )}
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
              padding: '8px 20px',
              background: '#f6f8fa',
              color: '#24292f',
              border: '1px solid #d0d7de',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '6px',
            }}
          >
            画像を選択
          </label>
          <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '0', textAlign:'center' }}>
            JPEG、PNG、GIF、WebP形式（最大10MB）<br />
            または画像をドラッグ＆ドロップ
          </div>
        </div>
      </div>

  {/* ボタン・説明文は枠内に移動済み */}

      <div className="form-buttons" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
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
              transition: 'all 0.2s ease',
              marginLeft: '8px'
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
        {(avatarUrl || avatarPreview) && (
          <button
            type="button"
            onClick={showDeleteConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: '#da3633',
              color: '#ffffff',
              border: '1px solid #da3633',
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '5px 16px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            削除
          </button>
        )}
      </div>

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
      />
      
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

export default ProfileAvatar