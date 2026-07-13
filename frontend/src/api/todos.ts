import client from './client'

export type TodoAction =
  | { kind: 'ncr_new'; test_schedule_id: number; standard_item_id: number; issue_summary: string }
  | { kind: 'ncr_edit'; ncr_id: number }
  | { kind: 'equipment_edit'; equipment_id: number }
  | { kind: 'schedule_result'; schedule_id: number }

export interface TodoCard {
  type: 'ncr_pending' | 'calibration' | 'deadline'
  severity: 'High' | 'Med' | 'Low'
  title: string
  description: string
  link_path: string
  action: TodoAction
}

export interface TodoBoardData {
  items: TodoCard[]
  total: number
  by_type_total: { ncr_pending: number; calibration: number; deadline: number }
}

export const todosApi = {
  list: () => client.get<TodoBoardData>('/todos/').then((r) => r.data),
}
