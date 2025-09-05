import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../services/api'
import { createThumbnailProps } from '../utils/image'

function Header({ user, onLogout, onHomeClick, onProfileClick, onAdminClick }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // アバター取得
  const fetchAvatar = async () => {
    if (!user || !user.id) {
      setAvatarUrl('')
      return
    }
    
    try {
      const url = `${API_BASE_URL}/uploads/avatar/${user.id}`
      const response = await fetch(url)
      
      if (response.ok) {
        const avatarData = await response.json()
        if (avatarData.avatar_url) {
          setAvatarUrl(avatarData.avatar_url)
        } else {
          setAvatarUrl('')
        }
      } else {
        setAvatarUrl('')
      }
    } catch (error) {
      setAvatarUrl('')
    }
  }

  useEffect(() => {
    fetchAvatar()
  }, [user])
  
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
        <h1 className="header-title" onClick={onHomeClick}>
          <img src="/medjed.png" alt="mav" className="header-icon" />
          mav
        </h1>
        <div className="auth-section">
          {user && (
            <div className="user-menu">
              <button 
                className="user-button"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <span>{user.username}</span>
                {avatarUrl && (
                  <img 
                    {...createThumbnailProps(
                      avatarUrl.startsWith('http') ? avatarUrl : `${API_BASE_URL}${avatarUrl}`,
                      'small',
                      {
                        alt: "アバター",
                        className: "header-avatar"
                      }
                    )}
                  />
                )}
              </button>
              {showDropdown && (
                <div className="dropdown-menu">
                  {user && (user.role === 'admin' || user.role === 'member') && (
                    <button className="dropdown-item" onClick={() => { onAdminClick && onAdminClick(); setShowDropdown(false) }}>
                      管理画面
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => { onProfileClick(); setShowDropdown(false) }}>
                    プロフィール
                  </button>
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

export default Header