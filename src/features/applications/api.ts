import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'
import type { Application } from '@/shared/model/types'

export const applicationsApi = {
  list() {
    return api.get<Application[]>(ENDPOINTS.applications)
  },
  create(name: string) {
    return api.post<Application & { client_id?: string; client_secret?: string }>(
      ENDPOINTS.applications,
      { name },
    )
  },
  update(id: string, input: { name?: string; isActive?: boolean }) {
    return api.patch<Application>(ENDPOINTS.applicationById(id), input)
  },
  remove(id: string) {
    return api.del(ENDPOINTS.applicationById(id))
  },
  rotate(id: string) {
    return api.post<{ client_id: string; client_secret: string }>(
      ENDPOINTS.rotateSecret(id),
    )
  },
}
