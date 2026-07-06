import React, { type ButtonHTMLAttributes, type CSSProperties } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const styles: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--au-blue)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  danger: { background: '#E53E3E', color: '#fff', border: 'none' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
}

const sizes: Record<Size, CSSProperties> = {
  sm: { fontSize: 12, padding: '4px 10px', borderRadius: 6 },
  md: { fontSize: 13, padding: '7px 16px', borderRadius: 8 },
}

export default function Button({ variant = 'primary', size = 'md', loading, children, disabled, style, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        ...sizes[size],
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'opacity 0.15s',
        ...style,
      }}
      {...rest}
    >
      {loading ? '처리 중...' : children}
    </button>
  )
}
