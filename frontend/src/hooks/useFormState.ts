import { useState } from 'react'

export function useFormState<T extends object>(initial: T) {
  const [form, setForm] = useState<T>(initial)
  const set = (key: keyof T, value: T[keyof T]) => setForm((p) => ({ ...p, [key]: value }))
  return [form, setForm, set] as const
}
