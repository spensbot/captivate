import type { MouseEventHandler } from 'react'

interface Props {
  value: number
  orientation: 'vertical' | 'horizontal'
  radius: number
  color?: string
  border?: boolean
  /**
   * Live / reference cursors should not capture pointer events so the track
   * and manual ring (pointer-events auto) receive drags and context menu.
   */
  pointerEvents?: 'auto' | 'none'
  onContextMenu?: MouseEventHandler<HTMLDivElement>
}

export default function SliderCursor({
  value,
  orientation,
  radius,
  color = '#fffa',
  border,
  pointerEvents = 'none',
  onContextMenu,
}: Props) {
  const percent = value * 100
  const v = orientation === 'vertical'
  const r = `${radius * 2}rem`
  const d = `${radius * 2}rem`

  return (
    <div
      onContextMenu={onContextMenu}
      style={{
        position: 'absolute',
        width: d,
        height: d,
        borderRadius: r,
        bottom: v ? `${percent}%` : 0,
        left: v ? 0 : `${percent}%`,
        border: border ? '2px solid ' + color : undefined,
        backgroundColor: border ? undefined : color,
        transform: `translate(${v ? 0 : -radius}rem, ${v ? radius : 0}rem)`,
        boxSizing: 'border-box',
        pointerEvents,
      }}
    />
  )
}
