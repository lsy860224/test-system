import client from './client'
import { downloadBlob } from '@/utils/downloadFile'

export interface NCRItem {
  id: number
  ncr_number: string
  part_name: string
  issue_summary: string
  severity: string
  status: string
  detected_date?: string
  due_date?: string
  is_overdue: boolean
  assignee_id?: number
}

export interface NCRAttachment {
  id: number
  file_name: string
  file_size?: number
  file_type?: string
  uploaded_at: string
}

export interface NCRComment {
  id: number
  content: string
  created_at: string
  created_by?: number
}

export interface NCRDetail {
  id: number
  ncr_number: string
  standard_item_id?: number
  test_schedule_id?: number
  part_name: string
  test_section?: string
  issue_summary: string
  issue_detail?: string
  severity: string
  status: string
  assignee_id?: number
  detected_date?: string
  due_date?: string
  closed_date?: string
  d1_team?: string
  d2_problem?: string
  d3_containment?: string
  d4_root_cause?: string
  d5_permanent_action?: string
  d6_verify_action?: string
  d7_prevent_recurrence?: string
  d8_congratulate?: string
  is_overdue: boolean
  attachments: NCRAttachment[]
  comments: NCRComment[]
}

export const NCR_SEVERITIES = ['Critical', 'High', 'Medium', 'Low']
export const NCR_STATUSES = ['초기분석', '8D진행', '검토중', '완료', '취소']

export const ncrApi = {
  list: (params: { page?: number; size?: number; status?: string; severity?: string; search?: string; overdue?: boolean }) =>
    client.get<{ total: number; items: NCRItem[] }>('/ncr/', { params }).then((r) => r.data),

  get: (id: number) => client.get<NCRDetail>(`/ncr/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post<NCRDetail>('/ncr/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) => client.put<NCRDetail>(`/ncr/${id}`, data).then((r) => r.data),

  patchStatus: (id: number, status: string) =>
    client.patch<NCRDetail>(`/ncr/${id}/status`, { status }).then((r) => r.data),

  delete: (id: number) => client.delete(`/ncr/${id}`),

  addComment: (id: number, content: string) =>
    client.post<NCRComment>(`/ncr/${id}/comments`, { content }).then((r) => r.data),

  uploadAttachment: (ncrId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<NCRAttachment>(`/ncr/${ncrId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  downloadAttachment: async (ncrId: number, attachmentId: number, fileName: string) => {
    const response = await client.get(`/ncr/${ncrId}/attachments/${attachmentId}/download`, { responseType: 'blob' })
    downloadBlob(response.data, fileName)
  },

  deleteAttachment: (ncrId: number, attachmentId: number) =>
    client.delete(`/ncr/${ncrId}/attachments/${attachmentId}`),
}
