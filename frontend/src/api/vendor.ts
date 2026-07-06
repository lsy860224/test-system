import client from './client'

export interface VendorLab {
  id: number
  name: string
  short_name?: string
  lab_type?: string
  kolas_certified: boolean
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  website?: string
  notes?: string
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
  standard_no?: string
  unit_price?: number
  lead_days?: number
  accreditation_scope?: string
  notes?: string
  created_at: string
}

export interface VendorOrder {
  id: number
  vendor_id: number
  project_name: string
  test_items?: string
  order_date?: string
  due_date?: string
  status: string
  total_amount?: number
  notes?: string
  created_at: string
}

export interface PriceCompareItem {
  vendor_id: number
  vendor_name: string
  vendor_short?: string
  kolas_certified: boolean
  unit_price?: number
  lead_days?: number
  accreditation_scope?: string
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
}

export const LAB_TYPES = ['공인시험소', '교정기관', '인증기관', '연구기관', '기타']
export const ORDER_STATUSES = ['발주전', '발주완료', '진행중', '완료', '취소']

export const ORDER_STATUS_COLORS: Record<string, string> = {
  '발주전':  '#718096',
  '발주완료': '#3182CE',
  '진행중':  '#D69E2E',
  '완료':    '#38A169',
  '취소':    '#A0AEC0',
}
