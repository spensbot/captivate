import { Window2D_t } from '../../shared/window'

interface Props {
  window2D: Window2D_t
  /** 0 = hard cyan edge; 1 = wide soft fade past the box (matches DMX positionFeather). */
  feather?: number
}

export default function Window2D({ window2D, feather = 0 }: Props) {
  const x = window2D.x === undefined ? 0.5 : window2D.x.pos
  const width = window2D.x?.width || 0
  const y = window2D.y === undefined ? 0.5 : window2D.y.pos
  const height = window2D.y?.width || 0

  const f = Math.max(0, Math.min(1, feather))
  const fadeXPct = f * 50
  const fadeYPct = f * 50
  const useFeather = f > 0.001

  const maskImage = useFeather
    ? `linear-gradient(to right, transparent 0%, #000 ${fadeXPct}%, #000 ${
        100 - fadeXPct
      }%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 ${fadeYPct}%, #000 ${
        100 - fadeYPct
      }%, transparent 100%)`
    : undefined

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      position: 'absolute',
      top: `${(1 - y) * 100 - height * 50}%`,
      left: `${x * 100 - width * 50}%`,
      width: `${width * 100}%`,
      height: `${height * 100}%`,
      backgroundColor: '#aff2',
      border: useFeather ? '1px solid #aff5' : '1px solid #aff3',
      borderRadius: '0.2rem',
      pointerEvents: 'none',
      boxSizing: 'border-box',
      WebkitMaskImage: maskImage,
      maskImage,
      WebkitMaskComposite: 'source-in',
      maskComposite: 'intersect',
    },
    coreEdge: {
      position: 'absolute',
      left: `${fadeXPct}%`,
      top: `${fadeYPct}%`,
      width: `${100 - fadeXPct * 2}%`,
      height: `${100 - fadeYPct * 2}%`,
      border: '1px dashed rgba(170, 255, 255, 0.55)',
      borderRadius: '0.12rem',
      boxSizing: 'border-box',
      pointerEvents: 'none',
    },
  }

  const coreFrameStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${(1 - y) * 100 - height * 50}%`,
    left: `${x * 100 - width * 50}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    pointerEvents: 'none',
    boxSizing: 'border-box',
  }

  return (
    <>
      <div style={styles.root} />
      {useFeather ? (
        <div style={coreFrameStyle} aria-hidden>
          <div style={styles.coreEdge} />
        </div>
      ) : null}
    </>
  )
}

