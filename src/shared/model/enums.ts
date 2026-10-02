/* Enums espejo del backend: src/modules/notifications/domain/enums */
export const NotificationStatus = {
  CREATED: 'CREATED',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus]

export const DeliveryStatus = {
  ...NotificationStatus,
  RETRYING: 'RETRYING',
} as const
export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus]

export const ChannelType = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
  WHATSAPP: 'WHATSAPP',
  WEBHOOK: 'WEBHOOK',
  SLACK: 'SLACK',
  TEAMS: 'TEAMS',
} as const
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType]

export const RecipientType = {
  INTERNAL_USER: 'INTERNAL_USER',
  EXTERNAL_USER: 'EXTERNAL_USER',
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const
export type RecipientType = (typeof RecipientType)[keyof typeof RecipientType]

export const AttemptResult = {
  SUCCESS: 'SUCCESS',
  TRANSIENT_ERROR: 'TRANSIENT_ERROR',
  PERMANENT_ERROR: 'PERMANENT_ERROR',
} as const
export type AttemptResult = (typeof AttemptResult)[keyof typeof AttemptResult]

export const ProviderType = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
} as const
export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType]

export const Platform = {
  IOS: 'IOS',
  ANDROID: 'ANDROID',
  WEB: 'WEB',
} as const
export type Platform = (typeof Platform)[keyof typeof Platform]

export const CHANNELS: ChannelType[] = [
  'EMAIL',
  'SMS',
  'PUSH',
  'WHATSAPP',
  'WEBHOOK',
  'SLACK',
  'TEAMS',
]

export const ProviderStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DELETED: 'DELETED',
} as const
export type ProviderStatus =
  (typeof ProviderStatus)[keyof typeof ProviderStatus]
