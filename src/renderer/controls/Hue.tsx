import useDragMapped from '../hooks/useDragMapped'
import { useDispatch } from 'react-redux'
import { setBaseParams } from '../redux/controlSlice'

interface Props {
  splitIndex: number
}

export default function Hue({ splitIndex }: Props) {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(
      setBaseParams({
        splitIndex,
        params: { hue: x },
      })
    )
  })

  const styles: { [key: string]: React.CSSProperties } = {
    root: {
      width: '100%',
      height: '20px',
      background:
        'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
    },
  }

  return (
    <div
      style={styles.root}
      ref={dragContainer}
      onMouseDown={onMouseDown}
    ></div>
  )
}
