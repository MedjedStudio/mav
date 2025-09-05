import { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../services/api'
import { getToken } from '../utils/auth'
import { formatDateToUserTimezone } from '../utils/timezone'
import AdminSidebar from './admin/AdminSidebar'
import ContentForm from './admin/ContentForm'
import CategoryForm from './admin/CategoryForm'
import FileManagement from './admin/FileManagement'
import BackupManagement from './admin/BackupManagement'
import UserManagement from './admin/UserManagement'
import ConfirmModal from './ui/ConfirmModal'
import { createThumbnailProps } from '../utils/image'

// 画像抽出関数
export function extractFirstImage(markdown) {
  const imageRegex = /!\[.*?\]\((.*?)\)/
  const match = markdown.match(imageRegex)
  if (!match) return null
  
  const imageUrl = match[1]
  
  // 絶対URLの場合はそのまま返す
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 相対パスの場合は相対パスを返す（API_BASE_URLは表示時に追加）
  return imageUrl
}

// コンテンツから画像Markdownを除去する関数
export function removeFirstImage(markdown) {
  const imageRegex = /!\[.*?\]\((.*?)\)/
  return markdown.replace(imageRegex, '').trim()
}

// 管理者パネル
function AdminPanel({ user }) {
  const [contents, setContents] = useState([])
  const [editingContent, setEditingContentRaw] = useState(null)
  // 編集時に画面最上部へスクロール
  const setEditingContent = (content) => {
    setEditingContentRaw(content)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }
  const [showForm, setShowForm] = useState(false)
  const [activeView, setActiveView] = useState('contents') // 'contents', 'categories', or 'profile'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now())
  
  // カテゴリ管理用の状態
  const [categories, setCategories] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [draggedCategory, setDraggedCategory] = useState(null)
  
  // 確認モーダル用の状態
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  })

  useEffect(() => {
    loadContents()
    loadCategories()
  }, [])

  useEffect(() => {
    loadContents()
  }, [currentPage])

  const loadContents = async () => {
    const token = getToken()
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/admin?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const allContents = response.data
      
      setImageRefreshKey(Date.now())
      
      // ページネーション計算
      const totalItems = allContents.length
      const pages = Math.ceil(totalItems / itemsPerPage)
      setTotalPages(pages)
      
      if (currentPage > pages && pages > 0) {
        setCurrentPage(1)
        return
      }
      
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setContents(allContents.slice(startIndex, endIndex))
    } catch (error) {
    }
  }

  const handleSave = async (contentData) => {
    const token = getToken()
    try {
      if (editingContent) {
        await axios.put(`${API_BASE_URL}/contents/${editingContent.id}`, contentData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE_URL}/contents/`, contentData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setCurrentPage(1)
      setImageRefreshKey(Date.now())
      await loadContents()
      setEditingContent(null)
      setShowForm(false)
    } catch (error) {
      alert(`保存に失敗しました: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleDelete = async (id) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/contents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setCurrentPage(1) // 削除後は1ページ目に戻る
      loadContents()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
    } catch (error) {
    }
  }

  const showDeleteConfirm = (id, title) => {
    setConfirmModal({
      isOpen: true,
      title: 'コンテンツ削除',
      message: `「${title}」を削除しますか？`,
      onConfirm: () => handleDelete(id)
    })
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setCategories(response.data)
    } catch (error) {
    }
  }

  const handleCategorySave = async (categoryData) => {
    const token = getToken()
    try {
      if (editingCategory) {
        await axios.put(`${API_BASE_URL}/categories/${editingCategory.id}`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_BASE_URL}/categories/`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      loadCategories()
      setEditingCategory(null)
      setShowCategoryForm(false)
      // PublicViewのカテゴリ更新を通知
      window.dispatchEvent(new CustomEvent('categoryUpdate'))
    } catch (error) {
      alert(error.response?.data?.detail || '保存に失敗しました')
    }
  }

  const handleCategoryDelete = async (id) => {
    const token = getToken()
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      loadCategories()
      setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })
      // PublicViewのカテゴリ更新を通知
      window.dispatchEvent(new CustomEvent('categoryUpdate'))
    } catch (error) {
      alert(error.response?.data?.detail || '削除に失敗しました')
    }
  }

  const showCategoryDeleteConfirm = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: 'カテゴリ削除',
      message: `「${name}」カテゴリを削除しますか？\nこのカテゴリの記事は「未分類」になります。`,
      onConfirm: () => handleCategoryDelete(id, name)
    })
  }

  // カテゴリドラッグ&ドロップ機能（サンプルコード参考）
  const handleDragStart = (e, category) => {
    const row = e.target.closest('tr')
    if (!row) return
    setDraggedCategory(category)
    e.dataTransfer.effectAllowed = 'move'
    try { 
      e.dataTransfer.setData('text/plain', '') 
    } catch (_) {}
    // ドラッグ中の行に色を付ける
    row.classList.add('dragging')
  }

  const handleDragEnd = (e) => {
    if (draggedCategory) {
      const row = e.target.closest('tr')
      if (row) row.classList.remove('dragging')
    }
    setDraggedCategory(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!draggedCategory) return

    const tbody = e.currentTarget
    const afterElement = getDragAfterElement(tbody, e.clientY)
    const draggedRow = tbody.querySelector('.dragging')
    
    if (afterElement == null) {
      tbody.appendChild(draggedRow)
    } else {
      tbody.insertBefore(draggedRow, afterElement)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    if (!draggedCategory) return

    const tbody = e.currentTarget
    const rows = [...tbody.querySelectorAll('tr')]
    
    // ドラッグ中のスタイルを削除
    const draggedRow = tbody.querySelector('.dragging')
    if (draggedRow) {
      draggedRow.classList.remove('dragging')
    }
    
    // 現在のDOM順序からsort_orderを再計算
    const updatedCategories = rows.map((row, index) => {
      const categoryId = parseInt(row.getAttribute('data-category-id'))
      const category = categories.find(cat => cat.id === categoryId)
      return {
        ...category,
        sort_order: index + 1
      }
    })

    setCategories(updatedCategories)
    setDraggedCategory(null)

    // サーバーに並び順を送信
    await updateCategorySortOrder(updatedCategories)
  }

  // サンプルコードのgetDragAfterElement関数
  const getDragAfterElement = (container, y) => {
    const rows = [...container.querySelectorAll('tr')].filter(r => !r.classList.contains('dragging'))
    return rows.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - (box.top + box.height / 2)
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child }
        }
        return closest
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element
  }


  const updateCategorySortOrder = async (sortedCategories) => {
    const token = getToken()
    try {
      const orderData = sortedCategories.map(cat => ({
        id: cat.id,
        sort_order: cat.sort_order
      }))

      console.log('Sending sort order data:', orderData)
      console.log('API URL:', `${API_BASE_URL}/categories/sort-order`)
      console.log('Token:', token ? 'Present' : 'Missing')

      const response = await axios.put(`${API_BASE_URL}/categories/sort-order`, orderData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Sort order update response:', response.data)
    } catch (error) {
      console.error('並び順更新エラー:')
      console.error('Status:', error.response?.status)
      console.error('Data:', error.response?.data)
      console.error('Message:', error.message)
      console.error('Full error:', error)
      alert(`並び順の更新に失敗しました: ${error.response?.status} - ${error.response?.data?.detail || error.message}`)
      // エラー時は元の順序に戻す
      loadCategories()
    }
  }


  const handleViewChange = (view) => {
    // memberユーザーはadmin専用ビューにアクセス不可（contents、filesは除く）
    if (user?.role === 'member' && ['categories', 'backup', 'users'].includes(view)) {
      return
    }
    setActiveView(view)
    setShowForm(false)
    setEditingContent(null)
    setShowCategoryForm(false)
    setEditingCategory(null)
  }

  return (
    <div className="admin-panel">
      <AdminSidebar 
        activeView={activeView} 
        onViewChange={handleViewChange}
        user={user}
      />

      <div className="admin-main">
        {activeView === 'backup' && user?.role === 'admin' ? (
          <BackupManagement />
        ) : activeView === 'users' && user?.role === 'admin' ? (
          <UserManagement />
        ) : activeView === 'files' ? (
          <FileManagement />
        ) : activeView === 'categories' && user?.role === 'admin' ? (
          (showCategoryForm || editingCategory) ? (
            <CategoryForm
              category={editingCategory}
              onSave={handleCategorySave}
              onCancel={() => { setShowCategoryForm(false); setEditingCategory(null) }}
            />
          ) : (
            <div className="content-list">
              <div className="content-list-header">
                <h3>カテゴリ一覧</h3>
                <button 
                  className="btn-primary"
                  onClick={() => { setShowCategoryForm(true); setEditingCategory(null) }}
                >
                  新規カテゴリ作成
                </button>
              </div>
              <p style={{ margin: '10px 0', color: '#666', fontSize: '14px' }}>
                ドラッグ&ドロップで並び順を変更できます
              </p>
              <table className="admin-content-table category-table">
                <thead>
                  <tr>
                    <th>カテゴリ名</th>
                    <th>説明</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody 
                  onDragOver={handleDragOver} 
                  onDrop={handleDrop}
                  style={{ position: 'relative' }}
                >
                  {categories.map((category) => (
                    <tr 
                      key={category.id}
                      data-category-id={category.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, category)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setEditingCategory(category)}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <td>
                        <div className="content-title">{category.name}</div>
                      </td>
                      <td>
                        <div className="content-excerpt">
                          {category.description || '説明なし'}
                        </div>
                      </td>
                      <td>
                        <div className="content-actions">
                          {/* 編集ボタンは非表示。削除ボタンは残す */}
                          <button onClick={(e) => { e.stopPropagation(); showCategoryDeleteConfirm(category.id, category.name) }}>削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (showForm || editingContent) ? (
          <ContentForm
            content={editingContent}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingContent(null) }}
          />
        ) : activeView === 'contents' ? (
          <div className="content-list">
            <div className="content-list-header">
              <h3>コンテンツ一覧</h3>
              <button 
                className="btn-primary"
                onClick={() => { setShowForm(true); setEditingContent(null) }}
              >
                新規コンテンツ作成
              </button>
            </div>
            <table className="admin-content-table">
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>内容</th>
                  <th>カテゴリ</th>
                  <th>公開状態</th>
                  <th>作成日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {contents.map(content => (
                  <tr key={content.id} onClick={() => setEditingContent(content)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="admin-title-cell">
                        {extractFirstImage(content.content) && (
                          <div className="admin-thumbnail">
                            <img 
                              key={`${content.id}-${imageRefreshKey}`}
                              {...createThumbnailProps(
                                extractFirstImage(content.content).startsWith('http') 
                                  ? extractFirstImage(content.content) 
                                  : `${API_BASE_URL}${extractFirstImage(content.content)}`,
                                'small',
                                {
                                  alt: "サムネイル",
                                  className: "admin-thumb-image",
                                  onError: (e) => {
                                    e.target.style.display = 'none'
                                    const placeholder = e.target.parentElement.querySelector('.thumbnail-error')
                                    if (placeholder) placeholder.style.display = 'flex'
                                  }
                                }
                              )}
                            />
                            <div className="thumbnail-error" style={{display: 'none'}}>
                              リンク切れ
                            </div>
                          </div>
                        )}
                        <div className="content-title">{content.title}</div>
                      </div>
                    </td>
                    <td>
                      <div className="content-excerpt">
                        {(() => {
                          const contentWithoutImage = removeFirstImage(content.content)
                          return contentWithoutImage.length > 120 
                            ? contentWithoutImage.substring(0, 120) + '...'
                            : contentWithoutImage
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="content-categories">
                        {content.categories && content.categories.length > 0 
                          ? content.categories.map(cat => (
                              <span key={cat} className="admin-category-tag">
                                {cat}
                              </span>
                            ))
                          : <span className="admin-category-tag">未分類</span>
                        }
                      </div>
                    </td>
                    <td>
                      <span className={`publish-status ${content.is_published ? 'published' : 'unpublished'}`}>
                        {content.is_published ? '公開' : '非公開'}
                      </span>
                    </td>
                    <td>
                      {formatDateToUserTimezone(content.created_at, user?.timezone)}
                    </td>
                    <td>
                      <div className="content-actions">
                        {/* 編集ボタンは非表示。削除ボタンは残す */}
                        <button onClick={(e) => { e.stopPropagation(); showDeleteConfirm(content.id, content.title) }}>削除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* ページネーション */}
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
          </div>
        ) : (
          // memberユーザーの場合は何も表示しない（プロフィールのみ）
          <div></div>
        )}
      </div>
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
      />
    </div>
  )
}

export default AdminPanel