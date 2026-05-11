import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import type { LaserShapeLayer, SvgImportMode } from './laserEditorTypes'
import {
  applySvgPlacementScale,
  parseSvgToSubpaths,
  subpathsToLaserLayers,
  type SvgSubpath,
} from './laserEditorSvgImport'

export interface LaserSvgImportDialogProps {
  open: boolean
  onClose: () => void
  beamColor: string
  onAccept: (layers: LaserShapeLayer[]) => void
}

export default function LaserSvgImportDialog({
  open,
  onClose,
  beamColor,
  onAccept,
}: LaserSvgImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<SvgImportMode>('byElement')
  const [baseSubpaths, setBaseSubpaths] = useState<SvgSubpath[]>([])
  const [scale, setScale] = useState(1)

  const reparse = useCallback((text: string, m: SvgImportMode) => {
    try {
      const sp = parseSvgToSubpaths(text, m)
      setBaseSubpaths(sp)
      setParseError(null)
      if (sp.length === 0) {
        setParseError('No drawable paths found in this SVG.')
      }
    } catch (e) {
      setBaseSubpaths([])
      setParseError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setRawText(null)
      setParseError(null)
      setBaseSubpaths([])
      setScale(1)
      setMode('byElement')
    }
  }, [open])

  useEffect(() => {
    if (rawText !== null) {
      reparse(rawText, mode)
    }
  }, [rawText, mode, reparse])

  const previewSubpaths = useMemo(
    () => applySvgPlacementScale(baseSubpaths, scale),
    [baseSubpaths, scale]
  )

  const onPickFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const t = typeof reader.result === 'string' ? reader.result : null
      if (t) {
        setRawText(t)
      }
    }
    reader.readAsText(f)
  }

  const handleAccept = () => {
    if (previewSubpaths.length === 0) return
    const layers = subpathsToLaserLayers(previewSubpaths, beamColor)
    if (layers.length === 0) return
    onAccept(layers)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import SVG</DialogTitle>
      <DialogContent>
        <Body>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            style={{ display: 'none' }}
            onChange={onPickFile}
          />
          <Row>
            <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()}>
              Choose SVG file…
            </Button>
            {rawText !== null && (
              <FileHint>Loaded ({Math.round(rawText.length / 1024)} KB)</FileHint>
            )}
          </Row>
          {parseError !== null && <ErrorLine>{parseError}</ErrorLine>}
          <FieldLabel>Layering</FieldLabel>
          <RadioCol>
            <label>
              <input
                type="radio"
                name="svgMode"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
              />
              Single layer (merge all strokes)
            </label>
            <label>
              <input
                type="radio"
                name="svgMode"
                checked={mode === 'byGroup'}
                onChange={() => setMode('byGroup')}
              />
              One layer per top-level &lt;g&gt; (merge paths inside each group)
            </label>
            <label>
              <input
                type="radio"
                name="svgMode"
                checked={mode === 'byElement'}
                onChange={() => setMode('byElement')}
              />
              Split: one layer per path / line / shape
            </label>
          </RadioCol>
          <FieldLabel>Placement scale ({scale.toFixed(2)}×)</FieldLabel>
          <ScaleRow>
            <ScaleRange
              type="range"
              min={0.15}
              max={2.5}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              disabled={baseSubpaths.length === 0}
            />
          </ScaleRow>
          <FieldLabel>Preview (normalized canvas)</FieldLabel>
          <PreviewBox>
            <PreviewSvg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet">
              <rect width="1" height="1" fill="#0a0a0a" />
              <g
                fill="none"
                stroke={beamColor}
                strokeWidth={0.004}
                vectorEffect="non-scaling-stroke"
              >
                {previewSubpaths.map((sp, i) => (
                  <polyline
                    key={i}
                    points={sp.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                ))}
              </g>
            </PreviewSvg>
          </PreviewBox>
          <Help>
            After import, layers use the current beam color. Scale centers on the middle of
            the frame; geometry is clamped to the drawable area.
          </Help>
        </Body>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAccept}
          disabled={previewSubpaths.length === 0}
        >
          Place layers
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-top: 0.25rem;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const FileHint = styled.span`
  font-size: 0.75rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const ErrorLine = styled.div`
  font-size: 0.78rem;
  color: #e88;
`

const FieldLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text.secondary};
`

const RadioCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: ${(p) => p.theme.colors.text.primary};

  label {
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
    cursor: pointer;
  }
`

const ScaleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const ScaleRange = styled.input`
  flex: 1 1 auto;
`

const PreviewBox = styled.div`
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.35rem;
  background: #000;
  aspect-ratio: 1;
  max-height: 14rem;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
`

const PreviewSvg = styled.svg`
  width: 100%;
  height: 100%;
  display: block;
`

const Help = styled.p`
  margin: 0;
  font-size: 0.7rem;
  color: ${(p) => p.theme.colors.text.secondary};
  line-height: 1.35;
`
