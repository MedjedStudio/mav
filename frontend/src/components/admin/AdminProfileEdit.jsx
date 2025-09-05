import ProfileAvatar from './ProfileAvatar'
import ProfileBasicInfo from './ProfileBasicInfo'
import ProfileSecurity from './ProfileSecurity'

// 管理パネル用プロファイル編集
function AdminProfileEdit({ user, onUpdate }) {
  return (
    <div className="profile-edit">
      {/* アバター画像セクション */}
      <ProfileAvatar user={user} onUpdate={onUpdate} />

      <div className="profile-forms">
        {/* 基本情報セクション */}
        <ProfileBasicInfo user={user} onUpdate={onUpdate} />

        {/* セキュリティセクション */}
        <ProfileSecurity user={user} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

export default AdminProfileEdit