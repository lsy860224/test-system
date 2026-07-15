import Button from './Button'

interface Props {
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  saving?: boolean
}

export default function UnsavedChangesDialog({ onSave, onDiscard, onCancel, saving }: Props) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: 380, maxWidth: '90vw', padding: 24, boxShadow: '0 12px 48px rgba(0,0,0,0.3)' }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>저장하지 않은 변경사항이 있습니다</h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
          지금 나가면 입력한 내용이 사라집니다. 저장하시겠습니까?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>계속 편집</Button>
          <Button size="sm" onClick={onDiscard} disabled={saving}
            style={{ background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}>
            저장 안 함
          </Button>
          <Button size="sm" onClick={onSave} loading={saving}>저장</Button>
        </div>
      </div>
    </div>
  )
}
