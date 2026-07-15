import { useCallback, useEffect, useRef, useState } from 'react'
import { useUnsavedGuardStore } from '@/stores/unsavedGuardStore'

/**
 * 폼의 "저장하지 않은 변경사항" 여부를 추적하고, 닫기 버튼/사이드바 이동/탭 닫기 시
 * 확인창을 띄우도록 게이트를 건다.
 *
 * snapshot: 저장 버튼을 눌러야만 반영되는 상태 전부(예: { form, selectedIds } 등).
 *           하위 리소스(교정이력·발주 등)처럼 각자 즉시 저장되는 상태는 제외한다.
 * ready: 비동기로 기존 데이터를 불러오는 수정 폼에서, 로딩이 끝나 snapshot이
 *        "초기값"으로 확정된 시점(보통 !loading)에 true로 넘긴다. 신규 등록 폼은 항상 true.
 */
export function useUnsavedFormGuard(snapshot: unknown, ready: boolean = true) {
  const baseline = useRef<string | null>(null)
  const current = JSON.stringify(snapshot)

  useEffect(() => {
    if (ready && baseline.current === null) {
      baseline.current = current
    }
  }, [ready, current])

  const isDirty = ready && baseline.current !== null && baseline.current !== current

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const setGuard = useUnsavedGuardStore((s) => s.setGuard)

  const guard = useCallback((action: () => void) => {
    if (isDirty) setPendingAction(() => action)
    else action()
  }, [isDirty])

  // 사이드바 등 외부 이동 시도가 이 guard를 호출할 수 있도록 전역 스토어에 등록
  useEffect(() => {
    setGuard(isDirty, isDirty ? guard : null)
    return () => setGuard(false, null)
  }, [isDirty, guard, setGuard])

  // 탭 닫기/새로고침은 SPA 라우팅을 거치지 않으므로 별도로 막는다
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const markClean = useCallback(() => { baseline.current = current }, [current])

  return {
    isDirty,
    confirmOpen: pendingAction !== null,
    requestClose: (action: () => void) => guard(action),
    confirmDiscard: () => { const a = pendingAction; setPendingAction(null); a?.() },
    confirmCancel: () => setPendingAction(null),
    markClean,
  }
}
