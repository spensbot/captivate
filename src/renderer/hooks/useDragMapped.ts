import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface MappedPos {
  x: number
  y: number
  dx: number
  dy: number
}

type Ref = React.MutableRefObject<HTMLDivElement | null>
type PointerEventHandler = (e: PointerEvent) => void

type DragStatus = 'Start' | 'Moved' | 'End'

type Handler = (mappedPos: MappedPos, e: PointerEvent, status: DragStatus) => void

export type DragAxis = 'vertical' | 'horizontal' | 'both'

export interface UseDragMappedOptions {
  /** Measure drag position against this element (defaults to returned ref). */
  containerRef?: React.RefObject<HTMLElement | null>
  axis?: DragAxis
  /** Pixels before drag commits; helps scroll containers coexist with sliders. */
  thresholdPx?: number
}

function clamp(val: number, min: number, max: number) {
  if (val < min) return min
  if (val > max) return max
  return val
}

function getRatio(val: number, min: number, max: number, range: number) {
  return (clamp(val, min, max) - min) / range
}

export default function useDragMapped(
  onChange: Handler,
  options: UseDragMappedOptions = {}
): [Ref, React.PointerEventHandler<HTMLDivElement>] {
  const {
    containerRef: externalContainerRef,
    axis = 'both',
    thresholdPx = 0,
  } = options
  const dragContainer = useRef<HTMLDivElement | null>(null)
  const containerRef = externalContainerRef ?? dragContainer
  const onChangeRef = useRef(onChange)
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const pendingRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    target: HTMLElement
  } | null>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const update = useCallback(
    (e: PointerEvent, status: DragStatus) => {
      const el = containerRef.current
      if (el === null) {
        return
      }
      const { width, height, left, top, right, bottom } =
        el.getBoundingClientRect()
      onChangeRef.current(
        {
          x: getRatio(e.clientX, left, right, width),
          y: 1 - getRatio(e.clientY, top, bottom, height),
          dx: e.movementX / width,
          dy: -e.movementY / height,
        },
        e,
        status
      )
    },
    [containerRef]
  )

  const resetPointer = useCallback(() => {
    pendingRef.current = null
    draggingRef.current = false
    setActivePointerId(null)
  }, [])

  const capturePointer = useCallback((target: HTMLElement, pointerId: number) => {
    try {
      target.setPointerCapture(pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const onPointerDown = useCallback<React.PointerEventHandler<HTMLDivElement>>(
    (e) => {
      if (e.button !== 0) {
        return
      }
      e.stopPropagation()
      const target = e.currentTarget
      if (thresholdPx <= 0) {
        e.preventDefault()
        capturePointer(target, e.pointerId)
        draggingRef.current = true
        update(e.nativeEvent, 'Start')
        setActivePointerId(e.pointerId)
        return
      }
      pendingRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        target,
      }
      draggingRef.current = false
      setActivePointerId(e.pointerId)
    },
    [capturePointer, thresholdPx, update]
  )

  useEffect(() => {
    if (activePointerId === null) {
      return
    }

    const onPointerMove: PointerEventHandler = (e) => {
      if (e.pointerId !== activePointerId) {
        return
      }

      if (!draggingRef.current && pendingRef.current !== null) {
        const dx = e.clientX - pendingRef.current.startX
        const dy = e.clientY - pendingRef.current.startY
        const dist = Math.hypot(dx, dy)
        if (dist < thresholdPx) {
          return
        }
        if (axis === 'vertical' && Math.abs(dx) > Math.abs(dy)) {
          resetPointer()
          return
        }
        if (axis === 'horizontal' && Math.abs(dy) > Math.abs(dx)) {
          resetPointer()
          return
        }
        draggingRef.current = true
        const target = pendingRef.current.target
        pendingRef.current = null
        e.preventDefault()
        capturePointer(target, e.pointerId)
        update(e, 'Start')
      }

      if (!draggingRef.current) {
        return
      }
      e.preventDefault()
      update(e, 'Moved')
    }

    const onPointerEnd: PointerEventHandler = (e) => {
      if (e.pointerId !== activePointerId) {
        return
      }
      if (draggingRef.current) {
        update(e, 'End')
      }
      resetPointer()
    }

    document.body.addEventListener('pointermove', onPointerMove, {
      passive: false,
    })
    document.body.addEventListener('pointerup', onPointerEnd)
    document.body.addEventListener('pointercancel', onPointerEnd)

    return () => {
      document.body.removeEventListener('pointermove', onPointerMove)
      document.body.removeEventListener('pointerup', onPointerEnd)
      document.body.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [activePointerId, axis, capturePointer, resetPointer, thresholdPx, update])

  return [dragContainer, onPointerDown]
}
