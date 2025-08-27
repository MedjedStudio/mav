import { useState, useEffect } from 'react'
import { authService } from '../../services/auth'
import { getToken, setToken } from '../../utils/auth'
import { getTimezoneOptions, getTimezoneDisplayName, getTimezoneOffset } from '../../utils/timezone'

// 管理パネル用プロファイル編集
function AdminProfileEdit({ user, onUpdate }) {
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profile, setProfile] = useState(user?.profile || '')
  const [timezone, setTimezone] = useState(user?.timezone || 1)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  
  // タイムゾーン検索用の状態
  const [timezoneSearch, setTimezoneSearch] = useState(() => {
    const tz = user?.timezone || 1
    const currentTz = getTimezoneOptions().find(opt => opt.value === tz)
    return currentTz ? currentTz.label : ''
  })
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)
  const [filteredTimezones, setFilteredTimezones] = useState(getTimezoneOptions())
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
      setProfile(user.profile || '')
      const tz = user.timezone || 1
      setTimezone(tz)
      const currentTz = getTimezoneOptions().find(opt => opt.value === tz)
      if (currentTz) {
        setTimezoneSearch(currentTz.label)
      }
    }
  }, [user])
  
  // タイムゾーン検索フィルタリング
  useEffect(() => {
    if (timezoneSearch === '') {
      // 空文字の場合は全て表示
      setFilteredTimezones(getTimezoneOptions())
    } else {
      const filtered = getTimezoneOptions().filter(option =>
        option.label.toLowerCase().includes(timezoneSearch.toLowerCase())
      )
      setFilteredTimezones(filtered)
    }
  }, [timezoneSearch])
  
  // タイムゾーン選択ハンドラー
  const handleTimezoneSelect = (selectedOption) => {
    setTimezone(selectedOption.value)
    setTimezoneSearch(selectedOption.label)
    setShowTimezoneDropdown(false)
    setSelectedIndex(-1)
  }
  
  // キーボードナビゲーション
  const handleKeyDown = (e) => {
    if (!showTimezoneDropdown) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredTimezones.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && filteredTimezones[selectedIndex]) {
          handleTimezoneSelect(filteredTimezones[selectedIndex])
        }
        break
      case 'Escape':
        setShowTimezoneDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }
  
  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTimezoneDropdown && !event.target.closest('[data-timezone-dropdown]')) {
        setShowTimezoneDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTimezoneDropdown])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await authService.updateProfile({
        username: username !== user.username ? username : undefined,
        email: email !== user.email ? email : undefined,
        profile: profile !== (user.profile || '') ? profile : undefined,
        timezone: timezone !== user.timezone ? timezone : undefined
      })
      
      if (response.access_token) {
        setToken(response.access_token)
      }
      
      const updatedUser = { 
        ...user, 
        username: response.username, 
        email: response.email,
        profile: response.profile,
        timezone: response.timezone
      }
      onUpdate(updatedUser)
      setUsername(response.username || '')
      setEmail(response.email || '')
      setProfile(response.profile || '')
      const newTz = response.timezone || 1
      setTimezone(newTz)
      // タイムゾーン検索文字列も更新
      const newTzOption = getTimezoneOptions().find(opt => opt.value === newTz)
      if (newTzOption) {
        setTimezoneSearch(newTzOption.label)
      }
      setMessage('プロファイルを更新しました')
      setIsEditing(false)
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
      setIsEditing(false)
    } catch (error) {
      setError(error.response?.data?.detail || 'パスワード変更に失敗しました')
    }
    setIsLoading(false)
  }

  if (!isEditing) {
    // 表示モード
    return (
      <div className="profile-edit">
        <h2>プロフィール設定</h2>
        
        <div className="profile-forms">
          <div className="profile-form">
            <h3>基本情報</h3>
            <div className="profile-display">
              <div className="profile-field">
                <label>ユーザー名</label>
                <div className="profile-value">{username || '未設定'}</div>
              </div>
              <div className="profile-field">
                <label>メールアドレス</label>
                <div className="profile-value">{email || '未設定'}</div>
              </div>
              <div className="profile-field">
                <label>プロフィール紹介文</label>
                <div className="profile-value" style={{ whiteSpace: 'pre-wrap' }}>
                  {profile || '未設定'}
                </div>
              </div>
              <div className="profile-field">
                <label>タイムゾーン</label>
                <div className="profile-value">
                  {getTimezoneDisplayName(timezone)} (UTC{getTimezoneOffset(timezone)})
                </div>
              </div>
              <div className="profile-field profile-field-last">
                <label></label>
                <div className="form-buttons">
                  <button 
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    編集
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-form">
            <h3>セキュリティ</h3>
            <div className="profile-display">
              <div className="profile-field">
                <label>パスワード</label>
                <div className="profile-value">••••••••</div>
              </div>
              <div className="profile-field profile-field-last">
                <label></label>
                <div className="form-buttons">
                  <button 
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    パスワード変更
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 編集モード
  return (
    <div className="profile-edit">
      <h2>プロフィール編集</h2>
      
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="profile-forms">
        <div className="profile-form">
          <h3>基本情報</h3>
          <form onSubmit={handleProfileUpdate}>
            <div>
              <label>ユーザー名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="表示される名前を入力してください"
              />
            </div>
            <div>
              <label>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="メールアドレスを入力してください"
              />
            </div>
            <div>
              <label>プロフィール紹介文</label>
              <textarea
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="自己紹介やプロフィール文を入力してください"
                rows={4}
                style={{
                  resize: 'vertical',
                  minHeight: '120px',
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease-in-out',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2d8659'
                  e.target.style.boxShadow = '0 0 0 3px rgba(45,134,89,0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <div>
              <label>タイムゾーン</label>
              <div style={{ position: 'relative' }} data-timezone-dropdown>
                <input
                  type="text"
                  value={timezoneSearch}
                  onChange={(e) => {
                    setTimezoneSearch(e.target.value)
                    setSelectedIndex(-1)
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setShowTimezoneDropdown(true)
                    // フォーカス時に全てのタイムゾーンを表示
                    setFilteredTimezones(getTimezoneOptions())
                    // 入力欄を全選択して、すぐに検索を開始できるようにする
                    setTimeout(() => {
                      document.activeElement?.select()
                    }, 0)
                  }}
                  placeholder="タイムゾーンを検索..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease-in-out'
                  }}
                />
                {showTimezoneDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '2px solid #e9ecef',
                    borderTop: 'none',
                    borderRadius: '0 0 6px 6px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {filteredTimezones.length === 0 ? (
                      <div style={{
                        padding: '12px 16px',
                        color: '#6c757d',
                        textAlign: 'center'
                      }}>
                        該当するタイムゾーンが見つかりません ({timezoneSearch})
                      </div>
                    ) : (
                      filteredTimezones.map((option, index) => (
                        <div
                          key={option.value}
                          onClick={() => handleTimezoneSelect(option)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f3f4',
                            backgroundColor: 
                              selectedIndex === index ? '#e3f2fd' :
                              timezone === option.value ? '#f8f9fa' : 
                              'transparent',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {option.label}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <small style={{ 
                display: 'block', 
                marginTop: '8px', 
                color: '#6c757d',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                現在の設定: {getTimezoneDisplayName(timezone)} (UTC{getTimezoneOffset(timezone)})
              </small>
            </div>
            <div className="form-buttons" style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setMessage('')
                  setError('')
                }}
                style={{
                  background: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                キャンセル
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{
                  background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #2d8659 0%, #238636 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading ? 'none' : '0 4px 12px rgba(45,134,89,0.2)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(45,134,89,0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 12px rgba(45,134,89,0.2)'
                  }
                }}
              >
                {isLoading ? '更新中...' : '保存'}
              </button>
            </div>
          </form>
        </div>

        <div className="profile-form">
          <h3>セキュリティ</h3>
          <form onSubmit={handlePasswordChange}>
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
            <div className="form-buttons" style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  setMessage('')
                  setError('')
                }}
                style={{
                  background: '#6c757d',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                キャンセル
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                style={{
                  background: isLoading ? '#6c757d' : 'linear-gradient(135deg, #2d8659 0%, #238636 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isLoading ? 'none' : '0 4px 12px rgba(45,134,89,0.2)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 20px rgba(45,134,89,0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 12px rgba(45,134,89,0.2)'
                  }
                }}
              >
                {isLoading ? '変更中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminProfileEdit