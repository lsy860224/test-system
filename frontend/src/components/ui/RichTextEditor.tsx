import React, { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  minHeight?: number
  placeholder?: string
}

// contentEditable 기반 경량 에디터. 절차 및 방법 필드에 굵게/번호목록/이미지 삽입만 지원한다.
// 이미지는 별도 업로드 엔드포인트 없이 base64 data URI로 인라인 저장한다 — 인증 토큰이 필요한
// <img src> fetch 문제를 피하기 위함 (사내 소규모 앱 규모에서는 DB 행 크기 증가가 감내 가능한 수준).
export default function RichTextEditor({ value, onChange, minHeight = 320, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastValue = useRef<string | null>(null)

  // 마운트 시 최초 1회 초기값을 그려준다 (contenteditable은 React value prop으로 렌더링되지 않음).
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value || ''
      lastValue.current = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ref.current && value !== lastValue.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || ''
      lastValue.current = value
    }
  }, [value])

  const emit = () => {
    if (!ref.current) return
    const html = ref.current.innerHTML
    lastValue.current = html
    onChange(html)
  }

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      ref.current?.focus()
      document.execCommand('insertImage', false, dataUrl)
      emit()
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
    e.target.value = ''
  }

  const toolbarBtn: React.CSSProperties = {
    padding: '5px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6,
    background: 'var(--surface)', color: 'var(--text-secondary)', cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button type="button" style={{ ...toolbarBtn, fontWeight: 700 }} onClick={() => exec('bold')}>B 굵게</button>
        <button type="button" style={toolbarBtn} onClick={() => exec('insertOrderedList')}>1. 번호목록</button>
        <button type="button" style={toolbarBtn} onClick={() => fileRef.current?.click()}>🖼 이미지 삽입</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        style={{
          minHeight, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8,
          fontSize: 13, lineHeight: 1.7, overflowY: 'auto', outline: 'none',
        }}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: var(--text-muted); }
        [contenteditable] img { max-width: 100%; display: block; margin: 6px 0; }
      `}</style>
    </div>
  )
}
