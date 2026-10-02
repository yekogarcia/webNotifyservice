import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './IconButton.module.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string
  variant?: 'ghost' | 'danger' | 'primary'
  children: ReactNode
}

/* Acción de tabla con icono (lápiz = editar, basura = eliminar, …).
 * Radio 0.3125rem como el resto de componentes. */
export function IconButton({ title, variant = 'ghost', className, children, ...rest }: Props) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(styles.iconBtn, styles[variant], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
