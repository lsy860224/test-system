import client from './client'

export interface TodoCard {
  type: 'ncr_pending' | 'calibration' | 'deadline'
  severity: 'High' | 'Med' | 'Low'
  title: string
  description: string
  link_path: string
}

export interface TodoBoardData {
  items: TodoCard[]
  total: number
  by_type_total: { ncr_pending: number; calibration: number; deadline: number }
}

export const todosApi = {
  list: () => client.get<TodoBoardData>('/todos/').then((r) => r.data),
}
