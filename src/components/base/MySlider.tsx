import { makeStyles } from '@material-ui/core'
import React from 'react'
import useDragMapped from '../hooks/useDragMapped'
import {useDispatch} from 'react-redux'
import { setBaseParams } from '../../redux/scenesSlice'
import { ParamKey } from '../../engine/params'
import { useTypedSelector } from '../../redux/store'
import SliderCursor from './SliderCursor'

interface Props {
  paramKey: ParamKey
  orientation: 'vertical' | 'horizontal'
}

const THICK = 0.8 // rem
const thick = `${THICK}rem`

export default function MySlider({ paramKey, orientation }: Props) {
  
  const paramBase = useTypedSelector(state => state.scenes.byId[state.scenes.active].baseParams[paramKey])
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({x, y}) => {
    dispatch(setBaseParams({
      [paramKey]: y
    }))
  })

  const percent = paramBase * 100

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    track: {
      position: 'relative',
      borderRadius: thick,
      width: orientation === 'vertical' ? thick : '100%',
      height: orientation === 'vertical' ? '100%' : thick,
      backgroundColor: '#0006',
    },
    cursor: {
      position: 'absolute',
      width: thick,
      height: thick,
      borderRadius: thick,
      border: '2px solid #eee',
      bottom: orientation === 'vertical' ? `${percent}%` : 0,
      left: orientation === 'vertical' ? 0 : `${percent}`,
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.track} ref={dragContainer} onMouseDown={onMouseDown}>
        <div style={styles.cursor} />
        <SliderCursor paramKey={paramKey} orientation={orientation} />
      </div>
    </div>
  )
}
