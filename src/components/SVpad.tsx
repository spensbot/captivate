import React from 'react'
import useDrag from './hooks/useDrag'
import {useTypedSelector} from '../redux/store'
import {useDispatch} from 'react-redux'
import {setParams} from '../redux/paramsSlice'
import {Param} from '../engine/params'
import PadCursor from './PadCursor'

export default function SVpad() {

  const {Hue} = useTypedSelector(state => state.params)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    dispatch(setParams({
      [Param.Saturation]: x,
      [Param.Brightness]: y
    }))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '350px',
      height: '200px',
      background: `hsl(${Hue * 360},100%, 50%)`,
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
    }
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <PadCursor paramX={Param.Saturation} paramY={Param.Brightness} getCursorColor={(x,y) => y < 0.3 ? '#ccc' : '#111' }/>
      </div>
    </div>
  )
}
