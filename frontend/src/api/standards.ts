import client from './client'
import { downloadBlob } from '@/utils/downloadFile'

export interface StandardItem {
  id: number
  standard_no?: string
  standard_name?: string
  revision_no?: string
  standard_code: string
  name: string
  category_id?: number
  category_name?: string
  category_color?: string
  test_condition_summary?: string
  source_type: string
  status: string
  priority: string
  priority_score: number
  dv_target_date?: string
  dv_actual_date?: string
  pv_target_date?: string
  pv_actual_date?: string
  assignee_id?: number
  notes?: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface StandardCategory {
  id: number
  code: string
  name_ko: string
  color_hex: string
}

export const standardApi = {
  categories: () => client.get<StandardCategory[]>('/standards/categories').then((r) => r.data),

  list: (params: { page?: number; size?: number; category_id?: number; status?: string; source_type?: string; search?: string }) =>
    client.get<{ total: number; items: StandardItem[] }>('/standards/', { params }).then((r) => r.data),

  get: (id: number) => client.get<StandardItem>(`/standards/${id}`).then((r) => r.data),

  create: (data: Partial<StandardItem>) => client.post<StandardItem>('/standards/', data).then((r) => r.data),

  update: (id: number, data: Partial<StandardItem>) => client.put<StandardItem>(`/standards/${id}`, data).then((r) => r.data),

  patchStatus: (id: number, status: string) =>
    client.patch<StandardItem>(`/standards/${id}/status`, { status }).then((r) => r.data),

  delete: (id: number) => client.delete(`/standards/${id}`),

  bulkStatus: (ids: number[], status: string) =>
    client.post<StandardItem[]>('/standards/bulk-status', { ids, status }).then((r) => r.data),

  history: (id: number) => client.get(`/standards/${id}/history`).then((r) => r.data),

  importExcel: async (file: File): Promise<{ created: number; skipped: number; errors: string[] }> => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/standards/import-excel', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data)
  },

  downloadTemplate: async () => {
    const response = await client.get('/standards/template', { responseType: 'blob' })
    downloadBlob(response.data, '규격매트릭스_양식.xlsx')
  },
}
