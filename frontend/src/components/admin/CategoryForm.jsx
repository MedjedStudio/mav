import { useState } from 'react'

// カテゴリフォーム
function CategoryForm({ category, onSave, onCancel }) {
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ name, description })
  }

  return (
    <div className="content-form">
      <h3>{category ? 'カテゴリ編集' : '新規カテゴリ作成'}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label>カテゴリ名:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>説明:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-buttons">
          <button type="submit">保存</button>
          <button type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </form>
    </div>
  )
}

export default CategoryForm