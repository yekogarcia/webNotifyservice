import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ChannelType, ProviderType } from '@/shared/model/enums'
import type { Provider } from '@/shared/model/types'

export interface CreateProviderInput {
  name: string
  providerType: ProviderType
  config: Record<string, unknown>
  secret?: string
  secretRef?: string
}

export interface UpdateProviderInput extends Partial<CreateProviderInput> {
  status?: 'ACTIVE' | 'INACTIVE'
  isActive?: boolean
}

export interface ProviderMapping {
  id: string
  tenantId: string
  channel: ChannelType
  isActive: boolean
  providerId: string
  providerName: string | null
  providerType: ProviderType | null
  providerStatus: string | null
  createdAt: string
}

export interface DeleteProviderResult {
  id: string
  deleted: boolean
  softDeleted: boolean
  usage?: number
  status?: string
}

export const providersApi = {
  list() {
    return api.get<Provider[] | { items: Provider[] }>(ENDPOINTS.providers)
  },
  byId(id: string) {
    return api.get<Provider>(ENDPOINTS.providerById(id))
  },
  create(input: CreateProviderInput) {
    return api.post(ENDPOINTS.providers, input)
  },
  update(id: string, input: UpdateProviderInput) {
    return api.put(ENDPOINTS.providerById(id), input)
  },
  remove(id: string) {
    return api.del<DeleteProviderResult>(ENDPOINTS.providerById(id))
  },
  listMappings() {
    return api.get<ProviderMapping[]>(ENDPOINTS.providerMappings)
  },
  mapChannel(providerId: string, channel: ChannelType) {
    // 1 activo por canal por tenant (el back desactiva los demás).
    return api.post(ENDPOINTS.mapChannel(providerId), { channel })
  },
}
