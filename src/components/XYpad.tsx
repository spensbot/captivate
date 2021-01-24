import React from 'react'
import useDrag from './hooks/useDrag'
import {useDispatch} from 'react-redux'
import {setBaseParams} from '../redux/paramsSlice'
import {ParamKey} from '../engine/params'
import PadCursor from './PadCursor'

export default function XYpad() {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    dispatch(setBaseParams({
      [ParamKey.X]: x,
      [ParamKey.Y]: y
    }))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '200px',
      height: '180px',
      background: `#000`
    },
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <PadCursor paramX={ParamKey.X} paramY={ParamKey.Y} getCursorColor={() => '#eee'} />
      </div>
    </div>
  )
}