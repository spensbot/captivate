import React from 'react'
import {useTypedSelector} from '../../redux/store'
import {ParamKey} from '../../engine/params'

type Props = {
  paramX: ParamKey
  paramY: ParamKey
  radius?: number
  thickness?: number
  getCursorColor?: (x: number, y: number) => string
}

export default function PadCursor({paramX, paramY, radius = 0.4, thickness = 1, getCursorColor = () => '#000'}: Props) {

  const params = useTypedSelector(state => state.params.output)
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
    },
    n: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `${thickness}px`,
      height: `100%`,
      backgroundColor: '#fff8',
      transform: `translate(-${thickness/2}px, ${radius}rem)`
    },
    s: {
      position: 'absolute',
      top: `${(1 - y) * 100 - 100}%`,
      left: `${x * 100}%`,
      width: `${thickness}px`,
      height: `100%`,
      backgroundColor: '#fff8',
      transform: `translate(-${thickness/2}px, -${radius}rem)`
    },
    e: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100}%`,
      width: `100%`,
      height: `${thickness}px`,
      backgroundColor: '#fff8',
      transform: `translate(${radius}rem, -${thickness/2}px)`
    },
    w: {
      position: 'absolute',
      top: `${(1 - y) * 100}%`,
      left: `${x * 100 - 100}%`,
      width: `100%`,
      height: `${thickness}px`,
      backgroundColor: '#fff8',
      transform: `translate(-${radius}rem, -${thickness/2}px)`
    },
  }

  return (
    <>
      <div style={styles.root}></div>
      <div style={styles.n}></div>
      <div style={styles.s}></div>
      <div style={styles.e}></div>
      <div style={styles.w}></div>
    </>
  )
}
