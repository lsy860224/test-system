import { useNavigate } from 'react-router-dom'
import VehicleModelForm from './VehicleModelForm'

export default function VehicleModelCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <VehicleModelForm
        vehicleModelId={null}
        standalone
        onClose={() => navigate('/vehicle-models')}
        onSaved={() => navigate('/vehicle-models')}
      />
    </div>
  )
}
