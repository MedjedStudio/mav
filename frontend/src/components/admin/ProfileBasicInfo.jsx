import { useState, useEffect } from 'react'
import { authService } from '../../services/auth'
import { setToken } from '../../utils/auth'
import { getTimezoneOptions, getTimezoneDisplayName, getTimezoneOffset } from '../../utils/timezone'
import Toast from '../ui/Toast'

function ProfileBasicInfo({ user, onUpdate }) {
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profile, setProfile] = useState(user?.profile || '')
  const [timezone, setTimezone] = useState(user?.timezone || 1)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  })
  
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

  // 基本情報更新
  const handleSave = async (e) => {
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
      const newTzOption = getTimezoneOptions().find(opt => opt.value === newTz)
      if (newTzOption) {
        setTimezoneSearch(newTzOption.label)
      }
      
      setToast({
        isVisible: true,
        message: '基本情報を更新しました',
        type: 'success'
      })
      setIsEditing(false)
    } catch (error) {
      setError(error.response?.data?.detail || '基本情報の更新に失敗しました')
    }
    setIsLoading(false)
  }

  // キャンセル
  const handleCancel = () => {
    setIsEditing(false)
    setUsername(user?.username || '')
    setEmail(user?.email || '')
    setProfile(user?.profile || '')
    const tz = user?.timezone || 1
    setTimezone(tz)
    const currentTz = getTimezoneOptions().find(opt => opt.value === tz)
    if (currentTz) {
      setTimezoneSearch(currentTz.label)
    }
    setError('')
    setMessage('')
  }

  if (!isEditing) {
    // 表示モード
    return (
      <div className="content-form">
        <h3>基本情報</h3>
        {message && <div className="success">{message}</div>}
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
      <h3>基本情報</h3>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSave}>
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
                setFilteredTimezones(getTimezoneOptions())
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
            {isLoading ? '更新中...' : '保存'}
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

export default ProfileBasicInfo