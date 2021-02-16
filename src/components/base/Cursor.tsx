import React from 'react'

type Props = {
  x: number
  y: number
  radius?: number
  thickness?: number
  color?: string
  withHorizontal?: boolean
  withVertical?: boolean
}

export default function Cursor({ x, y, radius = 0.4, thickness = 1, color = '#fff', withHorizontal = false, withVertical = false }: Props) {

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `${radius*2}rem`,
      height: `${radius*2}rem`,
      borderRadius: '50%',
      border: `1.5px solid ${color}`,
      transform: `translate(-${radius}rem, -${radius}rem)`,
    }
  }

  function VerticalLines() {
    const styles_n: React.CSSProperties = {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `${thickness}px`,
      height: `100%`,
      backgroundColor: color,
      transform: `translate(-${thickness/2}px, ${radius}rem)`
    }
    const styles_s: React.CSSProperties = {
      position: 'absolute',
      top: `${(1 - y) * 100 - 100}%`,
      left: `${x * 100}%`,
      width: `${thickness}px`,
      height: `100%`,
      backgroundColor: color,
      transform: `translate(-${thickness/2}px, -${radius}rem)`
    }
    return (
      <>
        <div style={styles_n} />
        <div style={styles_s} />
      </>
    )
  }

  function HorizontalLines() {
    const styles_e: React.CSSProperties = {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `100%`,
      height: `${thickness}px`,
      backgroundColor: color,
      transform: `translate(${radius}rem, -${thickness/2}px)`
    }
    const styles_w: React.CSSProperties = {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100 - 100}%`,
      width: `100%`,
      height: `${thickness}px`,
      backgroundColor: color,
      transform: `translate(-${radius}rem, -${thickness/2}px)`
    }
    return (
      <>
        <div style={styles_w} />
        <div style={styles_e} />
      </>
    )
  }

  return (
    <>
      <div style={styles.root}></div>
      {withVertical ? VerticalLines() : null}
      {withHorizontal ? HorizontalLines() : null}
    </>
  )
}
