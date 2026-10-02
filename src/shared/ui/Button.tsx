import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Button.module.css'

type Variant = 'primary' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn(styles.btn, styles[variant], loading && styles.loading, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Cargando…' : children}
    </button>
  )
}
