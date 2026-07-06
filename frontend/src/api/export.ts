import client from './client'
import { downloadBlob } from '@/utils/downloadFile'

export const exportApi = {
  downloadAll: async () => {
    const response = await client.get('/export/excel', { responseType: 'blob' })
    const today = new Date().toISOString().slice(0, 10)
    downloadBlob(response.data, `AU_전체데이터_${today}.xlsx`)
  },
}
