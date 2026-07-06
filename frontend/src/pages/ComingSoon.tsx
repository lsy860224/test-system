export default function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🔧</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Phase 2에서 제공 예정입니다</div>
    </div>
  )
}
