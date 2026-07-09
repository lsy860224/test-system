import { useNavigate } from 'react-router-dom'
import CustomerForm from './CustomerForm'

export default function CustomerCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <CustomerForm
        customerId={null}
        standalone
        onClose={() => navigate('/customers')}
        onSaved={() => navigate('/customers')}
      />
    </div>
  )
}
