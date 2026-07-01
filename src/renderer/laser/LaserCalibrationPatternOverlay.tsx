import styled from 'styled-components'
import { buildLaserCalibrationPatternSegments } from './laserCalibrationPattern'

type Props = {
  visible: boolean
}

/** Editor canvas overlay mirroring the DAC calibration test pattern. */
export default function LaserCalibrationPatternOverlay({ visible }: Props) {
  if (!visible) return null

  const segments = buildLaserCalibrationPatternSegments('ilda_standard')

  return (
    <Svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      {segments.map((seg, index) => {
        const d = seg.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ')
        const color = rgbCss(seg.r, seg.g, seg.b)
        return (
          <path
            key={index}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={0.004}
            vectorEffect="non-scaling-stroke"
            opacity={0.92}
          />
        )
      })}
    </Svg>
  )
}

function rgbCss(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}

const Svg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
`
