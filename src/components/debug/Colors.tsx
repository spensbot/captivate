import React from 'react'
import { useTypedSelector } from '../../redux/store'
import { hsl2rgb, hsv2rgb, hsi2rgb } from '../../engine/dmxColors'

const dp = 1

export default function Colors() {

  const {Hue, Saturation, Brightness} = useTypedSelector(state => state.baseParams)

  const styles: {[key: string]: React.CSSProperties} = {
    
  }

  function rgbDiv(label: string, rgb: number[]) {
    return (<div>{`${label} -> RGB: ${rgb[0].toFixed(dp)} ${rgb[1].toFixed(dp)} ${rgb[2].toFixed(dp)}`}</div>)
  }

  return (
    <div>
      <div>{`H: ${Hue.toFixed(dp)} S: ${Saturation.toFixed(dp)} V: ${Brightness.toFixed(dp)}`}</div>
      <hr/>
      {rgbDiv('L', hsl2rgb(Hue, Saturation, Brightness))}
      {rgbDiv('V', hsv2rgb(Hue, Saturation, Brightness))}
      {rgbDiv('I', hsi2rgb(Hue, Saturation, Brightness))}
      {rgbDiv('B', hsv2rgb(Hue, Saturation, 1.0))}
    </div>
  )
}
