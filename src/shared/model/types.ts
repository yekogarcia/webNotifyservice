/* Modelos TS espejo de las 14 entidades TypeORM del backend. */
import type {
  AttemptResult,
  ChannelType,
  DeliveryStatus,
  NotificationStatus,
  Platform,
  ProviderType,
  RecipientType,
} from './enums'

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Application {
  id: string
  tenantId: string
  name: string
  clientId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: number
  language: string
  channel: ChannelType
  subject: string | null
  body: string
  isActive: boolean
  createdAt: string
  activatedAt: string | null
}

export interface Template {
  id: string
  tenantId: string
  applicationId: string
  code: string
  description: string | null
  fromEmail?: string | null
  status?: string
  createdAt: string
  updatedAt: string
  versions?: TemplateVersion[]
}

export interface Recipient {
  id: string
  notificationId: string
  recipientType: RecipientType
  userId: string | null
  email: string | null
  phone: string | null
  createdAt: string
}

export interface Attempt {
  id: string
  deliveryId: string
  attemptNumber: number
  result: AttemptResult
  providerMessageId: string | null
  errorType: string | null
  errorMessage: string | null
  attemptedAt: string
}

export interface Delivery {
  id: string
  notificationId: string
  recipientId: string
  channel: ChannelType
  providerId: string | null
  status: DeliveryStatus
  attemptCount: number
  maxAttempts: number
  providerMessageId: string | null
  createdAt: string
  updatedAt: string
  attempts?: Attempt[]
}

export interface Notification {
  id: string
  tenantId: string
  applicationId: string
  sourceSystem: string
  eventType: string
  templateCode: string
  language: string
  data: Record<string, unknown>
  idempotencyKey: string
  status: NotificationStatus
  correlationId: string
  eventId: string | null
  createdAt: string
  updatedAt: string
  recipients?: Recipient[]
  deliveries?: Delivery[]
}

export interface Provider {
  id: string
  tenantId: string
  name: string
  providerType: ProviderType
  config: Record<string, unknown>
  secretRef: string
  hasSecret?: boolean
  isActive: boolean
  status?: string
  createdAt: string
  updatedAt: string
}

export interface ProviderChannel {
  id: string
  tenantId: string
  providerId: string
  channel: ChannelType
  isActive: boolean
  createdAt: string
}

export interface Preference {
  id: string
  tenantId: string
  applicationId: string
  userId: string
  channel: ChannelType
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  tenantId: string
  applicationId: string
  userId: string
  deviceToken: string
  platform: Platform
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Page<T> {
  items: T[]
  page: number
  limit: number
  total?: number
}
