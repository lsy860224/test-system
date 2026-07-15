import { create } from 'zustand'

// 현재 열려 있는 폼(모달/standalone 페이지)에 저장하지 않은 변경사항이 있는지,
// 있다면 다른 곳으로 이동하려는 시도를 가로채 확인창을 띄우는 전역 게이트.
// 한 번에 폼은 하나만 열리는 앱 구조라 활성 guard도 하나만 유지한다.
interface UnsavedGuardState {
  isDirty: boolean
  guard: ((proceed: () => void) => void) | null
  setGuard: (isDirty: boolean, guard: ((proceed: () => void) => void) | null) => void
}

export const useUnsavedGuardStore = create<UnsavedGuardState>((set) => ({
  isDirty: false,
  guard: null,
  setGuard: (isDirty, guard) => set({ isDirty, guard }),
}))
