import client from './client'
import { downloadBlob } from '@/utils/downloadFile'

export interface SingleTestItem {
  id: number
  request_number: string
  requesting_dept: string
  test_name: string
  status: string
  execution_type?: string
  assignee_id?: number
  desired_due_date?: string
  created_at: string
}

export interface SingleTestAttachment {
  id: number
  attachment_type: string
  file_name: string
  file_size?: number
  file_type?: string
  uploaded_at: string
}

export interface SingleTestComment {
  id: number
  content: string
  created_at: string
  created_by?: number
}

export interface SingleTestDelivery {
  id: number
  delivered_at: string
  delivered_to: string
  method: string
  notes?: string
  created_at: string
  created_by?: number
}

export interface SingleTestDetail {
  id: number
  request_number: string
  requesting_dept: string
  requester_name: string
  requester_contact?: string
  requester_user_id?: number
  test_name: string
  standard_item_id?: number
  sample_info?: string
  purpose?: string
  desired_due_date?: string
  notes?: string
  status: string
  execution_type?: string
  equipment_id?: number
  assignee_id?: number
  approved_by?: number
  approved_at?: string
  rejection_reason?: string
  planned_start?: string
  planned_end?: string
  actual_start?: string
  actual_end?: string
  result?: string
  created_at: string
  updated_at: string
  attachments: SingleTestAttachment[]
  comments: SingleTestComment[]
  deliveries: SingleTestDelivery[]
}

export const SINGLE_TEST_STATUSES = ['접수', '검토중', '승인', '진행중', '시험완료', '보고서작성', '검토', '전달완료', '반려', '취소']
export const SINGLE_TEST_RESULTS = ['합격', '불합격', '보류']
export const SINGLE_TEST_DELIVERY_METHODS = ['이메일', '사내메신저', '출력물', '직접전달']

export const singleTestApi = {
  list: (params: { page?: number; size?: number; status?: string; search?: string }) =>
    client.get<{ total: number; items: SingleTestItem[] }>('/single-tests/', { params }).then((r) => r.data),

  get: (id: number) => client.get<SingleTestDetail>(`/single-tests/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post<SingleTestDetail>('/single-tests/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) => client.put<SingleTestDetail>(`/single-tests/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/single-tests/${id}`),

  // 상태 전이
  submit: (id: number) => client.post<SingleTestDetail>(`/single-tests/${id}/submit`).then((r) => r.data),

  approve: (id: number, data: { execution_type: string; equipment_id?: number | null; assignee_id?: number | null; planned_start?: string | null; planned_end?: string | null }) =>
    client.post<SingleTestDetail>(`/single-tests/${id}/approve`, data).then((r) => r.data),

  reject: (id: number, rejection_reason: string) =>
    client.post<SingleTestDetail>(`/single-tests/${id}/reject`, { rejection_reason }).then((r) => r.data),

  start: (id: number, actual_start?: string) =>
    client.post<SingleTestDetail>(`/single-tests/${id}/start`, { actual_start: actual_start || null }).then((r) => r.data),

  completeTest: (id: number, result: string, actual_end?: string) =>
    client.post<SingleTestDetail>(`/single-tests/${id}/complete-test`, { result, actual_end: actual_end || null }).then((r) => r.data),

  submitReport: (id: number) => client.post<SingleTestDetail>(`/single-tests/${id}/submit-report`).then((r) => r.data),

  reviewReport: (id: number) => client.post<SingleTestDetail>(`/single-tests/${id}/review-report`).then((r) => r.data),

  deliver: (id: number) => client.post<SingleTestDetail>(`/single-tests/${id}/deliver`).then((r) => r.data),

  cancel: (id: number, reason?: string) =>
    client.post<SingleTestDetail>(`/single-tests/${id}/cancel`, { reason: reason || null }).then((r) => r.data),

  // 댓글
  addComment: (id: number, content: string) =>
    client.post<SingleTestComment>(`/single-tests/${id}/comments`, { content }).then((r) => r.data),

  // 전달 이력
  addDelivery: (id: number, data: { delivered_at: string; delivered_to: string; method: string; notes?: string }) =>
    client.post<SingleTestDelivery>(`/single-tests/${id}/deliveries`, data).then((r) => r.data),

  // 첨부파일
  uploadAttachment: (id: number, file: File, attachmentType: string) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<SingleTestAttachment>(`/single-tests/${id}/attachments`, form, {
        params: { attachment_type: attachmentType },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  downloadAttachment: async (id: number, attachmentId: number, fileName: string) => {
    const response = await client.get(`/single-tests/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' })
    downloadBlob(response.data, fileName)
  },

  deleteAttachment: (id: number, attachmentId: number) =>
    client.delete(`/single-tests/${id}/attachments/${attachmentId}`),
}
