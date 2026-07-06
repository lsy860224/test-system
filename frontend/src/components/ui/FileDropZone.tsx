import React from 'react'

export function FileDropZone({
  isDragOver, onDragOver, onDragLeave, onDrop, onClick, fileInputRef, onFileSelect, hint, accentColor = 'var(--primary)',
}: {
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  hint: string
  accentColor?: string
}) {
  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        style={{
          border: `2px dashed ${isDragOver ? accentColor : 'var(--border)'}`,
          borderRadius: 12, padding: '32px 20px',
          textAlign: 'center', cursor: 'pointer', marginBottom: 16,
          background: isDragOver ? '#EBF4FF' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>파일을 드래그하거나 클릭하여 첨부</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>
      </div>
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={onFileSelect} />
    </>
  )
}
