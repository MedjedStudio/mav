import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import ConfirmModal from '../ui/ConfirmModal'

function BackupManagement() {
  const [backupInfo, setBackupInfo] = useState(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    loadBackupInfo()
  }, [])

  const loadBackupInfo = async () => {
    try {
      const token = getToken()
      const response = await axios.get(`${API_BASE_URL}/backup/info`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBackupInfo(response.data)
    } catch (error) {
      setError('バックアップ情報の取得に失敗しました')
    }
  }

  const downloadBackup = async () => {
    try {
      setIsDownloading(true)
      setMessage('')
      setError('')

      const token = getToken()
      const response = await axios.get(`${API_BASE_URL}/backup/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      // ファイル名を取得（Content-Dispositionヘッダーから）
      const contentDisposition = response.headers['content-disposition']
      let filename = 'mav_backup.zip'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^";\s]+)"?/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '')
        }
      }

      // ダウンロード実行
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMessage('バックアップのダウンロードが完了しました')
    } catch (error) {
      setError('バックアップのダウンロードに失敗しました')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.zip')) {
      setError('ZIPファイルを選択してください')
      return
    }

    // モーダルで確認
    setSelectedFile(file)
    setConfirmModal({
      isOpen: true,
      title: 'バックアップの復元',
      message: '復元を実行すると、現在のデータはすべて上書きされます。\nこの操作は元に戻すことができません。\n\n続行しますか？',
      onConfirm: () => performRestore(file, event.target)
    })
  }

  const performRestore = async (file, inputElement) => {
    // モーダルを閉じる
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })

    try {
      setIsUploading(true)
      setMessage('')
      setError('')

      const formData = new FormData()
      formData.append('file', file)

      const token = getToken()
      await axios.post(`${API_BASE_URL}/backup/restore`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setMessage('バックアップからの復元が完了しました')
      // バックアップ情報を再読み込み
      await loadBackupInfo()
    } catch (error) {
      const errorMsg = error.response?.data?.detail || '復元に失敗しました'
      setError(errorMsg)
    } finally {
      setIsUploading(false)
      inputElement.value = '' // ファイル選択をクリア
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="backup-management">
      <div className="content-list-header">
        <h3>バックアップ管理</h3>
      </div>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      {backupInfo && (
        <div className="backup-info">
          <h3>現在のデータ状況</h3>
          <div className="info-grid">
            <div className="info-section">
              <h4>データベース</h4>
              <ul>
                <li>ユーザー: {backupInfo.database.users}件</li>
                <li>カテゴリ: {backupInfo.database.categories}件</li>
                <li>コンテンツ: {backupInfo.database.contents}件</li>
              </ul>
            </div>
            <div className="info-section">
              <h4>アップロードファイル</h4>
              <ul>
                <li>ファイル数: {backupInfo.files.count}個</li>
                <li>合計サイズ: {formatFileSize(backupInfo.files.total_size)}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="backup-actions">
        <div className="action-section">
          <h3>バックアップの作成</h3>
          <p>データベースとアップロードファイルを含む完全なバックアップを作成します。</p>
          <button 
            className="btn-primary"
            onClick={downloadBackup}
            disabled={isDownloading}
          >
            {isDownloading ? 'ダウンロード中...' : 'バックアップをダウンロード'}
          </button>
        </div>

        <div className="action-section restore-section">
          <h3>バックアップからの復元</h3>
          <div className="warning">
            <strong>警告:</strong> 復元を実行すると、現在のすべてのデータが上書きされます。
            この操作は元に戻すことができません。
          </div>
          <div className="file-upload">
            <input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              disabled={isUploading}
              id="backup-file"
            />
            <label htmlFor="backup-file" className="btn-secondary">
              {isUploading ? '復元中...' : 'バックアップファイルを選択'}
            </label>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="上書き"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          // ファイル選択をクリア
          const fileInput = document.getElementById('backup-file')
          if (fileInput) fileInput.value = ''
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
        }}
      />
    </div>
  )
}

export default BackupManagement