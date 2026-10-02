import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import styles from './Card.module.css'

type Glow = 'none' | 'purple' | 'blue' | 'orange'

export function Card({
  title,
  subtitle,
  action,
  glow = 'none',
  children,
  className,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  glow?: Glow
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(styles.card, glow !== 'none' && styles[`glow-${glow}`], className)}>
      {(title ?? action) && (
        <header className={styles.head}>
          <div>
            {typeof title === 'string' ? <h2>{title}</h2> : title}
            {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
