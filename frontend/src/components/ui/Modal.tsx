import React from 'react'

export function Overlay({ children, onClose, width = 680, standalone }: {
  children: React.ReactNode
  onClose: () => void
  width?: number
  standalone?: boolean
}) {
  if (standalone) {
    return (
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width, maxWidth: '95vw',
        margin: '0 auto', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--border)',
      }}>
        {children}
      </div>
    )
  }
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width, maxWidth: '95vw',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      }}>
        {children}
      </div>
    </div>
  )
}
