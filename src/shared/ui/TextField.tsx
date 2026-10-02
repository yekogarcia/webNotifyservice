import type { InputHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Field.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  hint?: string | undefined
}

export function TextField({ label, error, hint, id, className, ...rest }: Props) {
  const fieldId = id ?? `f-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className={cn(styles.wrap, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <input
        id={fieldId}
        className={cn(styles.input, error && styles.invalid)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-err`} className={styles.error} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  )
}
