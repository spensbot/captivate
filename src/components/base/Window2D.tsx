import React from 'react'
import { Window2D_t } from '../../types/baseTypes'

interface Props {
  window2D: Window2D_t
}

export default function Window2D({window2D}: Props) {

  const x = window2D.x === undefined ? 0.5 : window2D.x.pos
  const width = window2D.x?.width || 0
  const y = window2D.y === undefined ? 0.5 : window2D.y.pos
  const height = window2D.y?.width || 0

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'absolute',
      top: `${(1 - y) * 100 - height*50}%`,
      left: `${x * 100 - width*50}%`,
      width: `${width*100}%`,
      height: `${height*100}%`,
      // transform: `translate(-${Width * 50}%, -${Height * 50}%)`,
      backgroundColor: '#aff2',
      border: '1px solid #aff3',
      borderRadius: '0.2rem'
    }
  }

  return (
    <div style={styles.root}></div>
  )
}
