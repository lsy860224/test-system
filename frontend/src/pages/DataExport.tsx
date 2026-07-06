import { useState } from 'react'
import { exportApi } from '@/api/export'

export default function DataExport() {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await exportApi.downloadAll()
    } catch (e) {
      console.error(e)
      alert('다운로드에 실패했습니다')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>데이터 내보내기</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>전체 모듈 Excel 일괄 다운로드 · 모듈별 PDF 보고서</p>
      </div>

      {/* Excel 내보내기 */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={iconBox('#2B2F82')}>📊</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>전체 모듈 Excel 내보내기</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>규격 매트릭스 · 장비대장 · 시험일정 · NCR · 외주시험소 · SOP · 프로젝트 · 업체 — 8개 시트 단일 워크북</div>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '10px 20px', border: 'none', borderRadius: 8,
            background: 'var(--au-indigo)', color: '#fff', fontSize: 13, fontWeight: 600,
            opacity: downloading ? 0.6 : 1,
          }}
        >
          {downloading ? '생성 중...' : '⬇️ 전체 데이터 Excel 다운로드'}
        </button>
      </div>

      {/* PDF 보고서 */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={iconBox('#1565C0')}>🖨️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>PDF 보고서</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>각 페이지 접속 후 우측 상단 "PDF로 저장" 버튼으로 인쇄·PDF 출력</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '시험평가팀 현황 대시보드', desc: '전 모듈 요약 · 규격/장비/NCR/일정 현황판', path: '/dashboard' },
            { label: 'Gap Analysis 1-Pager', desc: 'HKMC 양산 진입 Gap 판정 · 임원 보고용', path: '/reports/gap-analysis' },
            { label: '분기별 KPI', desc: 'DV/PV·시험·교정·SOP·NCR 분기 활동 지표', path: '/reports/quarterly-kpi' },
          ].map((item) => (
            <a key={item.path} href={item.path} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--au-blue)', fontWeight: 600 }}>열기 →</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)',
}

function iconBox(color: string): React.CSSProperties {
  return {
    width: 36, height: 36, borderRadius: 8,
    background: `${color}18`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  }
}
