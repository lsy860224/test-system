import client from './client'

export interface Customer {
  id: number
  name: string
  short_name?: string
  company_type: string
  business_reg_number?: string
  homepage?: string
  address?: string
  color_hex: string
  partner_code?: string
  notes?: string
  is_active: boolean
  created_at: string
  contacts: Contact[]
  attachments: Attachment[]
}

export interface Contact {
  id: number
  customer_id: number
  name: string
  title?: string
  phone?: string
  email?: string
  is_primary: boolean
}

export interface Attachment {
  id: number
  doc_type?: string
  file_name: string
  file_size?: number
  uploaded_at: string
}

export interface CustomerListItem {
  id: number
  name: string
  short_name?: string
  company_type: string
  color_hex: string
  is_active: boolean
  partner_code?: string
}

export const customersApi = {
  list: (params: { page?: number; size?: number; search?: string; company_type?: string }) =>
    client.get<{ total: number; items: CustomerListItem[] }>('/customers/', { params }).then((r) => r.data),

  get: (id: number) => client.get<Customer>(`/customers/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    client.post<Customer>('/customers/', data).then((r) => r.data),

  update: (id: number, data: Partial<Customer>) =>
    client.put<Customer>(`/customers/${id}`, data).then((r) => r.data),

  deactivate: (id: number) => client.delete(`/customers/${id}`),

  addContact: (customerId: number, data: Partial<Contact>) =>
    client.post<Contact>(`/customers/${customerId}/contacts`, data).then((r) => r.data),

  removeContact: (customerId: number, contactId: number) =>
    client.delete(`/customers/${customerId}/contacts/${contactId}`),

  uploadAttachment: (customerId: number, file: File, docType: string) => {
    const form = new FormData()
    form.append('file', file)
    return client
      .post(`/customers/${customerId}/attachments?doc_type=${encodeURIComponent(docType)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  deleteAttachment: (customerId: number, attachmentId: number) =>
    client.delete(`/customers/${customerId}/attachments/${attachmentId}`),
}
