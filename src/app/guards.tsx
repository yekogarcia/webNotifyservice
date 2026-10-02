import { Navigate, Outlet } from 'react-router-dom'
import { useIsAuthenticated, useTokenType } from '@/shared/store/auth.store'

export function RequireAuth() {
  const ok = useIsAuthenticated()
  if (!ok) return <Navigate to="/login" replace />
  return <Outlet />
}

/* El backend exige AdminGuard (JWT type admin = grant password) en la mayoría
 * de rutas de gestión. Este guard lo refleja en el cliente. */
export function RequireAdmin() {
  const ok = useIsAuthenticated()
  const type = useTokenType()
  if (!ok) return <Navigate to="/login" replace />
  if (type !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
