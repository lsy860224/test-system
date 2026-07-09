import { useNavigate } from 'react-router-dom'
import ItemForm from './ItemForm'

export default function ItemCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <ItemForm
        itemId={null}
        standalone
        onClose={() => navigate('/items')}
        onSaved={() => navigate('/items')}
      />
    </div>
  )
}
