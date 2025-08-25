import React, { useState, useEffect } from 'react'

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

export default Header