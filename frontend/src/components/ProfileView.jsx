import AdminProfileEdit from './admin/AdminProfileEdit'

// 独立したプロフィール画面
function ProfileView({ user, onUpdate }) {
  return (
    <div className="profile-view">
      <div className="profile-content">
        <AdminProfileEdit user={user} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

export default ProfileView