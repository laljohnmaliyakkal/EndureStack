export default function Modal({ isOpen, onClose, title, children, footer }) {
    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div
                className="card"
                style={{ width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}
                onClick={e => e.stopPropagation()}
            >
                {title && <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{title}</h3>}

                <div style={{ marginBottom: footer ? '1.5rem' : '0' }}>
                    {children}
                </div>

                {footer && (
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
