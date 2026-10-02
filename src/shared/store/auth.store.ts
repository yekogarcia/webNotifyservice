import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* Sesión OAuth password-grant. accessToken en memoria persistida (SPA admin),
 * refreshToken solo si el flujo lo entrega. clientId/Secret opcionales para rotar.
 * El login es por tenant: se guarda tenant + email en la sesión (sin módulo Tenants). */
interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  expiresIn: number | null
  clientId: string | null
  clientSecret: string | null
  username: string | null
  email: string | null
  tenantId: string | null
  tenantName: string | null
  setTokens: (t: {
    accessToken: string
    refreshToken?: string | null
    expiresIn?: number | null
  }) => void
  setSession: (s: {
    username: string | null
    email?: string | null
    tenantId?: string | null
    tenantName?: string | null
    clientId?: string | null
    clientSecret?: string | null
  }) => void
  clear: () => void
}

function decodePayload(token: string | null): Record<string, unknown> {
  if (!token) return {}
  try {
    return JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
  } catch {
    return {}
  }
}

function decodeType(token: string | null): 'admin' | 'api' | null {
  const payload = decodePayload(token)
  const t = payload.type
  return t === 'admin' || t === 'api' ? t : null
}

/* Tenant y email efectivos: lo guardado al hacer login + lo que traiga el JWT
 * (tenantId/tenant_id/tenant, tenantName/tenant_name/name, email/username/sub). */
export function sessionMeta(): { email: string | null; tenantId: string | null; tenantName: string | null } {
  const s = useAuthStore.getState()
  const p = decodePayload(s.accessToken)
  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)
  return {
    email: s.email ?? s.username ?? str(p.email) ?? str(p.username) ?? str(p.sub),
    tenantId: s.tenantId ?? str(p.tenantId) ?? str(p.tenant_id),
    tenantName:
      s.tenantName ??
      str(p.tenantName) ??
      str(p.tenant_name) ??
      (typeof p.tenant === 'string' ? (p.tenant as string) : null) ??
      str(p.name),
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      clientId: null,
      clientSecret: null,
      username: null,
      email: null,
      tenantId: null,
      tenantName: null,
      setTokens: (t) =>
        set({
          accessToken: t.accessToken,
          refreshToken: t.refreshToken ?? null,
          expiresIn: t.expiresIn ?? null,
        }),
      setSession: (s) =>
        set({
          username: s.username,
          email: s.email ?? s.username,
          tenantId: s.tenantId ?? null,
          tenantName: s.tenantName ?? null,
          clientId: s.clientId ?? null,
          clientSecret: s.clientSecret ?? null,
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresIn: null,
          clientId: null,
          clientSecret: null,
          username: null,
          email: null,
          tenantId: null,
          tenantName: null,
        }),
    }),
    { name: 'notify-auth', partialize: (s) => ({ ...s }) },
  ),
)

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.accessToken !== null)
}

export function useTokenType(): 'admin' | 'api' | null {
  return decodeType(useAuthStore((s) => s.accessToken))
}
