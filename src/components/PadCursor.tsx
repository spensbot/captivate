import React from 'react'
import {useTypedSelector} from '../redux/store'
import {Param} from '../engine/params'

type Props = {
  paramX: Param
  paramY: Param
  radius?: number
  thickness?: number
  getCursorColor?: (x: number, y: number) => string
}

export default function PadCursor({paramX, paramY, radius = 0.4, thickness = 1, getCursorColor = () => '#000'}: Props) {

  const params = useTypedSelector(state => state.params)
  const x = params[paramX]
  const y = params[paramY]

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `${radius*2}rem`,
      height: `${radius*2}rem`,
      borderRadius: '50%',
      border: `1.5px solid ${getCursorColor(x, y)}`,
      transform: `translate(-${radius}rem, -${radius}rem)`,
    }
  }

  return (
    <div style={styles.root}></div>
  )
}
