import { cn } from '@/shared/lib/cn'
import styles from './Badge.module.css'

const TONE: Record<string, string> = {
  CREATED: 'neutral',
  QUEUED: 'info',
  PROCESSING: 'info',
  SENT: 'success',
  DELIVERED: 'success',
  FAILED: 'danger',
  RETRYING: 'warning',
  EMAIL: 'info',
  SMS: 'neutral',
  PUSH: 'neutral',
  WHATSAPP: 'success',
  ACTIVE: 'success',
  INACTIVE: 'warning',
  DELETED: 'danger',
  ACTIVO: 'success',
  INACTIVO: 'warning',
  ELIMINADO: 'danger',
}

export function Badge({ value }: { value: string }) {
  return <span className={cn(styles.badge, styles[TONE[value] ?? 'neutral'])}>{value}</span>
}
