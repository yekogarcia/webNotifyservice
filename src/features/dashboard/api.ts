import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ChannelType } from '@/shared/model/enums'

export interface DashboardRange {
  from?: string
  granularity?: 'day' | 'hour'
  limit?: number
}

export interface DashboardSummary {
  notifications: number
  deliveries: number
  sent: number
  failed: number
  pending: number
  retried: number
  avgAttempts: number
  successRate: number
  activeApps: number
  activeProviders: number
}

export interface VolumePoint {
  bucket: string
  notifications: number
  deliveries: number
  sent: number
  failed: number
}

export interface ChannelStats {
  channel: ChannelType
  deliveries: number
  sent: number
  failed: number
  pending: number
  successRate: number
}

export interface AppStats {
  applicationId: string
  appName: string
  notifications: number
  deliveries: number
  sent: number
  failed: number
  successRate: number
}

export interface ProviderStats {
  providerId: string | null
  providerName: string
  providerType: string | null
  providerStatus: string | null
  deliveries: number
  sent: number
  failed: number
  successRate: number
  avgAttempts: number
  lastErrorType: string | null
  lastActivityAt: string | null
}

export interface FailureStats {
  byErrorType: { errorType: string; count: number }[]
  resultSplit: { result: string; count: number }[]
  recent: {
    deliveryId: string
    notificationId: string
    channel: string
    status: string
    attemptCount: number
    providerId: string | null
    providerName: string | null
    lastError: string | null
    updatedAt: string
  }[]
}

export interface LatencyStats {
  channel: string
  deliveries: number
  avgSeconds: number
  p50Seconds: number
  p95Seconds: number
}

export interface ActivityItem {
  id: string
  eventType: string
  notificationId: string | null
  deliveryId: string | null
  applicationId: string
  appName: string | null
  createdAt: string
}

function rangeQuery(r: DashboardRange): Record<string, string | number | undefined> {
  return { from: r.from, granularity: r.granularity, limit: r.limit }
}

export const dashboardApi = {
  summary(r: DashboardRange) {
    return api.get<DashboardSummary>(ENDPOINTS.dashboardSummary, { query: rangeQuery(r) })
  },
  volume(r: DashboardRange) {
    return api.get<VolumePoint[]>(ENDPOINTS.dashboardVolume, { query: rangeQuery(r) })
  },
  byChannel(r: DashboardRange) {
    return api.get<ChannelStats[]>(ENDPOINTS.dashboardByChannel, { query: rangeQuery(r) })
  },
  byApplication(r: DashboardRange) {
    return api.get<AppStats[]>(ENDPOINTS.dashboardByApplication, { query: rangeQuery(r) })
  },
  byProvider(r: DashboardRange) {
    return api.get<ProviderStats[]>(ENDPOINTS.dashboardByProvider, { query: rangeQuery(r) })
  },
  failures(r: DashboardRange) {
    return api.get<FailureStats>(ENDPOINTS.dashboardFailures, { query: rangeQuery(r) })
  },
  latency(r: DashboardRange) {
    return api.get<LatencyStats[]>(ENDPOINTS.dashboardLatency, { query: rangeQuery(r) })
  },
  activity(r: DashboardRange) {
    return api.get<ActivityItem[]>(ENDPOINTS.dashboardActivity, { query: rangeQuery(r) })
  },
}

export function rangeFrom(days: number): string {
  return new Date(Date.now() - days * 864e5).toISOString()
}
