import { useEffect } from 'react'
import { useToastStore } from '@/shared/store/toast.store'
import styles from './Toasts.module.css'

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (toasts.length === 0) return
    const t = window.setTimeout(() => dismiss(toasts[0].id), 4500)
    return () => window.clearTimeout(t)
  }, [toasts, dismiss])

  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`${styles.toast} ${styles[t.kind]}`} onClick={() => dismiss(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  )
}
