import Button from './Button'

interface Props {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
      <Button variant="secondary" size="sm" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>이전</Button>
      <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
      <Button variant="secondary" size="sm" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>다음</Button>
    </div>
  )
}
