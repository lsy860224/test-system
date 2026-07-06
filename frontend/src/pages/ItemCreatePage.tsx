import { useNavigate } from 'react-router-dom'
import ItemForm from './ItemForm'

export default function ItemCreatePage() {
  const navigate = useNavigate()
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>아이템 등록</h2>
      <ItemForm
        itemId={null}
        standalone
        onClose={() => navigate('/items')}
        onSaved={() => navigate('/items')}
      />
    </div>
  )
}
