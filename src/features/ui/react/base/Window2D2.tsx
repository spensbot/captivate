import { Window2D_t } from '../../../shared/shared/window'

interface Props {
  window2D: Window2D_t
  onClick?: (e: React.MouseEvent) => void
}

const thickness = 1
const radius = 0.5
const color = '#fff'

export default function Window2D2({ window2D, onClick }: Props) {
  const x = window2D.x?.pos ?? 0.5
  let width = window2D.x?.width ?? 0
  width += 0.05
  const y = window2D.y?.pos ?? 0.5
  let height = window2D.y?.width ?? 0
  height += 0.05

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `${radius * 2}rem`,
      height: `${radius * 2}rem`,
      borderRadius: '50%',
      border: `1.5px solid ${color}`,
      backgroundColor: color,
      transform: `translate(-${radius}rem, -${radius}rem)`,
      cursor: onClick ? 'pointer' : undefined,
      boxSizing: 'border-box',
    },
  }

  function Y() {
    const styles: { [key: string]: React.CSSProperties } = {
      vertical: {
        position: 'absolute',
        top: `${(1 - (y + height / 2)) * 100}%`,
        left: `${x * 100}%`,
        width: `${thickness}px`,
        height: `${height * 100}%`,
        backgroundColor: color,
        transform: `translate(-${thickness / 2}px, 0)`,
      },
      bounds: {
        position: 'absolute',
        top: `${(1 - (y + height / 2)) * 100}%`,
        left: `${x * 100}%`,
        width: `1rem`,
        height: `${height * 100}%`,
        borderTop: '1px solid white',
        borderBottom: '1px solid white',
        transform: `translate(-${1 / 2}rem, 0)`,
      },
    }

    return (
      <>
        <div style={styles.vertical} />
        <div style={styles.bounds} />
      </>
    )
  }

  function X() {
    const styles: { [key: string]: React.CSSProperties } = {
      horizontal: {
        position: 'absolute',
        top: `${(1 - y) * 100}%`,
        left: `${(x - width / 2) * 100}%`,
        width: `${width * 100}%`,
        height: `${thickness}px`,
        backgroundColor: color,
        transform: `translate(0, -${thickness / 2}px)`,
      },
      bounds: {
        position: 'absolute',
        top: `${(1 - y) * 100}%`,
        left: `${(x - width / 2) * 100}%`,
        width: `${width * 100}%`,
        height: `1rem`,
        borderLeft: '1px solid white',
        borderRight: '1px solid white',
        transform: `translate(0, -${1 / 2}rem)`,
      },
    }

    return (
      <>
        <div style={styles.horizontal} />
        <div style={styles.bounds} />
      </>
    )
  }

  return (
    <>
      <div onClick={onClick} style={styles.root}></div>
      {window2D.x ? X() : null}
      {window2D.y ? Y() : null}
    </>
  )
}
