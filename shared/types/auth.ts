export type AuthMethod = 'site-token' | 'cloudflare-access'

export interface VerifyResponse {
  name: string
  url: string
  authMethod: AuthMethod
  userID: string
  userEmail: string
  accessEnabled: boolean
}
