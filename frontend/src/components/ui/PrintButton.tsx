import React from 'react'

export function PrintButton({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: '8px 16px', border: 'none', borderRadius: 8,
        background: 'var(--au-indigo)', color: '#fff', fontSize: 13, fontWeight: 600,
        ...style,
      }}
    >
      🖨️ PDF로 저장
    </button>
  )
}
