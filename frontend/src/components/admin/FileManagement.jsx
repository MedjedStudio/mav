import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import ConfirmModal from '../ui/ConfirmModal'
import InfoModal from '../ui/InfoModal'

// ファイル管理コンポーネント
function FileManagement() {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    title: '',
    message: ''
  })

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const response = await axios.get(`${API_BASE_URL}/uploads/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFiles(response.data)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files)
    if (uploadedFiles.length === 0) return

    setIsUploading(true)
    
    for (const file of uploadedFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const token = getToken()
        await axios.post(`${API_BASE_URL}/uploads/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message || '不明なエラー'
        setInfoModal({
          isOpen: true,
          title: 'アップロード失敗',
          message: `ファイル「${file.name}」のアップロードに失敗しました: ${errorMessage}`
        })
      }
    }

    setIsUploading(false)
    event.target.value = ''
    loadFiles()
  }

  const handleDelete = async (filename) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/uploads/${filename}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadFiles()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
      alert('ファイル削除に失敗しました')
    }
  }

  const showDeleteConfirm = (filename, originalFilename) => {
    setConfirmModal({
      isOpen: true,
      title: 'ファイル削除',
      message: `「${originalFilename}」を削除しますか？`,
      onConfirm: () => handleDelete(filename)
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const copyToClipboard = (url) => {
    const markdownImage = `![画像](${url})`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(markdownImage).then(() => {
        setInfoModal({
          isOpen: true,
          title: 'コピー完了',
          message: 'マークダウン形式でクリップボードにコピーしました'
        })
      }).catch(() => {
        // フォールバック: テキストエリアを使用
        fallbackCopyToClipboard(markdownImage)
      })
    } else {
      // navigator.clipboardが利用できない場合のフォールバック
      fallbackCopyToClipboard(markdownImage)
    }
  }

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      setInfoModal({
        isOpen: true,
        title: 'コピー完了',
        message: 'マークダウン形式でクリップボードにコピーしました'
      })
    } catch {
      setInfoModal({
        isOpen: true,
        title: 'コピー失敗',
        message: 'コピーに失敗しました。手動でコピーしてください: ' + text
      })
    }
    document.body.removeChild(textArea)
  }

  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div className="content-list">
      <div className="content-list-header">
        <h3>ファイル管理</h3>
        <div className="file-upload-section">
          <label className="btn-primary upload-btn" disabled={isUploading}>
            {isUploading ? 'アップロード中...' : 'ファイルをアップロード'}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
      
      {files.length === 0 ? (
        <p>アップロードされたファイルはありません。</p>
      ) : (
        <table className="admin-content-table">
          <thead>
            <tr>
              <th>プレビュー</th>
              <th>ファイル名</th>
              <th>サイズ</th>
              <th>操作者</th>
              <th>作成日</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.id}>
                <td>
                  <div className="file-preview">
                    {file.mime_type.startsWith('image/') ? (
                      <img 
                        src={`${API_BASE_URL}${file.url}`} 
                        alt={file.original_filename}
                        className="file-preview-image"
                      />
                    ) : (
                      <div className="file-preview-placeholder">
                        📄
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="file-info">
                    <div className="original-filename">{file.original_filename}</div>
                    <div className="filename">{file.filename}</div>
                  </div>
                </td>
                <td>{formatFileSize(file.file_size)}</td>
                <td>{file.uploader}</td>
                <td>{new Date(file.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="content-actions">
                    <button onClick={() => copyToClipboard(file.url)}>コピー</button>
                    <button onClick={() => showDeleteConfirm(file.filename, file.original_filename)}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      <InfoModal
        isOpen={infoModal.isOpen}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  )
}

export default FileManagement