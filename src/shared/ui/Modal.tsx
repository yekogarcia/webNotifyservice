import type { ReactNode } from 'react'
import { Button } from './Button'
import styles from './Modal.module.css'

export function Modal({
  title,
  children,
  onClose,
  actions,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  actions?: ReactNode
  wide?: boolean
}) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`${styles.dialog} ${wide ? styles.dialogWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.foot}>{actions}</div> : null}
      </div>
    </div>
  )
}
