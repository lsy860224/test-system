import client from './client'
import { downloadBlob } from '@/utils/downloadFile'

export interface Equipment {
  id: number
  name: string
  model?: string
  manufacturer?: string
  serial_number?: string
  asset_number?: string
  category?: string
  manager?: string
  status: string
  location?: string
  purchase_date?: string
  notes?: string
  created_at: string
  updated_at?: string
  latest_expiry?: string
  days_to_expiry?: number
  calibrations: CalibrationRecord[]
  investments?: InvestmentRecord[]
}

export interface CalibrationRecord {
  id: number
  equipment_id: number
  calibration_type: string
  calibration_date: string
  next_due_date?: string
  result: string
  calibration_body?: string
  certificate_number?: string
  notes?: string
  created_at: string
}

export interface InvestmentRecord {
  id: number
  equipment_id?: number
  year: number
  invest_type: string
  item_name?: string
  amount_est?: number
  notes?: string
  created_at: string
  equipment_name?: string
}

export interface CalibrationAlert {
  id: number
  name: string
  category?: string
  status: string
  latest_expiry?: string
  days_to_expiry: number
}

export const equipmentApi = {
  list: (params: { page?: number; size?: number; search?: string; status?: string; category?: string }) =>
    client.get<{ total: number; items: Equipment[] }>('/equipment/', { params }).then((r) => r.data),

  get: (id: number) => client.get<Equipment>(`/equipment/${id}`).then((r) => r.data),

  create: (data: Partial<Equipment>) => client.post<Equipment>('/equipment/', data).then((r) => r.data),

  update: (id: number, data: Partial<Equipment>) =>
    client.put<Equipment>(`/equipment/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/equipment/${id}`),

  // 교정 이력
  addCalibration: (eqId: number, data: Partial<CalibrationRecord>) =>
    client.post<CalibrationRecord>(`/equipment/${eqId}/calibrations`, data).then((r) => r.data),

  updateCalibration: (eqId: number, calId: number, data: Partial<CalibrationRecord>) =>
    client.put<CalibrationRecord>(`/equipment/${eqId}/calibrations/${calId}`, data).then((r) => r.data),

  deleteCalibration: (eqId: number, calId: number) =>
    client.delete(`/equipment/${eqId}/calibrations/${calId}`),

  // 규격 Capability 매핑
  getStandardItems: (eqId: number) =>
    client.get<number[]>(`/equipment/${eqId}/standard-items`).then((r) => r.data),

  setStandardItems: (eqId: number, standardItemIds: number[]) =>
    client.put(`/equipment/${eqId}/standard-items`, { standard_item_ids: standardItemIds }),

  // 투자 계획
  listInvestments: (params: { year?: number; equipment_id?: number }) =>
    client.get<InvestmentRecord[]>('/equipment/investments', { params }).then((r) => r.data),

  createInvestment: (data: Partial<InvestmentRecord>) =>
    client.post<InvestmentRecord>('/equipment/investments', data).then((r) => r.data),

  updateInvestment: (id: number, data: Partial<InvestmentRecord>) =>
    client.put<InvestmentRecord>(`/equipment/investments/${id}`, data).then((r) => r.data),

  deleteInvestment: (id: number) => client.delete(`/equipment/investments/${id}`),

  // 교정 만료 알림
  calibrationAlerts: (days = 60) =>
    client.get<CalibrationAlert[]>('/equipment/calibration-alerts', { params: { days } }).then((r) => r.data),

  // 교정이력 관리 양식 다운로드
  downloadCalibrationTemplate: async () => {
    const response = await client.get('/equipment/calibration-template', { responseType: 'blob' })
    downloadBlob(response.data, '교정이력관리_양식.xlsx')
  },
}

export const EQ_CATEGORIES = ['환경시험기', '전기시험기', 'EMC 시험기', '기계시험기', '신뢰성시험기', '측정기', '기타']
export const EQ_STATUSES   = ['운용중', '교정중', '수리중', '대기중', '폐기']
export const CAL_TYPES     = ['정기교정', '특별교정', '기능점검']
export const CAL_RESULTS   = ['합격', '불합격', '조건부합격']
export const INVEST_TYPES  = ['신규구입', '유지보수', '교정비', '수리', '폐기']

export const STATUS_COLORS: Record<string, string> = {
  '운용중': '#38A169',
  '교정중': '#D69E2E',
  '수리중': '#DD6B20',
  '대기중': '#718096',
  '폐기':   '#A0AEC0',
}

export function expiryColor(days: number | undefined | null): string {
  if (days == null) return 'var(--text-muted)'
  if (days < 0)   return '#E53E3E'
  if (days <= 30) return '#E53E3E'
  if (days <= 60) return '#D69E2E'
  return '#38A169'
}

export function expiryLabel(days: number | undefined | null): string {
  if (days == null) return '-'
  if (days < 0)   return `만료됨 (${Math.abs(days)}일 경과)`
  if (days === 0) return 'D-Day'
  return `D-${days}`
}
