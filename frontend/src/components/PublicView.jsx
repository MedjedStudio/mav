import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { API_BASE_URL } from '../services/api'
import { formatDateToUserTimezone } from '../utils/timezone'
import { extractFirstImage, removeFirstImage } from './AdminPanel'
import { useUser } from '../contexts/UserContext'

// 公開ビュー
function PublicView({ contentId, setContentId, resetCategory }) {
  const { getUserTimezone } = useUser()
  const [contents, setContents] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedContent, setSelectedContent] = useState(null)
  const [view, setView] = useState('timeline') // 'timeline' または 'content'
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 12

  useEffect(() => {
    loadContents()
    loadCategories()
  }, [])

  useEffect(() => {
    if (resetCategory) {
      setSelectedCategory(null)
      setCurrentPage(1)
    }
  }, [resetCategory])

  // カテゴリ変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory])

  useEffect(() => {
    loadContents()
  }, [selectedCategory, currentPage])

  // URL パラメータで指定されたコンテンツを読み込み
  useEffect(() => {
    if (contentId) {
      loadContentById(contentId)
    } else {
      setView('timeline')
      setSelectedContent(null)
    }
  }, [contentId])

  const loadContents = async () => {
    try {
      const url = selectedCategory 
        ? `${API_BASE_URL}/contents/?category=${encodeURIComponent(selectedCategory)}`
        : `${API_BASE_URL}/contents/`
      const response = await axios.get(url)
      const allContents = response.data
      
      // ページネーション計算
      const totalItems = allContents.length
      const pages = Math.ceil(totalItems / itemsPerPage)
      setTotalPages(pages)
      
      // 現在のページが総ページ数を超えている場合は1ページ目に戻る
      if (currentPage > pages && pages > 0) {
        setCurrentPage(1)
        return
      }
      
      // 現在のページの内容を設定
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      setContents(allContents.slice(startIndex, endIndex))
    } catch (error) {
    }
  }

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`)
      setCategories(response.data.map(cat => cat.name))
    } catch (error) {
    }
  }

  const loadContentById = async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contents/${id}`)
      setSelectedContent(response.data)
      setView('content')
    } catch (error) {
      // コンテンツが見つからない場合はタイムラインに戻る
      handleBackToTimeline()
    }
  }

  const updateUrl = (id) => {
    const url = id ? `/content/${id}` : '/'
    window.history.pushState({}, '', url)
  }

  const handleContentClick = (content) => {
    setSelectedContent(content)
    setView('content')
    setContentId(content.id)
    updateUrl(content.id)
  }

  const handleBackToTimeline = () => {
    setView('timeline')
    setSelectedContent(null)
    setContentId(null)
    updateUrl(null)
  }

  if (view === 'content' && selectedContent) {
    return (
      <div className="public-view">
        <div className="main-content">
          <div className="content-nav">
            <a href="#" onClick={(e) => { e.preventDefault(); handleBackToTimeline() }} className="back-link">
              BACK
            </a>
          </div>
          <article className="content-detail">
            <header className="content-header">
              <h1>{selectedContent.title}</h1>
              <div className="content-meta">
                <span>投稿日: {formatDateToUserTimezone(selectedContent.created_at, getUserTimezone())}</span>
                <div>
                  {selectedContent.categories && selectedContent.categories.map(cat => (
                    <span key={cat} className="content-category" style={{ marginLeft: '8px' }}>
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </header>
            <div className="content-body">
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
                        margin: '16px 0'
                      }}
                    />
                  )
                }}
              >
                {selectedContent.content}
              </ReactMarkdown>
            </div>
          </article>
        </div>
        
        <div className="sidebar">
          <h3>カテゴリ</h3>
          <ul className="category-filter">
            <li>
              <button 
                className={selectedCategory === null ? 'active' : ''}
                onClick={() => { 
                  setSelectedCategory(null)
                  handleBackToTimeline()
                }}
              >
                すべて
              </button>
            </li>
            {categories.map(category => (
              <li key={category}>
                <button 
                  className={selectedCategory === category ? 'active' : ''}
                  onClick={() => { 
                    setSelectedCategory(category)
                    handleBackToTimeline()
                  }}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="public-view">
      <div className="main-content">
        {contents.length === 0 ? (
          <p>まだコンテンツがありません。</p>
        ) : (
          <>
            <div className="content-grid">
              {contents.map(content => (
                <article key={content.id} className="content-card" onClick={() => handleContentClick(content)}>
                  {extractFirstImage(content.content) && (
                    <div className="card-thumbnail">
                      <img 
                        src={extractFirstImage(content.content).startsWith('http') 
                          ? extractFirstImage(content.content) 
                          : `${API_BASE_URL}${extractFirstImage(content.content)}`} 
                        alt={content.title} 
                        className="card-image"
                        onError={(e) => {
                          e.target.parentElement.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="card-content">
                    <h3 className="card-title">{content.title}</h3>
                    <p className="card-excerpt">
                      {(() => {
                        const contentWithoutImage = removeFirstImage(content.content)
                        return contentWithoutImage.length > 80 
                          ? contentWithoutImage.substring(0, 80) + '...' 
                          : contentWithoutImage
                      })()}
                    </p>
                    <div className="card-meta">
                      <span className="card-date">{formatDateToUserTimezone(content.created_at, getUserTimezone()).split(' ')[0]}</span>
                      <div className="card-categories">
                        {content.categories && content.categories.slice(0, 2).map(cat => (
                          <span key={cat} className="card-category">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            
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
          </>
        )}
      </div>
      
      <div className="sidebar">
        <h3>カテゴリ</h3>
        <ul className="category-filter">
          <li>
            <button 
              className={selectedCategory === null ? 'active' : ''}
              onClick={() => setSelectedCategory(null)}
            >
              すべて
            </button>
          </li>
          {categories.map(category => (
            <li key={category}>
              <button 
                className={selectedCategory === category ? 'active' : ''}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default PublicView