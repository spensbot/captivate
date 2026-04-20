import useDragMapped from '../hooks/useDragMapped'

interface Props {
  radius: number
  orientation: 'vertical' | 'horizontal'
  onChange: (newVal: number) => void
  children: React.ReactNode
  title?: string
  ariaLabel?: string
  /** When vertical, top/bottom inset inside the control (defaults to `radius`). */
  verticalPadRem?: number
}

// SliderBase displays the track and handles dragging
export default function SliderBase({
  orientation,
  radius,
  onChange,
  children,
  title,
  ariaLabel,
  verticalPadRem,
}: Props) {
  const r = `${radius}rem`
  const d = `${radius * 2}rem`
  const v = orientation === 'vertical'
  const vPad = v ? (verticalPadRem ?? radius) : radius

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    onChange(v ? y : x)
  })

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: `${v ? vPad : 0}rem ${v ? 0 : radius}rem`,
      boxSizing: 'border-box',
    },
    dragArea: {
      position: 'relative',
      width: v ? d : '100%',
      height: v ? '100%' : d,
      margin: 0,
    },
    track: {
      position: 'absolute',
      top: v ? `-${r}` : 0,
      right: v ? 0 : `-${r}`,
      bottom: v ? `-${r}` : 0,
      left: v ? 0 : `-${r}`,
      borderRadius: r,
      backgroundColor: '#0006',
    },
  }

  return (
    <div
      style={styles.root}
      role="slider"
      aria-label={ariaLabel ?? title ?? 'Adjust value'}
      title={title ?? ariaLabel ?? 'Adjust value'}
    >
      <div
        style={styles.dragArea}
        ref={dragContainer}
        onMouseDown={onMouseDown}
      >
        <div style={styles.track} />
        {children}
      </div>
    </div>
  )
}
