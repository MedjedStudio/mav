import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../services/api'
import { getToken } from '../../utils/auth'
import ReactMarkdown from 'react-markdown'

// コンテンツフォーム
function ContentForm({ content, onSave, onCancel }) {
  const [title, setTitle] = useState(content?.title || '')
  const [contentText, setContentText] = useState(content?.content || '')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([])
  const [availableCategories, setAvailableCategories] = useState([])
  const [isPublished, setIsPublished] = useState(content?.is_published || false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (content && content.categories && availableCategories.length > 0) {
      // 既存コンテンツのカテゴリIDを設定
      const categoryIds = availableCategories
        .filter(cat => content.categories.includes(cat.name))
        .map(cat => cat.id)
      setSelectedCategoryIds(categoryIds)
    } else if (!content) {
      // 新規作成時はカテゴリを選択しない（未分類として扱う）
      setSelectedCategoryIds([])
    }
  }, [content, availableCategories])

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setAvailableCategories(response.data)
    } catch (error) {
    }
  }

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryIds(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = getToken()
      const response = await axios.post(`${API_BASE_URL}/uploads/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      const markdownImage = `![${response.data.original_filename}](${response.data.url})`
      
      // カーソル位置にマークダウン画像を挿入
      const textarea = document.querySelector('textarea[name="content"]')
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const newContent = contentText.substring(0, start) + markdownImage + contentText.substring(end)
        setContentText(newContent)
        
        // カーソル位置を調整
        setTimeout(() => {
          textarea.focus()
          textarea.selectionStart = textarea.selectionEnd = start + markdownImage.length
        }, 0)
      } else {
        setContentText(prev => prev + '\n' + markdownImage)
      }
    } catch (error) {
      alert('画像のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      event.target.value = '' // ファイル選択をリセット
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ title, content: contentText, category_ids: selectedCategoryIds, is_published: isPublished })
  }

  return (
    <div className="content-form">
      <h3>{content ? 'コンテンツ編集' : '新規コンテンツ作成'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="title-publish-row">
          <div className="title-section">
            <label>タイトル:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="publish-section">
            <div className="publish-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="publish-status">{isPublished ? '公開' : '非公開'}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="content-input-container">
            <div className="editor-header">
              <label>内容:</label>
              <div className="editor-tabs">
                <button 
                  type="button" 
                  onClick={() => setShowPreview(false)}
                  className={`tab-btn ${!showPreview ? 'active' : ''}`}
                >
                  エディタ
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowPreview(true)}
                  className={`tab-btn ${showPreview ? 'active' : ''}`}
                >
                  プレビュー
                </button>
              </div>
            </div>
            <div className="editor-container">
              {!showPreview ? (
                <textarea
                  name="content"
                  value={contentText}
                  onChange={(e) => setContentText(e.target.value)}
                  rows={15}
                  required
                  placeholder="マークダウン形式で入力してください..."
                />
              ) : (
                <div className="markdown-preview">
                  <ReactMarkdown
                    components={{
                      img: ({node, ...props}) => (
                        <img 
                          {...props} 
                          src={props.src?.startsWith('http') ? props.src : `${API_BASE_URL}${props.src}`}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                          style={{
                            maxWidth: '100%',
                            height: 'auto',
                            borderRadius: '6px',
                            margin: '16px 0',
                            display: 'block'
                          }}
                        />
                      )
                    }}
                  >
                    {contentText || '内容を入力してください...'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            <div className="image-upload-section">
              <label className="image-upload-btn" disabled={isUploading}>
                {isUploading ? '画像アップロード中...' : '画像を挿入'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
              </label>
              <small>JPG, PNG, GIF, WebP対応（最大10MB）</small>
            </div>
            <div className="category-section">
              <label>カテゴリ:</label>
              <div className="category-checkboxes">
                {availableCategories.map(cat => (
                  <div key={cat.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`category-${cat.id}`}
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => handleCategoryChange(cat.id)}
                    />
                    <label htmlFor={`category-${cat.id}`}>{cat.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="form-buttons">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </div>
  )
}

export default ContentForm