import React, { useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const handleConvert = async () => {
    if (!url) return
    
    setLoading(true)
    try {
      const response = await axios.post(`${API_BASE_URL}/convert`, { url })
      setResult(response.data)
    } catch (error) {
      setResult({ error: error.response?.data?.detail || 'エラーが発生しました' })
    }
    setLoading(false)
  }

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status`)
      setStatus(response.data)
    } catch (error) {
      setStatus({ error: 'ステータス取得に失敗しました' })
    }
  }

  return (
    <div className="container">
      <h1>MAV Application</h1>
      
      <div className="section">
        <h2>URL変換</h2>
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URLを入力してください"
            className="url-input"
          />
          <button onClick={handleConvert} disabled={loading || !url}>
            {loading ? '処理中...' : '変換'}
          </button>
        </div>
        
        {result && (
          <div className="result">
            <h3>結果:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="section">
        <h2>ステータス確認</h2>
        <button onClick={checkStatus}>ステータス確認</button>
        
        {status && (
          <div className="result">
            <h3>ステータス:</h3>
            <pre>{JSON.stringify(status, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App