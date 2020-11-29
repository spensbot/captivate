import React, {useState} from 'react'
import useDrag from './hooks/useDrag'

export default function SVpad() {

  const radiusREM = 0.4

  const [pos, setPos] = useState({x: 0.5, y: 0.5})

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    console.log(`x:${x} y:${y}`)
    setPos({x, y})
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '350px',
      height: '200px',
      background: `hsl(${100},100%, 50%)`,
    },
    white: {
      position: 'absolute',
      background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))',
      top: '0', right: '0', bottom: '0', left: '0'
    },
    black: {
      position: 'absolute',
      background: 'linear-gradient(to top, #000, rgba(0,0,0,0))',
      top: '0', right: '0', bottom: '0', left: '0',
    },
    cursor: {
      position: 'absolute',
      top: `${(1 - pos.y) * 100}%`,
      left: `${pos.x * 100}%`,
      width: `${radiusREM*2}rem`,
      height: `${radiusREM*2}rem`,
      borderRadius: '50%',
      border: '1.5px solid black',
      transform: `translate(-${radiusREM}rem, -${radiusREM}rem)`
    }
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <div style={styles.cursor}></div>
      </div>
    </div>
  )
}
