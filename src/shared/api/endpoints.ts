/* Rutas del backend (prefijo /api/v1). Fuente: controllers NestJS. */
export const ENDPOINTS = {
  oauthToken: '/oauth/token',
  oauthRefresh: '/oauth/refresh',
  tenants: '/tenants',
  tenantById: (id: string) => `/tenants/${id}`,
  applications: '/applications',
  applicationById: (id: string) => `/applications/${id}`,
  rotateSecret: (id: string) => `/applications/${id}/rotate-secret`,
  templates: '/templates',
  templateByCode: (code: string) => `/templates/${encodeURIComponent(code)}`,
  activateVersion: (code: string, version: number, language: string, channel: string) =>
    `/templates/${encodeURIComponent(code)}/versions/${version}/activate?language=${encodeURIComponent(language)}&channel=${encodeURIComponent(channel)}`,
  updateVersion: (code: string, version: number, language: string, channel: string) =>
    `/templates/${encodeURIComponent(code)}/versions/${version}?language=${encodeURIComponent(language)}&channel=${encodeURIComponent(channel)}`,
  providers: '/providers',
  providerMappings: '/providers/mappings',
  providerById: (id: string) => `/providers/${id}`,
  mapChannel: (id: string) => `/providers/${id}/channels`,
  notifications: '/notifications',
  notificationById: (id: string) => `/notifications/${id}`,
  retryDelivery: (id: string) => `/deliveries/${id}/retry`,
  preferencesByUser: (userId: string) => `/preferences/${encodeURIComponent(userId)}`,
  devices: '/devices',
  deviceByToken: (token: string) => `/devices/${encodeURIComponent(token)}`,
  health: '/health',
  healthProviders: '/health/providers',
  dashboardSummary: '/dashboard/summary',
  dashboardVolume: '/dashboard/volume',
  dashboardByChannel: '/dashboard/by-channel',
  dashboardByApplication: '/dashboard/by-application',
  dashboardByProvider: '/dashboard/by-provider',
  dashboardFailures: '/dashboard/failures',
  dashboardLatency: '/dashboard/latency',
  dashboardActivity: '/dashboard/activity',
} as const

export const API_BASE =
  import.meta.env.VITE_API_URL?.toString().replace(/\/$/, '') || '/api/v1'
