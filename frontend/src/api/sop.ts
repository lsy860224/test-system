import client from './client'
import type { StandardItem } from './standards'
import { downloadBlob } from '@/utils/downloadFile'

export interface SOPItem {
  id: number
  sop_number: string
  title: string
  version: string
  category?: string
  status: string
  owner?: string
  approved_by?: string
  issue_date?: string
  revision_date?: string
  description?: string
  content?: string
  notes?: string
  created_at: string
  updated_at?: string
  revisions: SOPRevision[]
  attachments: SOPAttachment[]
}

export interface SOPRevision {
  id: number
  sop_id: number
  version: string
  change_summary?: string
  changed_by?: string
  changed_at: string
}

export interface SOPAttachment {
  id: number
  file_name: string
  file_size?: number
  uploaded_at: string
}

export const sopApi = {
  list: (params: { page?: number; size?: number; search?: string; category?: string; status?: string }) =>
    client.get<{ total: number; items: SOPItem[] }>('/sop/', { params }).then((r) => r.data),

  get: (id: number) => client.get<SOPItem>(`/sop/${id}`).then((r) => r.data),

  create: (data: Partial<SOPItem>) => client.post<SOPItem>('/sop/', data).then((r) => r.data),

  update: (id: number, data: Partial<SOPItem>) =>
    client.put<SOPItem>(`/sop/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/sop/${id}`),

  addRevision: (sopId: number, data: Partial<SOPRevision>) =>
    client.post<SOPRevision>(`/sop/${sopId}/revisions`, data).then((r) => r.data),

  deleteRevision: (sopId: number, revId: number) =>
    client.delete(`/sop/${sopId}/revisions/${revId}`),

  uploadAttachment: (sopId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post<SOPAttachment>(`/sop/${sopId}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  downloadAttachment: async (sopId: number, attachmentId: number, fileName: string) => {
    const response = await client.get(`/sop/${sopId}/attachments/${attachmentId}/download`, { responseType: 'blob' })
    downloadBlob(response.data, fileName)
  },

  deleteAttachment: (sopId: number, attachmentId: number) =>
    client.delete(`/sop/${sopId}/attachments/${attachmentId}`),

  getStandardItems: (sopId: number) =>
    client.get<StandardItem[]>(`/sop/${sopId}/standard-items`).then((r) => r.data),

  setStandardItems: (sopId: number, standardItemIds: number[]) =>
    client.put<StandardItem[]>(`/sop/${sopId}/standard-items`, { standard_item_ids: standardItemIds }).then((r) => r.data),
}

export const SOP_CATEGORIES = ['환경시험', '전기시험', 'EMC 시험', '기계시험', '신뢰성시험', '측정', '공통', '기타']
export const SOP_STATUSES   = ['초안', '검토중', '승인', '폐기']

export const SOP_STATUS_COLORS: Record<string, string> = {
  '초안':  '#718096',
  '검토중': '#D69E2E',
  '승인':  '#38A169',
  '폐기':  '#A0AEC0',
}

export function nextSopNumber(existing: SOPItem[], category: string): string {
  const prefixMap: Record<string, string> = {
    '환경시험': 'ENV', '전기시험': 'ELE', 'EMC 시험': 'EMC',
    '기계시험': 'MEC', '신뢰성시험': 'REL', '측정': 'MSR', '공통': 'GEN', '기타': 'ETC',
  }
  const prefix = prefixMap[category] ?? 'GEN'
  const pattern = new RegExp(`SOP-${prefix}-(\\d+)`)
  const maxNum = existing.reduce((max, s) => {
    const m = s.sop_number.match(pattern)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `SOP-${prefix}-${String(maxNum + 1).padStart(3, '0')}`
}
