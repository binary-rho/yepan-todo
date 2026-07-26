'use client'

import { useRef } from 'react'
import type { MouseEvent } from 'react'

// 모달 안의 글자를 드래그로 선택하다가 마우스를 배경(backdrop) 위에서 놓으면,
// 브라우저가 click 이벤트를 배경에서 발생시켜 모달이 의도치 않게 닫히는 문제가 있었다.
// mousedown 이 실제로 배경 자체에서 시작됐는지까지 함께 확인해서, 드래그 선택 도중에는 닫히지 않게 한다.
export function useModalBackdropClose(onClose: () => void) {
  const mouseDownOnBackdropRef = useRef(false)

  function onMouseDown(e: MouseEvent<HTMLElement>) {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget
  }

  function onClick(e: MouseEvent<HTMLElement>) {
    const isBackdropClick = e.target === e.currentTarget && mouseDownOnBackdropRef.current
    mouseDownOnBackdropRef.current = false
    if (isBackdropClick) onClose()
  }

  return { onMouseDown, onClick }
}
