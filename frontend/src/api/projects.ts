import client from './client'
import type { StandardItem } from './standards'

// 저장값은 계속 '활성'이지만(기존 필터·조회 로직 호환), 화면 표기는 '진행 중'으로 통일한다
export const projectStatusLabel = (status: string) => (status === '활성' ? '진행 중' : status)

export interface ProjectStandardNote {
  standard_no: string
  notes?: string | null   // 이 프로젝트에서 이 규격에 적용되는 조건/비고 (규격 단위, 항목 단위 아님)
}

export interface ProjectItem {
  id: number
  name: string
  project_code?: string
  item_id?: number
  item_name?: string
  phase: string
  status: string
  progress_pct: number
  target_date?: string
  customer_id: number
  assignee_id?: number
}

export const projectsApi = {
  list: (params: { page?: number; size?: number; customer_id?: number; status?: string; phase?: string; search?: string }) =>
    client.get<{ total: number; items: ProjectItem[] }>('/projects/', { params }).then((r) => r.data),

  get: (id: number) => client.get(`/projects/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post('/projects/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/projects/${id}`),

  getStandardItems: (id: number) =>
    client.get<StandardItem[]>(`/projects/${id}/standard-items`).then((r) => r.data),

  setStandardItems: (id: number, standardItemIds: number[]) =>
    client.put<StandardItem[]>(`/projects/${id}/standard-items`, { standard_item_ids: standardItemIds }).then((r) => r.data),

  getStandardNotes: (id: number) =>
    client.get<ProjectStandardNote[]>(`/projects/${id}/standard-notes`).then((r) => r.data),

  setStandardNotes: (id: number, notes: ProjectStandardNote[]) =>
    client.put<ProjectStandardNote[]>(`/projects/${id}/standard-notes`, { notes }).then((r) => r.data),

  scheduleDetail: (id: number) =>
    client.get<ScheduleDetailResponse>(`/projects/${id}/schedule-detail`).then((r) => r.data),
}

export interface ScheduleDetailItem {
  standard_item_id: number
  standard_code: string
  name: string
  round_no: number
  schedule_id: number | null
  test_type: string | null
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  display_status: string
  result: string | null
  data_path: string | null
  has_ncr: boolean
  can_retest: boolean
}

export interface ScheduleDetailGroup {
  standard_no: string | null
  standard_name: string | null
  revision_no: string | null
  items: ScheduleDetailItem[]
}

export interface ScheduleDetailResponse {
  project: {
    id: number
    name: string
    project_code?: string
    customer_name?: string
    item_name?: string
    phase: string
    status: string
    start_date?: string
    target_date?: string
  }
  summary: Record<string, number>
  standards: ScheduleDetailGroup[]
}
