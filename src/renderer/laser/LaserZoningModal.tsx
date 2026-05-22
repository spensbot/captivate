import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import type { LaserDacProfile, LaserProjectionZone } from '../../shared/laserFixtureRouting'
import { createDefaultProjectionZone } from '../../shared/laserFixtureRouting'
import { normalizeZoneRect as normRect } from './laserProjectionZoneMath'

export interface LaserZoningModalProps {
  open: boolean
  onClose: () => void
  profile: LaserDacProfile
  onSave: (next: LaserDacProfile) => void
  /** zoneId → fixture names assigned to that zone */
  zoneFixtureLabels?: Record<string, string[]>
}

export default function LaserZoningModal({
  open,
  onClose,
  profile,
  onSave,
  zoneFixtureLabels = {},
}: LaserZoningModalProps) {
  const [local, setLocal] = useState(profile)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    profile.zones[0]?.id ?? null
  )

  useEffect(() => {
    if (!open) return
    setLocal(profile)
    setSelectedZoneId(profile.zones[0]?.id ?? null)
  }, [open, profile])

  const selectedZone = useMemo(
    () => local.zones.find((z) => z.id === selectedZoneId) ?? null,
    [local.zones, selectedZoneId]
  )

  const updateZone = (zoneId: string, patch: Partial<LaserProjectionZone>) => {
    setLocal((prev) => ({
      ...prev,
      zones: prev.zones.map((z) =>
        z.id === zoneId ? { ...z, ...patch, rect: { ...z.rect, ...(patch.rect ?? {}) } } : z
      ),
    }))
  }

  const updateZoneRect = (
    zoneId: string,
    key: keyof LaserProjectionZone['rect'],
    value: number
  ) => {
    const z = local.zones.find((x) => x.id === zoneId)
    if (!z) return
    updateZone(zoneId, { rect: normRect({ ...z.rect, [key]: value }) })
  }

  const addZone = () => {
    const nz = createDefaultProjectionZone(local.zones.length + 1)
    setLocal((prev) => ({ ...prev, zones: [...prev.zones, nz] }))
    setSelectedZoneId(nz.id)
  }

  const removeZone = (zoneId: string) => {
    setLocal((prev) => {
      const next = prev.zones.filter((z) => z.id !== zoneId)
      return {
        ...prev,
        zones: next.length > 0 ? next : [createDefaultProjectionZone(1)],
      }
    })
    setSelectedZoneId((cur) => {
      if (cur !== zoneId) return cur
      const remain = local.zones.filter((z) => z.id !== zoneId)
      return remain[0]?.id ?? null
    })
  }

  const handleSave = () => {
    onSave({
      ...local,
      zones: local.zones.map((z) => ({
        ...z,
        rect: normRect(z.rect),
      })),
    })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Projection zones — {local.name}</DialogTitle>
      <DialogContent>
        <Intro>
          One ILDA DAC can drive multiple physical lasers when each scanner is assigned a
          zone on the shared projection canvas (similar to Quick Show). Content drawn in a
          zone is mapped to that fixture&apos;s scanners.
        </Intro>
        <Layout>
          <CanvasPanel>
            <CanvasSvg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet">
              <CanvasBg />
              {local.zones.map((z) => {
                const r = normRect(z.rect)
                const active = z.id === selectedZoneId
                return (
                  <g key={z.id}>
                    <ZoneRect
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      $active={active}
                      onClick={() => setSelectedZoneId(z.id)}
                    />
                    <ZoneLabel x={r.x + r.w / 2} y={r.y + r.h / 2}>
                      {z.name}
                    </ZoneLabel>
                  </g>
                )
              })}
            </CanvasSvg>
          </CanvasPanel>
          <Side>
            <SideHead>
              <span>Zones</span>
              <TinyIconBtn type="button" onClick={addZone} title="Add zone">
                <AddIcon fontSize="inherit" />
              </TinyIconBtn>
            </SideHead>
            <ZoneList>
              {local.zones.map((z) => (
                <ZoneListBtn
                  key={z.id}
                  type="button"
                  $active={z.id === selectedZoneId}
                  onClick={() => setSelectedZoneId(z.id)}
                >
                  {z.name}
                  {(zoneFixtureLabels[z.id]?.length ?? 0) > 0
                    ? ` · ${zoneFixtureLabels[z.id]!.join(', ')}`
                    : ''}
                </ZoneListBtn>
              ))}
            </ZoneList>
            {selectedZone ? (
              <Editor>
                <FieldLabel>Zone name</FieldLabel>
                <TextIn
                  value={selectedZone.name}
                  onChange={(e) =>
                    updateZone(selectedZone.id, { name: e.target.value })
                  }
                />
                {(
                  [
                    ['x', 'Left', 0, 1],
                    ['y', 'Top', 0, 1],
                    ['w', 'Width', 0.02, 1],
                    ['h', 'Height', 0.02, 1],
                  ] as const
                ).map(([key, label, min, max]) => (
                  <SliderField key={key}>
                    <SliderLab>
                      {label}{' '}
                      <Val>
                        {selectedZone.rect[key].toFixed(3)}
                      </Val>
                    </SliderLab>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={0.005}
                      value={selectedZone.rect[key]}
                      onChange={(e) =>
                        updateZoneRect(
                          selectedZone.id,
                          key,
                          Number(e.target.value)
                        )
                      }
                    />
                  </SliderField>
                ))}
                <SliderField>
                  <SliderLab>
                    Priority{' '}
                    <Val>{selectedZone.priority ?? 0}</Val>
                  </SliderLab>
                  <input
                    type="range"
                    min={0}
                    max={16}
                    step={1}
                    value={selectedZone.priority ?? 0}
                    onChange={(e) =>
                      updateZone(selectedZone.id, {
                        priority: Number(e.target.value),
                      })
                    }
                  />
                </SliderField>
                <SafetyToggleRow>
                  <span>Clip outside zone</span>
                  <input
                    type="checkbox"
                    checked={selectedZone.clipOutside !== false}
                    onChange={(e) =>
                      updateZone(selectedZone.id, {
                        clipOutside: e.target.checked,
                      })
                    }
                  />
                </SafetyToggleRow>
                <DangerBtn
                  type="button"
                  onClick={() => removeZone(selectedZone.id)}
                  disabled={local.zones.length <= 1}
                >
                  <DeleteOutlineIcon fontSize="inherit" />
                  Remove zone
                </DangerBtn>
              </Editor>
            ) : null}
          </Side>
        </Layout>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save zones
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const Intro = styled.p`
  font-size: 0.72rem;
  color: ${(p) => p.theme.colors.text.secondary};
  margin: 0 0 0.65rem;
  line-height: 1.35;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(11rem, 13rem);
  gap: 0.75rem;
  align-items: start;
`

const CanvasPanel = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: #0a0c12;
  aspect-ratio: 16 / 9;
  min-height: 12rem;
`

const CanvasSvg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`

const CanvasBg = styled.rect.attrs({ x: 0, y: 0, width: 1, height: 1 })`
  fill: #12151c;
`

const ZoneRect = styled.rect<{ $active: boolean }>`
  fill: ${(p) => (p.$active ? 'rgba(0, 220, 140, 0.22)' : 'rgba(80, 160, 255, 0.12)')};
  stroke: ${(p) => (p.$active ? '#00e090' : '#5aa0ff')};
  stroke-width: 0.004;
  cursor: pointer;
`

const ZoneLabel = styled.text`
  fill: #e8eef8;
  font-size: 0.045px;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
  font-family: system-ui, sans-serif;
`

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
`

const SideHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  font-weight: 600;
`

const TinyIconBtn = styled.button`
  border: none;
  background: transparent;
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  padding: 0.1rem;
  display: flex;
`

const ZoneList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`

const ZoneListBtn = styled.button<{ $active: boolean }>`
  text-align: left;
  border: 1px solid
    ${(p) => (p.$active ? p.theme.colors.text.primary : p.theme.colors.divider)};
  border-radius: 0.25rem;
  background: ${(p) =>
    p.$active ? p.theme.colors.bg.lighter : p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.64rem;
  padding: 0.2rem 0.35rem;
  cursor: pointer;
`

const Editor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.25rem;
`

const FieldLabel = styled.label`
  font-size: 0.64rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const TextIn = styled.input`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.25rem;
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  font-size: 0.68rem;
  padding: 0.2rem 0.35rem;
`

const SliderField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  font-size: 0.62rem;
  input {
    width: 100%;
  }
`

const SliderLab = styled.div`
  color: ${(p) => p.theme.colors.text.secondary};
`

const Val = styled.span`
  color: ${(p) => p.theme.colors.text.primary};
`

const SafetyToggleRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.64rem;
  color: ${(p) => p.theme.colors.text.secondary};
  cursor: pointer;
`

const DangerBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-top: 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.25rem;
  background: transparent;
  color: ${(p) => p.theme.colors.text.secondary};
  font-size: 0.62rem;
  padding: 0.18rem 0.35rem;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
`
