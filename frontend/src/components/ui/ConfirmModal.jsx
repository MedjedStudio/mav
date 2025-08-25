import React from 'react'

// 確認モーダル
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-danger" onClick={onConfirm}>
            削除
          </button>
          <button onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal