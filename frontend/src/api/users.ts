import client from './client'

export interface AppUser {
  id: number
  username: string
  name: string
  role: string
  is_active: boolean
  last_login?: string
  created_at: string
}

export const USER_ROLES = ['admin', '임원', '팀장', '팀원', '의뢰자']

export const usersApi = {
  list: () => client.get<AppUser[]>('/users/').then((r) => r.data),

  create: (data: { username: string; password: string; name: string; role: string }) =>
    client.post<AppUser>('/users/', data).then((r) => r.data),

  update: (id: number, data: { name: string; role: string; password?: string }) =>
    client.put<AppUser>(`/users/${id}`, data).then((r) => r.data),

  deactivate: (id: number) => client.patch<AppUser>(`/users/${id}/deactivate`).then((r) => r.data),

  activate: (id: number) => client.patch<AppUser>(`/users/${id}/activate`).then((r) => r.data),
}
