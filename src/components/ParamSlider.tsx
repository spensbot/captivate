import React from 'react'
import Slider from '@material-ui/core/Slider'
import { Param } from '../engine/params'

type Props = {
  param: Param,
  
}

export default function ParamSlider({param}: Props) {
  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      height: '2rem'
    }
  }

  return (
    <div>
      <Slider></Slider>
    </div>
  )
}
