import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import { formatDateToUserTimezone } from '../../utils/timezone'
import ConfirmModal from '../ui/ConfirmModal'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'member'
  })
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: 'エラー',
    message: ''
  })

  useEffect(() => {
    loadUsers()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const token = getToken()
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCurrentUser(response.data)
    } catch (error) {
      console.error('現在のユーザー情報の取得に失敗:', error)
    }
  }

  const loadUsers = async () => {
    const token = getToken()
    try {
      const response = await axios.get(`${API_BASE_URL}/users/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(response.data)
    } catch (error) {
      console.error('ユーザー一覧の取得に失敗しました:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      setErrorModal({
        isOpen: true,
        title: 'ユーザー一覧取得エラー',
        message: error.response?.data?.detail || error.message
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = getToken()
    
    try {
      const submitData = { ...formData }
      if (editingUser && !submitData.password) {
        delete submitData.password
      }

      if (editingUser) {
        await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE_URL}/users/`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      loadUsers()
      resetForm()
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: 'ユーザー保存エラー',
        message: error.response?.data?.detail || error.message
      })
    }
  }

  const handleDelete = async (userId) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadUsers()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
      setErrorModal({
        isOpen: true,
        title: 'ユーザー削除エラー',
        message: error.response?.data?.detail || error.message
      })
    }
  }

  const showDeleteConfirm = (user) => {
    setConfirmModal({
      isOpen: true,
      title: 'ユーザー削除',
      message: `「${user.username}」を削除しますか？`,
      onConfirm: () => handleDelete(user.id)
    })
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'member'
    })
    setShowForm(false)
  }

  const formatDate = (dateString) => {
    return formatDateToUserTimezone(dateString, currentUser?.timezone)
  }

  const getRoleName = (role) => {
    return role === 'admin' ? '管理者' : 'メンバー'
  }

  const isLastAdmin = (user) => {
    if (user.role !== 'admin') return false
    const adminCount = users.filter(u => u.role === 'admin').length
    return adminCount <= 1
  }

  return (
    <div className="user-management">
      {showForm ? (
        <div className="content-form">
          <h3>{editingUser ? 'ユーザー編集' : '新規ユーザー作成'}</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label>ユーザー名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label>メールアドレス</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label>パスワード {editingUser && '（変更する場合のみ入力）'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            
            <div>
              <label>ロール</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={editingUser && isLastAdmin(editingUser)}
              >
                <option value="member">メンバー</option>
                <option value="admin">管理者</option>
              </select>
              {editingUser && isLastAdmin(editingUser) && (
                <small className="form-note">最後の管理者はロールを変更できません</small>
              )}
            </div>
            
            <div className="form-buttons">
              <button type="submit">
                {editingUser ? '更新' : '作成'}
              </button>
              <button type="button" onClick={resetForm}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="content-list">
          <div className="content-list-header">
            <h3>ユーザー一覧</h3>
            <button 
              className="btn-primary"
              onClick={() => setShowForm(true)}
            >
              新規ユーザー作成
            </button>
          </div>
          
          <table className="admin-content-table">
            <thead>
              <tr>
                <th>ユーザー名</th>
                <th>メールアドレス</th>
                <th>ロール</th>
                <th>作成日</th>
                <th>最終更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} onClick={() => currentUser && user.id !== currentUser.id && handleEdit(user)} style={{ cursor: currentUser && user.id !== currentUser.id ? 'pointer' : 'default' }}>
                  <td>
                    <div className="content-title">{user.username}</div>
                  </td>
                  <td>{user.email}</td>
                  <td>{getRoleName(user.role)}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.updated_at)}</td>
                  <td>
                    <div className="content-actions">
                      {/* 編集ボタンは非表示。削除ボタンは残す */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); showDeleteConfirm(user) }}
                        disabled={isLastAdmin(user)}
                        title={isLastAdmin(user) ? '最後の管理者は削除できません' : ''}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      
      <ConfirmModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onConfirm={() => setErrorModal({ isOpen: false, title: 'エラー', message: '' })}
        onCancel={() => setErrorModal({ isOpen: false, title: 'エラー', message: '' })}
        confirmText="OK"
        showCancel={false}
      />
    </div>
  )
}

export default UserManagement