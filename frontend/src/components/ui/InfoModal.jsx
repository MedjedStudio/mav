
function InfoModal({ isOpen, title, message, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <button onClick={onClose} className="modal-button">OK</button>
      </div>
    </div>
  )
}

export default InfoModal