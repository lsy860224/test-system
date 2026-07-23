import React, { useState } from 'react'
import { sopApi } from '@/api/sop'
import Button from '@/components/ui/Button'
import { Overlay } from '@/components/ui/Modal'
import { FormField as F } from '@/components/ui/FormField'

interface Props {
  sopIds: number[]
  onClose: () => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const emptyCover = { project_name: '', part_name: '', customer: '', sample_quantity: '', remarks: '' }

export default function SOPExportDialog({ sopIds, onClose }: Props) {
  const [format, setFormat] = useState<'pptx' | 'docx'>('pptx')
  const [variant, setVariant] = useState<'절차서' | '계획서'>('절차서')
  const [cover, setCover] = useState({ ...emptyCover })
  const [exporting, setExporting] = useState(false)

  const setCoverField = (key: keyof typeof emptyCover, value: string) => setCover((p) => ({ ...p, [key]: value }))

  const choiceStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
    background: active ? '#EBF4FF' : 'var(--surface)',
    color: active ? 'var(--primary)' : 'var(--text-secondary)',
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await sopApi.exportDocuments(sopIds, format, variant, variant === '계획서' ? cover : undefined)
      onClose()
    } catch {
      alert('내보내기 중 오류가 발생했습니다')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Overlay width={480} onClose={onClose}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>절차서 내보내기</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sopIds.length}건 선택됨 · 하나의 파일로 병합됩니다</p>
      </div>

      <div style={{ padding: 24, display: 'grid', gap: 16, overflowY: 'auto', flex: 1, maxHeight: 'calc(90vh - 180px)' }}>
        <F label="파일 형식">
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={choiceStyle(format === 'pptx')} onClick={() => setFormat('pptx')}>PPTX (HKMC)</button>
            <button type="button" style={choiceStyle(format === 'docx')} onClick={() => setFormat('docx')}>DOCX (사내)</button>
          </div>
        </F>
        <F label="문서 종류">
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={choiceStyle(variant === '절차서')} onClick={() => setVariant('절차서')}>절차서</button>
            <button type="button" style={choiceStyle(variant === '계획서')} onClick={() => setVariant('계획서')}>계획서</button>
          </div>
        </F>

        {variant === '계획서' && (
          <div style={{ display: 'grid', gap: 12, padding: 14, background: 'var(--surface-raised, #F9FAFB)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>커버 정보 (계획서 표지에 표시)</p>
            <F label="프로젝트명">
              <input value={cover.project_name} onChange={(e) => setCoverField('project_name', e.target.value)} style={inp} placeholder="JG DCAS" />
            </F>
            <F label="부품명">
              <input value={cover.part_name} onChange={(e) => setCoverField('part_name', e.target.value)} style={inp} placeholder="RODS" />
            </F>
            <F label="고객사">
              <input value={cover.customer} onChange={(e) => setCoverField('customer', e.target.value)} style={inp} placeholder="HKMC" />
            </F>
            <F label="시료 수량">
              <input value={cover.sample_quantity} onChange={(e) => setCoverField('sample_quantity', e.target.value)} style={inp} placeholder="LEG당 3EA" />
            </F>
            <F label="비고">
              <input value={cover.remarks} onChange={(e) => setCoverField('remarks', e.target.value)} style={inp} />
            </F>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
        <Button size="sm" onClick={handleExport} loading={exporting}>내보내기</Button>
      </div>
    </Overlay>
  )
}
