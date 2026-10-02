import { api } from '@/shared/api/client'
import { ENDPOINTS } from '@/shared/api/endpoints'

export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
}

export interface PasswordLoginInput {
  username: string
  password: string
}

export interface RegisterTenantInput {
  name: string
  slug: string
  email: string
  password: string
}

export const authApi = {
  loginPassword(input: PasswordLoginInput): Promise<TokenResponse> {
    // grant_type=password: el back ignora client_id/secret en este flujo.
    return api.post<TokenResponse>(ENDPOINTS.oauthToken, {
      grant_type: 'password',
      username: input.username,
      password: input.password,
    })
  },
  registerTenant(input: RegisterTenantInput) {
    return api.post(ENDPOINTS.tenants, input)
  },
}
