import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/scenesSlice'
import { Param } from '../../engine/params'
import { useTypedSelector } from '../redux/store'
import SliderCursor from './SliderCursor'

interface Props {
  param: Param
  orientation: 'vertical' | 'horizontal'
}

const THICK = 0.8 // rem
const thick = `${THICK}rem`

export default function MySlider({ param, orientation }: Props) {
  const paramBase = useTypedSelector(
    (state) => state.scenes.byId[state.scenes.active].baseParams[param]
  )
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(
      setBaseParams({
        [param]: y,
      })
    )
  })

  const percent = paramBase * 100
  const v = orientation === 'vertical'

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    track: {
      position: 'relative',
      borderRadius: thick,
      width: v ? thick : '100%',
      height: v ? '100%' : thick,
      backgroundColor: '#0006',
    },
    cursor: {
      position: 'absolute',
      width: thick,
      height: thick,
      borderRadius: thick,
      border: '2px solid #eee',
      bottom: v ? `${percent}%` : 0,
      left: v ? 0 : `${percent}`,
      transform: `translate(${v ? 0 : THICK / 2}rem, ${v ? THICK / 2 : 0}rem)`,
    },
  }

  return (
    <div style={styles.root}>
      <div style={styles.track} ref={dragContainer} onMouseDown={onMouseDown}>
        <div style={styles.cursor} />
        <SliderCursor orientation={orientation} />
      </div>
    </div>
  )
}
