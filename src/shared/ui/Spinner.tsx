import styles from './Spinner.module.css'

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
