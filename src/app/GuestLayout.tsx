import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Mails } from 'lucide-react'
import styles from './GuestLayout.module.css'

export function GuestLayout() {
  const location = useLocation()

  useEffect(() => {
    document.title =
      location.pathname === '/register'
        ? 'Registrar tenant | NotifyService'
        : 'Iniciar sesión | NotifyService'
  }, [location.pathname])

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark} aria-hidden="true">
              <Mails size={20} strokeWidth={1.75} />
            </span>
            <div>
              <p className={styles.brand}>NotifyService</p>
              <p className={styles.brandSub}>Acceso administrativo</p>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
