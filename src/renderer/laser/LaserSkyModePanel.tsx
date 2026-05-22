import { useMemo } from 'react'
import styled from 'styled-components'
import type {
  LaserContentMode,
  LaserScene,
  LaserViewportMask,
} from './laserEditorTypes'
import { DEFAULT_LASER_PRESET_PARAMS, LASER_PRESET_CATALOG } from './laserPresetCatalog'

type Props = {
  scene: LaserScene | null
  onPatchScene: (patch: Partial<LaserScene>) => void
}

/** Scene / preset row + mask row: column layout so mask stays visible in preset mode (long first row no longer competes for one flex line). */
const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  padding: 0.38rem 0.48rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  border-radius: 0.38rem;
  background: ${(p) => p.theme.colors.bg.darker};
  flex-shrink: 0;
`

const SceneRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
`

const MaskRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  padding-top: 0.38rem;
  border-top: 1px solid ${(p) => p.theme.colors.divider};
`

const Label = styled.span`
  font-size: 0.64rem;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text.secondary};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`

const Select = styled.select`
  font-size: 0.68rem;
  padding: 0.2rem 0.35rem;
  border-radius: 0.28rem;
  border: 1px solid ${(p) => p.theme.colors.divider};
  background: ${(p) => p.theme.colors.bg.primary};
  color: ${(p) => p.theme.colors.text.primary};
  min-width: 9.5rem;
`

const MiniLab = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  font-size: 0.58rem;
  color: ${(p) => p.theme.colors.text.secondary};
`

const MiniRange = styled.input`
  width: 6.5rem;
`

const ToggleRow = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  font-size: 0.62rem;
  color: ${(p) => p.theme.colors.text.primary};
  cursor: pointer;
`

const Divider = styled.span`
  width: 1px;
  height: 1.4rem;
  background: ${(p) => p.theme.colors.divider};
  margin: 0 0.15rem;
`

const defaultMask = (): LaserViewportMask => ({
  enabled: false,
  x: 0.35,
  y: 0.35,
  w: 0.22,
  h: 0.18,
})

export default function LaserSkyModePanel({ scene, onPatchScene }: Props) {
  if (!scene) return null

  const mode: LaserContentMode = scene.contentMode ?? 'draw'
  const params = { ...DEFAULT_LASER_PRESET_PARAMS, ...scene.presetParams }
  const mask = { ...defaultMask(), ...scene.viewportMask }

  const patchParams = (part: Partial<typeof params>) => {
    onPatchScene({ presetParams: { ...scene.presetParams, ...part } })
  }

  const patchMask = (part: Partial<LaserViewportMask>) => {
    onPatchScene({ viewportMask: { ...mask, ...part } })
  }

  const presetGroups = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, (typeof LASER_PRESET_CATALOG)[number][]>()
    for (const p of LASER_PRESET_CATALOG) {
      if (!map.has(p.group)) {
        map.set(p.group, [])
        order.push(p.group)
      }
      map.get(p.group)!.push(p)
    }
    return order.map((group) => ({ group, presets: map.get(group)! }))
  }, [])

  return (
    <Panel>
      <SceneRow>
        <Label>Scene type</Label>
        <Select
          value={mode}
          onChange={(e) => {
            const v = e.target.value as LaserContentMode
            onPatchScene({
              contentMode: v,
              ...(v === 'preset' && !scene.presetId
                ? { presetId: LASER_PRESET_CATALOG[0]!.id }
                : {}),
            })
          }}
        >
          <option value="preset">Preset (sky-style)</option>
          <option value="draw">Draw / SVG / text</option>
        </Select>

        {mode === 'preset' ? (
          <>
            <Divider aria-hidden />
            <Label>Preset</Label>
            <Select
              value={scene.presetId ?? LASER_PRESET_CATALOG[0]!.id}
              onChange={(e) =>
                onPatchScene({
                  presetId: e.target.value,
                  presetLayerOverrides: {},
                })
              }
            >
              {presetGroups.map(({ group, presets }) => (
                <optgroup key={group} label={group}>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <MiniLab>
              Color
              <input
                type="color"
                value={scene.presetColor ?? '#40ffb8'}
                onChange={(e) => onPatchScene({ presetColor: e.target.value })}
                style={{ width: '2.2rem', height: '1.45rem', padding: 0, border: 'none' }}
              />
            </MiniLab>
            <MiniLab>
              Spread
              <MiniRange
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.spread}
                onChange={(e) => patchParams({ spread: Number(e.target.value) })}
              />
            </MiniLab>
            <MiniLab>
              Density
              <MiniRange
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.density}
                onChange={(e) => patchParams({ density: Number(e.target.value) })}
              />
            </MiniLab>
            <MiniLab>
              Motion
              <MiniRange
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.motion}
                onChange={(e) => patchParams({ motion: Number(e.target.value) })}
              />
            </MiniLab>
            <ToggleRow>
              <input
                type="checkbox"
                checked={scene.presetUseSplitXY !== false}
                onChange={(e) => onPatchScene({ presetUseSplitXY: e.target.checked })}
              />
              Link preset to split XY / window
            </ToggleRow>
          </>
        ) : null}
      </SceneRow>

      <MaskRow>
        <Label>Mask</Label>
        <ToggleRow>
          <input
            type="checkbox"
            checked={mask.enabled}
            onChange={(e) => patchMask({ enabled: e.target.checked })}
          />
          Blank inside rect
        </ToggleRow>
        <ToggleRow>
          <input
            type="checkbox"
            checked={scene.viewportMaskLinkSplit === true}
            onChange={(e) => onPatchScene({ viewportMaskLinkSplit: e.target.checked })}
          />
          Rect follows split XYWH
        </ToggleRow>
        {mask.enabled && !scene.viewportMaskLinkSplit ? (
          <>
            <MiniLab>
              X
              <MiniRange
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={mask.x}
                onChange={(e) => patchMask({ x: Number(e.target.value) })}
              />
            </MiniLab>
            <MiniLab>
              Y
              <MiniRange
                type="range"
                min={0}
                max={1}
                step={0.005}
                value={mask.y}
                onChange={(e) => patchMask({ y: Number(e.target.value) })}
              />
            </MiniLab>
            <MiniLab>
              W
              <MiniRange
                type="range"
                min={0.02}
                max={1}
                step={0.005}
                value={mask.w}
                onChange={(e) => patchMask({ w: Number(e.target.value) })}
              />
            </MiniLab>
            <MiniLab>
              H
              <MiniRange
                type="range"
                min={0.02}
                max={1}
                step={0.005}
                value={mask.h}
                onChange={(e) => patchMask({ h: Number(e.target.value) })}
              />
            </MiniLab>
          </>
        ) : null}
      </MaskRow>
    </Panel>
  )
}
