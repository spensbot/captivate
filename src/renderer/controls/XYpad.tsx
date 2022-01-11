import React from 'react'
import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams, incrementBaseParams } from '../redux/scenesSlice'
import XYCursor from './XYCursor'
import XYWindow from './XYWindow'

export default function XYpad() {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y, dx, dy }, e) => {
    if (e.metaKey) {
      dispatch(
        incrementBaseParams({
          width: dx / 2,
          height: dy / 2,
        })
      )
    } else {
      dispatch(
        setBaseParams({
          x: x,
          y: y,
        })
      )
    }
  })

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      position: 'relative',
      width: '200px',
      height: '180px',
      background: `#000`,
      overflow: 'hidden',
    },
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <XYCursor />
        <XYWindow />
      </div>
    </div>
  )
}
