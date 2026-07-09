import client from './client'

export interface AppNotification {
  id: number
  title: string
  message?: string
  link_path?: string
  related_type?: string
  related_id?: number
  is_read: boolean
  created_at: string
}

export const notificationsApi = {
  list: () => client.get<{ items: AppNotification[]; unread_count: number }>('/notifications/').then((r) => r.data),
  markRead: (id: number) => client.patch(`/notifications/${id}/read`),
  markAllRead: () => client.patch('/notifications/read-all'),
}
