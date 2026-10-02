import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Field.module.css'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string | undefined
  options: Array<{ value: string; label: string }>
}

export function SelectField({ label, error, options, id, className, ...rest }: Props) {
  const fieldId = id ?? `s-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className={cn(styles.wrap, className)}>
      <label className={styles.label} htmlFor={fieldId}>
        {label}
      </label>
      <select id={fieldId} className={cn(styles.input, error && styles.invalid)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
