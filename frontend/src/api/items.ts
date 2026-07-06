import client from './client'

export interface Item {
  id: number
  item_code?: string
  name: string
  category?: string
  spec?: string
  notes?: string
  is_active: boolean
  created_at: string
}

export const ITEM_CATEGORIES = ['제어유닛', '센서', '커넥터/하네스', '조명', '모터/액추에이터', '기타']

export const itemsApi = {
  list: (params: { page?: number; size?: number; search?: string }) =>
    client.get<{ total: number; items: Item[] }>('/items/', { params }).then((r) => r.data),

  get: (id: number) => client.get<Item>(`/items/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post<Item>('/items/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) => client.put<Item>(`/items/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/items/${id}`),
}
