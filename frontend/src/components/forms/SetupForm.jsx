import { useState } from 'react'

// 初期セットアップフォーム
function SetupForm({ onSetup }) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    const success = await onSetup(email, username, password)
    if (!success) {
      setError('初期セットアップに失敗しました')
    }
    setIsLoading(false)
  }

  return (
    <div className="setup-form">
      <div className="setup-header">
        <h1>mav 初期セットアップ</h1>
        <p>管理者アカウントを作成してください</p>
      </div>
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
          <label>ユーザー名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            minLength={6}
          />
        </div>
        <div>
          <label>パスワード（確認）:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="form-buttons">
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'セットアップ中...' : 'セットアップ完了'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SetupForm