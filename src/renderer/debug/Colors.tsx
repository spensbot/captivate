import React from 'react'
import { useActiveScene } from '../redux/store'
import { hsl2rgb, hsv2rgb, hsi2rgb } from '../../shared/dmxColors'

const dp = 1

export default function Colors() {
  const { hue, saturation, brightness } = useActiveScene(
    (activeScene) => activeScene.baseParams
  )

  const styles: { [key: string]: React.CSSProperties } = {}

  function rgbDiv(label: string, rgb: number[]) {
    return (
      <div>{`${label} -> RGB: ${rgb[0].toFixed(dp)} ${rgb[1].toFixed(
        dp
      )} ${rgb[2].toFixed(dp)}`}</div>
    )
  }

  return (
    <div>
      <div>{`H: ${hue.toFixed(dp)} S: ${saturation.toFixed(
        dp
      )} V: ${brightness.toFixed(dp)}`}</div>
      <hr />
      {rgbDiv('L', hsl2rgb(hue, saturation, brightness))}
      {rgbDiv('V', hsv2rgb(hue, saturation, brightness))}
      {rgbDiv('I', hsi2rgb(hue, saturation, brightness))}
      {rgbDiv('B', hsv2rgb(hue, saturation, 1.0))}
    </div>
  )
}
