
// 確認モーダル
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "削除", showCancel = true }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
          {showCancel && (
            <button onClick={onCancel}>
              キャンセル
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal