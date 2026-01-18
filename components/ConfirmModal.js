import Modal from './Modal'

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isDanger = false, isAlert = false }) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={isAlert ? onClose : undefined} // Should strict confirm usually require button click? Alerts can close on background.
            title={title}
            footer={
                <>
                    {!isAlert && (
                        <button
                            onClick={onClose}
                            className="btn"
                            style={{ backgroundColor: 'var(--secondary)' }}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm || onClose}
                        className="btn"
                        style={{ backgroundColor: isDanger ? 'var(--danger)' : 'var(--primary)' }}
                    >
                        {isAlert ? 'OK' : confirmText}
                    </button>
                </>
            }
        >
            <p style={{ color: 'var(--foreground)' }}>{message}</p>
        </Modal>
    )
}
