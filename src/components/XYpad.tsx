import React from 'react'
import useDrag from './hooks/useDrag'
import {useDispatch} from 'react-redux'
import {setParams} from '../redux/paramsSlice'
import {Param} from '../engine/params'
import PadCursor from './PadCursor'

export default function XYpad() {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    dispatch(setParams({
      [Param.X]: x,
      [Param.Y]: y
    }))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '350px',
      height: '200px',
      background: `#000`
    },
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <PadCursor paramX={Param.X} paramY={Param.Y} getCursorColor={() => '#eee'} />
      </div>
    </div>
  )
}