
function Footer({ onLogin, needsSetup, user, onAdminClick }) {
  const handleAdminClick = () => {
    if (user) {
      // Already logged in, go to Admin page
      onAdminClick()
    } else {
      // Not logged in, go to login page
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

export default Footer