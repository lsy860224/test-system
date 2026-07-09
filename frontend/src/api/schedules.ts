import client from './client'

export interface GanttSchedule {
  id: number
  standard_name: string
  test_type: string
  planned_start: string
  planned_end: string
  actual_start: string | null
  actual_end: string | null
  status: string
  result: string | null
}

export interface GanttProjectGroup {
  project_id: number
  project_code: string
  project_name: string
  phase: string
  schedules: GanttSchedule[]
}

export interface GanttData {
  projects: GanttProjectGroup[]
}

export interface ProjectScheduleSummary {
  project_id: number
  project_name: string
  project_code?: string
  customer_name?: string
  item_name?: string
  phase: string
  total_items: number
  status_counts: Record<string, number>
}

export const scheduleApi = {
  list: (params: { page?: number; size?: number; project_id?: number; status?: string; test_type?: string; search?: string }) =>
    client.get<{ total: number; items: Record<string, unknown>[] }>('/schedules/', { params }).then((r) => r.data),

  byProjectSummary: (params: { page?: number; size?: number; search?: string }) =>
    client.get<{ total: number; items: ProjectScheduleSummary[] }>('/schedules/by-project-summary', { params }).then((r) => r.data),

  get: (id: number) => client.get(`/schedules/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post('/schedules/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) => client.put(`/schedules/${id}`, data).then((r) => r.data),

  start: (id: number) => client.patch(`/schedules/${id}/start`).then((r) => r.data),

  recordResult: (id: number, result: string, actual_end: string | undefined, data_path: string) =>
    client.patch(`/schedules/${id}/result`, { result, actual_end, data_path }).then((r) => r.data),

  retest: (id: number) => client.post(`/schedules/${id}/retest`).then((r) => r.data),

  delete: (id: number) => client.delete(`/schedules/${id}`),

  gantt: (params: { project_id?: number; status?: string } = {}) =>
    client.get<GanttData>('/schedules/gantt', { params }).then((r) => r.data),
}
