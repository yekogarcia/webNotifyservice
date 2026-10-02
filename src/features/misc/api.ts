import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ChannelType, Platform } from '@/shared/model/enums'

export const preferencesApi = {
  get(userId: string) {
    return api.get(ENDPOINTS.preferencesByUser(userId))
  },
  set(userId: string, preferences: Array<{ channel: ChannelType; enabled: boolean }>) {
    return api.put(ENDPOINTS.preferencesByUser(userId), { preferences })
  },
}

export const devicesApi = {
  register(input: { userId: string; deviceToken: string; platform: Platform }) {
    return api.post(ENDPOINTS.devices, input)
  },
  unregister(token: string) {
    return api.del(ENDPOINTS.deviceByToken(token))
  },
}

export const healthApi = {
  status() {
    return api.get<unknown>(ENDPOINTS.health)
  },
  providers() {
    return api.get<unknown>(ENDPOINTS.healthProviders)
  },
}
