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
  standard_item_count: number
  target_date?: string
  customer_id: number
  assignee_id?: number
}

// 규격 항목 C/O(Carry Over) — 실제 진행 대신 다른 차종의 실제 시험 일정을 참조해서 대체
export interface ProjectStandardItem extends StandardItem {
  is_carry_over: boolean
  co_source_schedule_id?: number | null
  // co_source_schedule_id가 가리키는 일정의 표시용 스냅샷
  co_vehicle_model?: string | null
  co_project_name?: string | null
  co_round_no?: number | null
  co_planned_start?: string | null
  co_planned_end?: string | null
  co_actual_start?: string | null
  co_actual_end?: string | null
  co_result?: string | null
}

export interface ProjectStandardItemSelection {
  standard_item_id: number
  is_carry_over: boolean
  co_source_schedule_id?: number | null
}

// C/O 대상 후보 — 같은 아이템을 쓰는 타 프로젝트의 실제 시험 일정
export interface CoCandidate {
  schedule_id: number
  project_id: number
  project_name: string
  vehicle_model: string
  standard_item_id: number
  round_no: number
  test_type?: string | null
  planned_start?: string | null
  planned_end?: string | null
  actual_start?: string | null
  actual_end?: string | null
  result?: string | null
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
    client.get<ProjectStandardItem[]>(`/projects/${id}/standard-items`).then((r) => r.data),

  setStandardItems: (id: number, selections: ProjectStandardItemSelection[]) =>
    client.put<ProjectStandardItem[]>(`/projects/${id}/standard-items`, { items: selections }).then((r) => r.data),

  vehicleModels: () =>
    client.get<string[]>('/projects/vehicle-models').then((r) => r.data),

  coCandidates: (itemId: number, excludeProjectId?: number) =>
    client.get<CoCandidate[]>('/projects/co-candidates', {
      params: excludeProjectId ? { item_id: itemId, exclude_project_id: excludeProjectId } : { item_id: itemId },
    }).then((r) => r.data),

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
  // C/O(Carry Over) — 이 프로젝트에 자체 일정이 없어도 다른 프로젝트의 실제 일정을 근거로 대체한 경우
  is_carry_over: boolean
  co_vehicle_model?: string | null
  co_project_name?: string | null
  co_round_no?: number | null
  co_planned_start?: string | null
  co_planned_end?: string | null
  co_actual_start?: string | null
  co_actual_end?: string | null
  co_result?: string | null
}

export interface ScheduleDetailGroup {
  standard_no: string | null
  standard_name: string | null
  revision_no: string | null
  notes?: string | null   // 이 프로젝트에서 이 규격에 적용되는 조건/비고
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
