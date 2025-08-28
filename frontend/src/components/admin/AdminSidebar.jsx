
// 管理メニューコンポーネント
function AdminSidebar({ activeView, onViewChange, user }) {
  const isAdmin = user?.role === 'admin'
  
  return (
    <div className="admin-sidebar">
      <h2>管理メニュー</h2>
      <nav className="admin-nav">
        <button 
          className={activeView === 'contents' ? 'active' : ''}
          onClick={() => onViewChange('contents')}
        >
          コンテンツ管理
        </button>
        <button 
          className={activeView === 'files' ? 'active' : ''}
          onClick={() => onViewChange('files')}
        >
          ファイル管理
        </button>
        {isAdmin && (
          <button 
            className={activeView === 'categories' ? 'active' : ''}
            onClick={() => onViewChange('categories')}
          >
            カテゴリ管理
          </button>
        )}
        {isAdmin && (
          <button 
            className={activeView === 'users' ? 'active' : ''}
            onClick={() => onViewChange('users')}
          >
            ユーザー管理
          </button>
        )}
        {isAdmin && (
          <button 
            className={activeView === 'backup' ? 'active' : ''}
            onClick={() => onViewChange('backup')}
          >
            バックアップ管理
          </button>
        )}
      </nav>
    </div>
  )
}

export default AdminSidebar