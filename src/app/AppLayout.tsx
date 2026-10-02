import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppWindow,
  Bell,
  HeartPulse,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mails,
  Menu,
  Search,
  Settings,
  Truck,
  X,
} from 'lucide-react'
import { sessionMeta, useAuthStore } from '@/shared/store/auth.store'
import styles from './AppLayout.module.css'

const LINKS = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/providers', label: 'Proveedores', icon: Truck },
  { to: '/applications', label: 'Aplicaciones', icon: AppWindow },
  { to: '/templates', label: 'Plantillas', icon: LayoutTemplate },
  { to: '/notifications', label: 'Notificaciones', icon: Bell },
  // { to: '/preferences', label: 'Preferencias', icon: Users },
  // { to: '/devices', label: 'Dispositivos', icon: Smartphone },
  { to: '/health', label: 'Salud', icon: HeartPulse },
]

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Supervisa la operación y accede rápido a los flujos más usados.',
  },
  '/providers': {
    title: 'Proveedores',
    subtitle: 'Configura integraciones y revisa el estado de entrega por canal.',
  },
  '/applications': {
    title: 'Aplicaciones',
    subtitle: 'Gestiona apps emisoras y organiza los contextos de notificación.',
  },
  '/templates': {
    title: 'Plantillas',
    subtitle: 'Mantén mensajes reutilizables con mejor control por idioma y canal.',
  },
  '/notifications': {
    title: 'Notificaciones',
    subtitle: 'Consulta, filtra y lanza envíos desde un solo punto de trabajo.',
  },
  '/preferences': {
    title: 'Preferencias',
    subtitle: 'Ajusta el comportamiento general para cada tenant.',
  },
  '/devices': {
    title: 'Dispositivos',
    subtitle: 'Administra registros para push y revisa su disponibilidad.',
  },
  '/health': {
    title: 'Salud',
    subtitle: 'Valida conectividad con el backend y dependencias críticas.',
  },
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const clear = useAuthStore((s) => s.clear)
  const accessToken = useAuthStore((s) => s.accessToken)
  const storedEmail = useAuthStore((s) => s.email)
  const storedTenantId = useAuthStore((s) => s.tenantId)
  const storedTenantName = useAuthStore((s) => s.tenantName)
  const [menuOpen, setMenuOpen] = useState(false)
  // El login es por tenant: se muestra el tenant de la sesión (JWT/login),
  // no hay módulo de tenants. El correo va en el avatar del header.
  const { email, tenantName, tenantId } = useMemo(
    () => sessionMeta(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accessToken, storedEmail, storedTenantId, storedTenantName],
  )
  const tenantLabel = tenantName ?? tenantId ?? 'Tenant'
  const mailLabel = email ?? 'admin'
  const initial = mailLabel.trim().charAt(0).toUpperCase() || 'A'
  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/notifications/new')) {
      return {
        title: 'Nueva notificación',
        subtitle: 'Prepara el envío con contexto, canal y validación de plantilla.',
      }
    }
    if (location.pathname.startsWith('/notifications/')) {
      return {
        title: 'Detalle de notificación',
        subtitle: 'Consulta trazabilidad, estado y contenido entregado.',
      }
    }
    return PAGE_META[location.pathname] ?? PAGE_META['/']
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.title = `${pageMeta.title} | NotifyService`
  }, [pageMeta.title])

  const sidebar = (
    <>
      <div className={styles.brandRow}>
        <span className={styles.brandMark} aria-hidden="true">
          <Mails size={20} strokeWidth={1.75} />
        </span>
        <div className={styles.brandCopy}>
          <p className={styles.brand}>NotifyService</p>
          <p className={styles.brandSub}>Centro de notificaciones multi canal</p>
        </div>
      </div>
      <nav className={styles.nav}>
        {LINKS.map((l) => {
          const Icon = l.icon
          return (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              <span>{l.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className={styles.sideFoot}>
        <div className={styles.userCard}>
          <span className={styles.miniAvatar} aria-hidden="true">
            {initial}
          </span>
          <div className={styles.userMeta}>
            <p className={styles.userName}>{tenantLabel}</p>
            <p className={styles.userRole}>{mailLabel}</p>
          </div>
        </div>
        <button
          className={styles.logout}
          type="button"
          onClick={() => {
            clear()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  )

  return (
    <div className={styles.shell}>
      <aside className={styles.side} aria-label="Navegación principal">
        {sidebar}
      </aside>
      {menuOpen ? (
        <div
          className={styles.mobileOverlay}
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className={styles.mobileSide}
            aria-label="Navegación móvil"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.mobileHead}>
              <p className={styles.mobileLabel}>Menú</p>
              <button
                className={styles.mobileClose}
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.topbarLead}>
            <button
              className={styles.menuBtn}
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
            <div className={styles.pageInfo}>
              <p className={styles.pageTitle}>{pageMeta.title}</p>
              <p className={styles.pageSub}>{pageMeta.subtitle}</p>
            </div>
          </div>
          <label className={styles.search}>
            <Search size={17} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar notificaciones, plantillas…"
              aria-label="Buscar"
            />
            <kbd className={styles.kbd}>⌘K</kbd>
          </label>
          <div className={styles.topActions}>
            <span className={styles.tenantPill}>{tenantLabel}</span>
            <button className={styles.iconBtn} type="button" aria-label="Notificaciones">
              <Bell size={18} strokeWidth={1.75} />
              <span className={styles.dot} aria-hidden="true" />
            </button>
            <button className={styles.iconBtn} type="button" aria-label="Ajustes">
              <Settings size={18} strokeWidth={1.75} />
            </button>
            <span className={styles.avatar} title={mailLabel} aria-label={mailLabel} aria-hidden="false">
              {initial}
            </span>
            <span className={styles.userMail} title={mailLabel}>
              {mailLabel}
            </span>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
