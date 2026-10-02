/* Cliente HTTP único (DIP: features dependen de esta abstracción, no de fetch).
 * - Añade Authorization: Bearer salvo rutas públicas.
 * - En 401 intenta 1 refresh con grant password-rotación y reintenta.
 * - Respeta ValidationPipe del back: solo envía campos del DTO. */
import { API_BASE } from './endpoints'
import { ApiError } from './errors'
import { useAuthStore } from '@/shared/store/auth.store'

const PUBLIC_PATHS = ['/oauth/token', '/oauth/refresh', '/tenants']

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith('/tenants'))
}

async function refreshAccessToken(): Promise<boolean> {
  const { refreshToken, clientId, clientSecret, setTokens, clear } =
    useAuthStore.getState()
  if (!refreshToken) return false
  try {
    // El back exige client_id/secret incluso para rotar tokens password.
    // Si la app no los tiene, el refresh no es posible → logout.
    if (!clientId || !clientSecret) {
      clear()
      return false
    }
    const res = await fetch(`${API_BASE}/oauth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })
    if (!res.ok) {
      clear()
      return false
    }
    const data = (await res.json()) as {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    })
    return true
  } catch {
    clear()
    return false
  }
}

export interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { query, ...init } = opts
  const url =
    API_BASE +
    path +
    (query
      ? `?${new URLSearchParams(
          Object.entries(query).flatMap(([k, v]) =>
            v === undefined ? [] : [[k, String(v)]],
          ),
        ).toString()}`
      : '')

  const doFetch = async (): Promise<Response> => {
    const { accessToken } = useAuthStore.getState()
    return fetch(url, {
      ...init,
      headers: {
        // Solo declarar JSON si hay cuerpo: Fastify rechaza (400) un
        // Content-Type json con body vacío (ej. PATCH .../activate sin body).
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(isPublic(path) || !accessToken
          ? {}
          : { Authorization: `Bearer ${accessToken}` }),
        ...(init.headers ?? {}),
      },
    })
  }

  let res = await doFetch()
  if (res.status === 401 && !isPublic(path)) {
    const ok = await refreshAccessToken()
    if (ok) res = await doFetch()
    else throw new ApiError(401, 'Sesión expirada. Inicia sesión de nuevo.')
  }
  if (res.status === 204) return undefined as T
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const msg =
      (body as { message?: string | string[] } | null)?.message ??
      `HTTP ${res.status}`
    throw new ApiError(
      res.status,
      Array.isArray(msg) ? msg.join(', ') : String(msg),
      body,
    )
  }
  return body as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, {
      ...opts,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  del: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
}
