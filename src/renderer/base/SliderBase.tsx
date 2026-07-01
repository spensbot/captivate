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
  /** Replaces default track fill (`#0006`) when set — e.g. aux color vertical gradients. */
  trackBackground?: string
  /** Measure drags against this element instead of the drag surface. */
  containerRef?: React.RefObject<HTMLElement | null>
  /** Optional drag threshold before capture (helps nested scroll views). */
  dragThresholdPx?: number
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
  trackBackground,
  containerRef: externalContainerRef,
  dragThresholdPx,
}: Props) {
  const r = `${radius}rem`
  const d = `${radius * 2}rem`
  const v = orientation === 'vertical'
  const vPad = v ? (verticalPadRem ?? radius) : radius

  const [dragContainer, onPointerDown] = useDragMapped(
    ({ x, y }) => {
      onChange(v ? y : x)
    },
    {
      containerRef: externalContainerRef,
      axis: v ? 'vertical' : 'horizontal',
      thresholdPx: dragThresholdPx ?? 0,
    }
  )

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
      backgroundImage: trackBackground,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
    },
  }

  return (
    <div
      style={styles.root}
      role="slider"
      aria-label={ariaLabel ?? title ?? 'Adjust value'}
      title={title ?? ariaLabel ?? 'Drag to adjust'}
    >
      <div
        style={{
          ...styles.dragArea,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        ref={dragContainer}
        onPointerDown={onPointerDown}
      >
        <div style={styles.track} />
        {children}
      </div>
    </div>
  )
}
