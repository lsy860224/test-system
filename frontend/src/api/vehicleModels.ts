import client from './client'

export interface VehicleModel {
  id: number
  code: string
  name?: string | null
  notes?: string | null
  is_active: boolean
  created_at: string
}

export const vehicleModelsApi = {
  list: (params: { page?: number; size?: number; search?: string }) =>
    client.get<{ total: number; items: VehicleModel[] }>('/vehicle-models/', { params }).then((r) => r.data),

  get: (id: number) => client.get<VehicleModel>(`/vehicle-models/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) => client.post<VehicleModel>('/vehicle-models/', data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) => client.put<VehicleModel>(`/vehicle-models/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/vehicle-models/${id}`),
}
