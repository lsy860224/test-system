import client from './client'

export interface VendorLab {
  id: number
  name: string
  short_name?: string | null
  lab_type?: string | null
  kolas_certified: boolean
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  address?: string | null
  website?: string | null
  notes?: string | null
  is_active: boolean
  created_at: string
  scope_count: number
  order_count: number
  test_scopes: TestScope[]
  orders: VendorOrder[]
}

export interface TestScope {
  id: number
  vendor_id: number
  standard_item_id?: number
  test_name: string
  standard_no?: string | null
  unit_price?: number | null
  lead_days?: number | null
  kolas_report?: string | null
  notes?: string | null
  created_at: string
}

export interface VendorOrder {
  id: number
  vendor_id: number
  project_id?: number
  project_name?: string
  single_test_request_id?: number
  single_test_request_number?: string
  schedule_id?: number | null
  schedule_status?: string
  schedule_test_type?: string
  schedule_planned_start?: string
  schedule_planned_end?: string
  test_items?: string | null
  order_date?: string | null
  due_date?: string | null
  status: string
  total_amount?: number | null
  notes?: string | null
  created_at: string
}

export interface PriceCompareItem {
  vendor_id: number
  vendor_name: string
  vendor_short?: string
  kolas_certified: boolean
  unit_price?: number
  lead_days?: number
  kolas_report?: string
  notes?: string
}

export const vendorApi = {
  list: (params: { page?: number; size?: number; search?: string; lab_type?: string; kolas_only?: boolean }) =>
    client.get<{ total: number; items: VendorLab[] }>('/vendors/', { params }).then((r) => r.data),

  get: (id: number) => client.get<VendorLab>(`/vendors/${id}`).then((r) => r.data),

  create: (data: Partial<VendorLab>) => client.post<VendorLab>('/vendors/', data).then((r) => r.data),

  update: (id: number, data: Partial<VendorLab>) =>
    client.put<VendorLab>(`/vendors/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/vendors/${id}`),

  // 시험 범위 (단가표)
  addScope: (vendorId: number, data: Partial<TestScope>) =>
    client.post<TestScope>(`/vendors/${vendorId}/scopes`, data).then((r) => r.data),

  updateScope: (vendorId: number, scopeId: number, data: Partial<TestScope>) =>
    client.put<TestScope>(`/vendors/${vendorId}/scopes/${scopeId}`, data).then((r) => r.data),

  deleteScope: (vendorId: number, scopeId: number) =>
    client.delete(`/vendors/${vendorId}/scopes/${scopeId}`),

  // 발주 이력
  addOrder: (vendorId: number, data: Partial<VendorOrder>) =>
    client.post<VendorOrder>(`/vendors/${vendorId}/orders`, data).then((r) => r.data),

  updateOrder: (vendorId: number, orderId: number, data: Partial<VendorOrder>) =>
    client.put<VendorOrder>(`/vendors/${vendorId}/orders/${orderId}`, data).then((r) => r.data),

  deleteOrder: (vendorId: number, orderId: number) =>
    client.delete(`/vendors/${vendorId}/orders/${orderId}`),

  // 단가 비교
  comparePrices: (testName: string) =>
    client.get<PriceCompareItem[]>('/vendors/compare', { params: { test_name: testName } }).then((r) => r.data),

  // 단건 시험 요청 연계 발주 조회
  listOrdersByRequest: (requestId: number) =>
    client.get<VendorOrder[]>(`/vendors/orders/by-request/${requestId}`).then((r) => r.data),
}

export const LAB_TYPES = ['공인시험소', '교정기관', '인증기관', '연구기관', '기타']
export const KOLAS_REPORT_OPTIONS = ['가능', '불가능']
export const ORDER_STATUSES = ['견적의뢰', '발주완료', '진행중', '완료', '취소']

export const ORDER_STATUS_COLORS: Record<string, string> = {
  '견적의뢰': '#718096',
  '발주완료': '#3182CE',
  '진행중':  '#D69E2E',
  '완료':    '#38A169',
  '취소':    '#A0AEC0',
}

export const ORDER_STATUS_DESCRIPTIONS: Record<string, string> = {
  '견적의뢰': '최초 발주 의뢰 및 시험 일정 의뢰, 견적 요청 단계',
  '발주완료': '견적 확정 및 일정 확정',
  '진행중':  '시험 시작 (시험 일정과 연계)',
  '완료':    '전체 완료 (시험 일정과 연계)',
  '취소':    '어느 단계에서든 특이사항 발생으로 인한 시험 취소 (진행된 시험만큼의 비용은 발생할 수 있음)',
}
