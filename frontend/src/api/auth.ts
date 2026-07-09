import client from './client'

export interface LoginResponse {
  access_token: string
  token_type: string
  user_id: number
  name: string
  role: string
}

export interface MeResponse {
  id: number
  username: string
  name: string
  role: string
  is_active: boolean
}

export const authApi = {
  login: (username: string, password: string) =>
    client.post<LoginResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => client.get<MeResponse>('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    client.put('/auth/me/password', { current_password: currentPassword, new_password: newPassword }),
}
