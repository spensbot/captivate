import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import type { BeamGradientStop, LaserRgbCapabilities } from './laserEditorTypes'
import {
  BEAM_GRADIENT_PRESETS,
  gateGradientStops,
  gradientPreviewCss,
} from './laserBeamColor'

export interface LaserGradientModalProps {
  open: boolean
  onClose: () => void
  stops: BeamGradientStop[]
  onApply: (next: BeamGradientStop[]) => void
  laserCaps: LaserRgbCapabilities
}

export default function LaserGradientModal({
  open,
  onClose,
  stops,
  onApply,
  laserCaps,
}: LaserGradientModalProps) {
  const [local, setLocal] = useState<BeamGradientStop[]>(stops)

  useEffect(() => {
    if (!open) return
    setLocal(
      stops.length >= 2
        ? stops.map((s) => ({ ...s }))
        : [
            { offset: 0, color: '#ff4040' },
            { offset: 1, color: '#40ff80' },
          ]
    )
  }, [open, stops])

  const previewCss = useMemo(() => gradientPreviewCss(local), [local])

  const updateStop = (i: number, patch: Partial<BeamGradientStop>) => {
    setLocal((prev) =>
      prev.map((s, j) => (j === i ? { ...s, ...patch } : s))
    )
  }

  const addStop = () => {
    setLocal((prev) => {
      const last = prev[prev.length - 1]
      const o = last ? Math.min(0.98, last.offset + 0.08) : 0.5
      return [...prev, { offset: o, color: '#ffffff' }].sort(
        (a, b) => a.offset - b.offset
      )
    })
  }

  const removeStop = (i: number) => {
    setLocal((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i)))
  }

  const applyPreset = (id: string) => {
    const p = BEAM_GRADIENT_PRESETS.find((x) => x.id === id)
    if (p) setLocal(p.stops.map((s) => ({ ...s })))
  }

  const handleSave = () => {
    if (local.length < 2) return
    onApply(gateGradientStops(local, laserCaps))
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Beam gradient</DialogTitle>
      <DialogContent>
        <Body>
          <PreviewBar style={{ background: previewCss }} />
          <PresetRow>
            {BEAM_GRADIENT_PRESETS.map((p) => (
              <PresetChip key={p.id} type="button" onClick={() => applyPreset(p.id)}>
                {p.name}
              </PresetChip>
            ))}
          </PresetRow>
          <StopList>
            {local.map((s, i) => (
              <StopRow key={i}>
                <MiniLab>Pos</MiniLab>
                <MiniNum
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={Math.round(s.offset * 100) / 100}
                  onChange={(e) =>
                    updateStop(i, { offset: Number(e.target.value) || 0 })
                  }
                />
                <ColorInp
                  type="color"
                  value={s.color}
                  onChange={(e) => updateStop(i, { color: e.target.value })}
                />
                <TinyDel
                  type="button"
                  disabled={local.length <= 2}
                  onClick={() => removeStop(i)}
                >
                  ×
                </TinyDel>
              </StopRow>
            ))}
          </StopList>
          <Button size="small" variant="outlined" onClick={addStop}>
            Add stop
          </Button>
          <Help>
            Stops are blended along stroke length. Colors are adjusted for the
            selected laser&apos;s RGBY+ channel capabilities.
          </Help>
        </Body>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={local.length < 2}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-top: 0.35rem;
`

const PreviewBar = styled.div`
  height: 1.75rem;
  border-radius: 0.35rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
`

const PresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
`

const PresetChip = styled.button`
  font-size: 0.68rem;
  padding: 0.18rem 0.42rem;
  border-radius: 999px;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
`

const StopList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`

const StopRow = styled.div`
  display: grid;
  grid-template-columns: 2rem 4.2rem 2.6rem auto;
  align-items: center;
  gap: 0.35rem;
`

const MiniLab = styled.span`
  font-size: 0.65rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const MiniNum = styled.input`
  width: 100%;
  font-size: 0.72rem;
  padding: 0.15rem 0.25rem;
  border-radius: 0.25rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
`

const ColorInp = styled.input`
  width: 2.4rem;
  height: 1.6rem;
  padding: 0;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.25rem;
`

const TinyDel = styled.button`
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 0.25rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.darker};
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
  :disabled {
    opacity: 0.35;
    cursor: default;
  }
`

const Help = styled.p`
  margin: 0;
  font-size: 0.68rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`
