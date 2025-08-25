import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/users`)
      setUsers(response.data)
    } catch (error) {
      console.error('ユーザーデータの取得に失敗:', error)
      setUsers([])
    }
    setUsersLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  return (
    <div className="container">
      <h1>MAV Application</h1>
      
      <div className="section">
        <h2>ユーザーデータ（DB疎通確認）</h2>
        <button onClick={loadUsers} disabled={usersLoading}>
          {usersLoading ? '読み込み中...' : 'ユーザーデータを再取得'}
        </button>
        
        {users.length > 0 ? (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ユーザー名</th>
                  <th>メール</th>
                  <th>作成日時</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.email || '-'}</td>
                    <td>{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="result">
            <p>ユーザーデータがありません</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App