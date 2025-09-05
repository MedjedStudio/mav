import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import ConfirmModal from '../ui/ConfirmModal'
import Toast from '../ui/Toast'
import { createThumbnailProps } from '../../utils/image'

// ファイル管理コンポーネント
function FileManagement() {
  const [files, setFiles] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  })

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    // ページ数の再計算
    const pages = Math.ceil(files.length / itemsPerPage)
    setTotalPages(pages)
    // ページ数が減った場合は1ページ目に戻す
    if (currentPage > pages && pages > 0) {
      setCurrentPage(1)
    }
  }, [files, currentPage])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const token = getToken()
      const response = await axios.get(`${API_BASE_URL}/uploads/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFiles(response.data)
    } catch (error) {
      console.error('Error loading files:', error)
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
        setToast({
          isVisible: true,
          message: `ファイル「${file.name}」のアップロードに失敗しました: ${errorMessage}`,
          type: 'error'
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
        setToast({
          isVisible: true,
          message: 'マークダウン形式でクリップボードにコピーしました',
          type: 'success'
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
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.width = '2em'
  textArea.style.height = '2em'
  textArea.style.padding = '0'
  textArea.style.border = 'none'
  textArea.style.outline = 'none'
  textArea.style.boxShadow = 'none'
  textArea.style.background = 'transparent'
  document.body.appendChild(textArea)
  textArea.select()
    try {
      document.execCommand('copy')
      setToast({
        isVisible: true,
        message: 'マークダウン形式でクリップボードにコピーしました',
        type: 'success'
      })
    } catch {
      setToast({
        isVisible: true,
        message: 'コピーに失敗しました。手動でコピーしてください: ' + text,
        type: 'error'
      })
    }
    document.body.removeChild(textArea)
  }

  if (isLoading) {
    return <div className="loading">読み込み中...</div>
  }

  // ページごとのファイル抽出
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedFiles = files.slice(startIndex, endIndex)

  return (
    <div className="content-list">
      <div className="content-list-header">
        <h3>ファイル管理</h3>
        <div className="file-upload-section">
          <label className={`btn-primary upload-btn ${isUploading ? 'disabled' : ''}`}>
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
        <>
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
              {paginatedFiles.map(file => (
                <tr key={file.id}>
                  <td>
                    <div className="admin-thumbnail">
                      {file.mime_type.startsWith('image/') ? (
                        <img 
                          {...createThumbnailProps(
                            `${API_BASE_URL}${file.url}`,
                            'small',
                            {
                              alt: file.original_filename,
                              className: "admin-thumb-image"
                            }
                          )}
                        />
                      ) : (
                        <div className="file-preview-placeholder" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px'}}>
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
          {/* ページネーションUI */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ≪
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ＜
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  page === currentPage - 3 || 
                  page === currentPage + 3
                ) {
                  return <span key={page} className="pagination-dots">...</span>
                }
                return null
              })}
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ＞
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                ≫
              </button>
            </div>
          )}
        </>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ isVisible: false, message: '', type: 'success' })}
      />
    </div>
  )
}

export default FileManagement