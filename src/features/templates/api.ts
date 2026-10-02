import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { ChannelType } from '@/shared/model/enums'
import type { Template } from '@/shared/model/types'

export interface TemplateVersionInput {
  version: number
  language: string
  channel: ChannelType
  subject?: string | null
  body: string
  isActive?: boolean
}

export interface CreateTemplateInput {
  applicationId: string
  code: string
  description?: string
  fromEmail?: string
  versions: TemplateVersionInput[]
}

export const templatesApi = {
  list() {
    return api.get<Template[]>(ENDPOINTS.templates)
  },
  create(input: CreateTemplateInput) {
    return api.post<Template>(ENDPOINTS.templates, input)
  },
  byCode(code: string) {
    return api.get<Template>(ENDPOINTS.templateByCode(code))
  },
  updateVersion(
    code: string,
    version: number,
    language: string,
    channel: string,
    input: { subject?: string | null; body?: string; language?: string; channel?: ChannelType },
  ) {
    return api.patch<Template>(ENDPOINTS.updateVersion(code, version, language, channel), input)
  },
  activate(code: string, version: number, language: string, channel: string) {
    return api.patch(ENDPOINTS.activateVersion(code, version, language, channel))
  },
  update(code: string, input: { description?: string; status?: 'ACTIVE' | 'INACTIVE'; fromEmail?: string | null }, applicationId?: string) {
    return api.patch<Template>(ENDPOINTS.templateByCode(code), input, {
      query: applicationId ? { applicationId } : undefined,
    })
  },
  remove(code: string, applicationId?: string) {
    return api.del<{ id: string; code: string; deleted: boolean; usage: number }>(
      ENDPOINTS.templateByCode(code),
      { query: applicationId ? { applicationId } : undefined },
    )
  },
}
