import styled from 'styled-components'
import type { LaserProjectionZone } from '../../shared/laserFixtureRouting'
import { normalizeZoneRect } from './laserProjectionZoneMath'

type Props = {
  zones: LaserProjectionZone[]
  /** zoneId → fixture names */
  fixtureNamesByZone?: Record<string, string[]>
  highlightZoneId?: string | null
}

export default function LaserZoneCanvasOverlay({
  zones,
  fixtureNamesByZone = {},
  highlightZoneId = null,
}: Props) {
  if (zones.length <= 0) return null
  return (
    <OverlaySvg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
      {zones.map((z) => {
        const r = normalizeZoneRect(z.rect)
        const active = z.id === highlightZoneId
        const assigned = (fixtureNamesByZone[z.id]?.length ?? 0) > 0
        return (
          <g key={z.id}>
            <ZoneRect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              $active={active}
              $assigned={assigned}
            />
            <ZoneText x={r.x + r.w / 2} y={r.y + 0.02}>
              {z.name}
            </ZoneText>
          </g>
        )
      })}
    </OverlaySvg>
  )
}

const OverlaySvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
`

const ZoneRect = styled.rect<{ $active: boolean; $assigned: boolean }>`
  fill: ${(p) =>
    p.$active
      ? 'rgba(0, 230, 140, 0.14)'
      : p.$assigned
        ? 'rgba(90, 160, 255, 0.1)'
        : 'rgba(255, 200, 80, 0.06)'};
  stroke: ${(p) =>
    p.$active ? '#00e090' : p.$assigned ? '#5aa0ff' : '#ffc85088'};
  stroke-width: 0.0035;
  stroke-dasharray: ${(p) => (p.$assigned ? 'none' : '0.012 0.008')};
`

const ZoneText = styled.text`
  fill: rgba(230, 240, 255, 0.75);
  font-size: 0.038px;
  text-anchor: middle;
  font-family: system-ui, sans-serif;
`
