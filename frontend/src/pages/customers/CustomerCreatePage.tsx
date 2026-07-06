import { useNavigate } from 'react-router-dom'
import CustomerForm from './CustomerForm'

export default function CustomerCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>업체 등록</h2>
      <CustomerForm
        customerId={null}
        standalone
        onClose={() => navigate('/customers')}
        onSaved={() => navigate('/customers')}
      />
    </div>
  )
}
