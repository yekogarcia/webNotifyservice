import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { Notification } from '@/shared/model/types'
import type { ChannelType, RecipientType } from '@/shared/model/enums'

export interface RecipientInput {
  recipientType: RecipientType
  userId?: string
  email?: string
  phone?: string
}

export interface CreateNotificationInput {
  applicationId?: string
  sourceSystem: string
  eventType: string
  idempotencyKey?: string
  channels: ChannelType[]
  templateCode: string
  language?: string
  data?: Record<string, unknown>
  recipient?: RecipientInput
  recipients?: RecipientInput[]
}

export interface CreateNotificationResponse {
  notificationId: string
  status: string
  correlationId: string
  idempotent: boolean
}

export const notificationsApi = {
  create(input: CreateNotificationInput) {
    return api.post<CreateNotificationResponse>(ENDPOINTS.notifications, input)
  },
  byId(id: string) {
    return api.get<Notification>(ENDPOINTS.notificationById(id))
  },
  list(page = 1, limit = 20, filters?: { status?: string; sourceSystem?: string; applicationId?: string; date?: string }) {
    return api.get<unknown>(ENDPOINTS.notifications, {
      query: { page, limit, ...filters },
    })
  },
  retryDelivery(deliveryId: string) {
    return api.post<{ deliveryId: string; status: string }>(
      ENDPOINTS.retryDelivery(deliveryId),
    )
  },
}

/* GET /notifications puede devolver array, { items }, { data } o { notifications }.
 * Normaliza a array para la tabla. */
export function normalizeNotifications(payload: unknown): Notification[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload as Notification[]
  if (typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    for (const k of ['items', 'data', 'notifications', 'results']) {
      if (Array.isArray(o[k])) return o[k] as Notification[]
    }
  }
  return []
}
