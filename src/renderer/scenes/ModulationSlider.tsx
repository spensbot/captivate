import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { DefaultParam, paramDisplayName } from '../../shared/params'
import { LfoShape } from '../../shared/oscillator'
import {
  useActiveLightScene,
  useBaseParams,
  useDmxSelector,
  useModParam,
  useTypedSelector,
} from '../redux/store'
import { hideVisSplitUi, splitDisplayName } from './splitUiVisibility'
import { setModulation } from '../redux/controlSlice'
import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import { indexArray } from 'shared/util'
import { getAllParamKeys } from 'renderer/redux/dmxSlice'
import { listAtmosFxtrs } from '../../shared/atmosphericsMapping'
import {
  auxColorParamAllowed,
  getSplitAuxColorGates,
} from '../../shared/splitAuxColorGates'

interface Props {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
}

const INTER_MOD_PREFIX = 'intermod:lfo:'
const INTER_MOD_TARGET_PROPS = [
  'period',
  'phaseShift',
  'flip',
  'skew',
  'sinePeakWidth',
  'rampCurve',
  'squareDuty',
  'sawFlatten',
  'noiseSeed',
  'audioBandLowHz',
  'audioBandHighHz',
  'audioThreshold',
  'audioMax',
  'audioAttack',
  'audioDecay',
  'audioEnergySmoothing',
  'audioBandSmoothing',
] as const

function makeInterModParam(targetIndex: number, prop: (typeof INTER_MOD_TARGET_PROPS)[number]) {
  return `${INTER_MOD_PREFIX}${targetIndex}:${prop}`
}

function parseInterModParam(
  param: string
): { targetIndex: number; prop: string } | null {
  if (!param.startsWith(INTER_MOD_PREFIX)) return null
  const [targetRaw, prop] = param.slice(INTER_MOD_PREFIX.length).split(':')
  const targetIndex = Number(targetRaw)
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || !prop) return null
  return { targetIndex, prop }
}

const INTER_MOD_PROP_LABELS: Record<string, string> = {
  period: 'Rate',
  phaseShift: 'Phase',
  flip: 'Flip',
  skew: 'Skew',
  sinePeakWidth: 'Sine Peak Width',
  rampCurve: 'Ramp Curve',
  squareDuty: 'Pulse Width',
  sawFlatten: 'Saw Flatten',
  noiseSeed: 'Noise Seed',
  audioBandLowHz: 'Audio Low Cutoff',
  audioBandHighHz: 'Audio High Cutoff',
  audioThreshold: 'Audio Threshold',
  audioMax: 'Audio Max Level',
  audioAttack: 'Audio Attack',
  audioDecay: 'Audio Decay',
  audioEnergySmoothing: 'Audio Smoothing',
  audioBandSmoothing: 'Audio Band Smoothing',
}

function interModPropOnlyLabel(prop: string): string {
  return INTER_MOD_PROP_LABELS[prop] ?? prop
}

function lfoShapeDisplayName(shape: LfoShape): string {
  switch (shape) {
    case LfoShape.Ramp:
      return 'Ramp'
    case LfoShape.Sin:
      return 'Sine'
    case LfoShape.Square:
      return 'Square'
    case LfoShape.Saw:
      return 'Saw'
    case LfoShape.Noise:
      return 'Noise'
    case LfoShape.AudioBand:
      return 'Audio Band'
    case LfoShape.AudioEnergy:
      return 'Audio Energy'
    default:
      return 'LFO'
  }
}

/** e.g. third Saw in the list → "Saw 3" */
function lfoTypeOrdinalLabel(shapes: LfoShape[], targetIndex: number): string {
  const shape = shapes[targetIndex]
  if (shape === undefined) {
    return `LFO ${targetIndex + 1}`
  }
  let ordinal = 0
  for (let i = 0; i <= targetIndex; i++) {
    if (shapes[i] === shape) {
      ordinal++
    }
  }
  return `${lfoShapeDisplayName(shape)} ${ordinal}`
}

function interModLabel(param: string): string {
  const parsed = parseInterModParam(param)
  if (parsed === null) {
    return paramDisplayName(param)
  }
  const propLabel = interModPropOnlyLabel(parsed.prop)
  return `LFO ${parsed.targetIndex + 1} ${propLabel}`
}

function interModPropsForShape(shape: LfoShape): (typeof INTER_MOD_TARGET_PROPS)[number][] {
  const common: (typeof INTER_MOD_TARGET_PROPS)[number][] = [
    'period',
    'phaseShift',
    'flip',
    'skew',
  ]

  if (shape === LfoShape.Sin) return [...common, 'sinePeakWidth']
  if (shape === LfoShape.Ramp) return [...common, 'rampCurve']
  if (shape === LfoShape.Square) return [...common, 'squareDuty']
  if (shape === LfoShape.Saw) return [...common, 'sawFlatten']
  if (shape === LfoShape.Noise) return [...common, 'noiseSeed']
  if (shape === LfoShape.AudioBand) {
    return [
      ...common,
      'audioBandLowHz',
      'audioBandHighHz',
      'audioThreshold',
      'audioMax',
      'audioAttack',
      'audioDecay',
      'audioBandSmoothing',
    ]
  }
  if (shape === LfoShape.AudioEnergy) {
    return [...common, 'audioThreshold', 'audioMax', 'audioEnergySmoothing']
  }
  return common
}

export default function ModulationSlider({
  splitIndex,
  modIndex,
  param,
}: Props) {
  const modVal = useModParam(param, modIndex, splitIndex)
  const dispatch = useDispatch()
  const shapes = useActiveLightScene((scene) =>
    scene.modulators.map((m) => m.lfo.shape)
  )
  const splitGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.groups ?? {}
  )
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({ splitIndex, param, modIndex, value: x }))
  })

  const parsedIm = parseInterModParam(param)
  const stripTitle =
    parsedIm !== null
      ? `${lfoTypeOrdinalLabel(shapes, parsedIm.targetIndex)} · ${interModPropOnlyLabel(parsedIm.prop)}`
      : `${splitDisplayName(splitIndex, splitGroups)} · ${interModLabel(param)}`

  if (modVal === undefined) {
    return null
  }

  const width = Math.abs(modVal - 0.5)
  const left = modVal > 0.5 ? 0.5 : modVal

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      <StripHeader>
        <span>{stripTitle}</span>
      </StripHeader>
      <Amount
        style={{
          left: `${left * 100}%`,
          width: `${width * 100}%`,
        }}
      ></Amount>
    </Root>
  )
}

export function AddModulationButton({ modIndex }: { modIndex: number }) {
  const [open, setOpen] = useState(false)

  return (
    <Root
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          setOpen(true)
        }
      }}
    >
      +
      {open && (
        <Popup
          title="Add Modulation"
          onClose={() => setOpen(false)}
          cardWidth="min(72rem, calc(100vw - 2rem))"
          cardMaxHeight="calc(100vh - 3rem)"
        >
          <AddModulation modIndex={modIndex} />
        </Popup>
      )}
    </Root>
  )
}

function AddModulation({ modIndex }: { modIndex: number }) {
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const splitGroupsByIndex = useActiveLightScene((scene) =>
    scene.splitScenes.map((s) => s.groups)
  )

  return (
    <AddModLayout>
      <AddModSplitsScroll>
        {indexArray(numSplits).map((splitIndex) => {
          if (
            hideVisSplitUi(
              videoEnabled,
              splitGroupsByIndex[splitIndex]
            )
          ) {
            return null
          }
          return (
            <ParamsGroup
              key={`split-${splitIndex}-mod-${modIndex}`}
              splitIndex={splitIndex}
              modIndex={modIndex}
            />
          )
        })}
      </AddModSplitsScroll>
      <InterModSection modIndex={modIndex} />
    </AddModLayout>
  )
}

const AddModLayout = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  max-height: min(70vh, 38rem);
  min-height: 0;
  gap: 0.75rem;
  padding: 0.25rem 0.1rem 0.1rem 0.1rem;
  box-sizing: border-box;
`

const AddModSplitsScroll = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 0.7rem;
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
`

function ParamsGroup({
  splitIndex,
  modIndex,
}: {
  splitIndex: number
  modIndex: number
}) {
  const baseParams = useBaseParams(splitIndex)
  const dmx = useDmxSelector((state) => state)
  const allParamKeys = useDmxSelector((dmx) => getAllParamKeys(dmx))
  const splitGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.groups ?? {}
  )
  const excludedLfoParams = new Set<string>([
    'xMirror',
    'moverFloorLock',
    'moverSpread',
    'moverMirrorX',
    'moverMirrorY',
    'moverMode',
  ])

  const atmosFixtureIdSet = useMemo(
    () =>
      new Set(
        listAtmosFxtrs(dmx).map((fixture) => fixture.fixtureId)
      ),
    [dmx]
  )
  const auxColorGates = useMemo(
    () => getSplitAuxColorGates(dmx, splitGroups, atmosFixtureIdSet),
    [atmosFixtureIdSet, dmx, splitGroups]
  )

  return (
    <Group>
      <GroupHeader>{splitDisplayName(splitIndex, splitGroups)}</GroupHeader>
      <ParamTable>
        {allParamKeys.map((param) => {
          if (excludedLfoParams.has(param)) return null
          if (baseParams[param] === undefined) return null
          if (!auxColorParamAllowed(param, auxColorGates)) return null
          return (
            <ParamEditor
              key={splitIndex + param + modIndex}
              modIndex={modIndex}
              splitIndex={splitIndex}
              param={param}
            />
          )
        })}
      </ParamTable>
    </Group>
  )
}

function InterModSection({ modIndex }: { modIndex: number }) {
  const modulatorShapes = useActiveLightScene((scene) =>
    scene.modulators.map((modulator) => modulator.lfo.shape)
  )
  const numSplits = useActiveLightScene((scene) => scene.splitScenes.length)

  const targetRows = modulatorShapes
    .map((shape, targetIndex) => ({ shape, targetIndex }))
    .filter(({ targetIndex }) => targetIndex !== modIndex)

  if (targetRows.length === 0 || numSplits <= 0) {
    return null
  }

  return (
    <InterModPanel>
      <InterModPanelTitle>LFO Inter-Modulation</InterModPanelTitle>
      <InterModTable>
        {targetRows.map(({ shape, targetIndex }) => (
          <InterModRow key={`intermod-row-${targetIndex}`}>
            <InterModRowTitle>
              {lfoTypeOrdinalLabel(modulatorShapes, targetIndex)}
            </InterModRowTitle>
            <InterModRowCells>
              {interModPropsForShape(shape).map((prop) => {
                const paramKey = makeInterModParam(targetIndex, prop)
                return (
                  <InterModParamEditor
                    key={paramKey}
                    modIndex={modIndex}
                    param={paramKey}
                  />
                )
              })}
            </InterModRowCells>
          </InterModRow>
        ))}
      </InterModTable>
    </InterModPanel>
  )
}

function InterModParamEditor({
  modIndex,
  param,
}: {
  modIndex: number
  param: string
}) {
  const dispatch = useDispatch()
  const isActive = useActiveLightScene((scene) => {
    const im = scene.modulators[modIndex]?.lfoInterModulation
    return im !== undefined && im[param] !== undefined
  })
  const parsed = parseInterModParam(param)
  const label =
    parsed !== null ? interModPropOnlyLabel(parsed.prop) : paramDisplayName(param)

  return (
    <Item
      $active={isActive}
      onClick={() => {
        const next = isActive ? undefined : 1
        dispatch(
          setModulation({
            splitIndex: 0,
            modIndex,
            param,
            value: next,
          })
        )
      }}
    >
      <span>{label}</span>
      <StateBadge $active={isActive}>{isActive ? 'On' : 'Off'}</StateBadge>
    </Item>
  )
}

function ParamEditor({
  splitIndex,
  modIndex,
  param,
}: {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
}) {
  const modVal = useModParam(param, modIndex, splitIndex)
  const dispatch = useDispatch()

  return (
    <Item
      $active={modVal !== undefined}
      onClick={() => {
        if (param)
          dispatch(
            setModulation({
              splitIndex,
              modIndex,
              param,
              value: modVal === undefined ? 1 : undefined,
            })
          )
      }}
    >
      <span>{interModLabel(param)}</span>
      <StateBadge $active={modVal !== undefined}>
        {modVal !== undefined ? 'On' : 'Off'}
      </StateBadge>
    </Item>
  )
}

const Root = styled.div`
  position: relative;
  user-select: none;
  text-align: center;
  background-color: #ffffff08;
  border-bottom: 1px solid #fff1;
  color: #fff7;
  font-size: 0.8rem;
  cursor: ew-resize;
`

const StripHeader = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.06rem;
  padding: 0.1rem 0.25rem 0.06rem;
  line-height: 1.15;
  position: relative;
  z-index: 1;
`

const Amount = styled.div`
  background-color: #aaf3;
  position: absolute;
  top: 0;
  bottom: 0;
`

const Item = styled.button<{ $active: boolean }>`
  cursor: pointer;
  color: ${(props) => props.theme.colors.text.primary};
  border: 1px solid
    ${(props) => (props.$active ? '#7ba4ff99' : props.theme.colors.divider)};
  background: ${(props) => (props.$active ? '#3357b922' : props.theme.colors.bg.primary)};
  border-radius: 0.32rem;
  min-height: 2rem;
  padding: 0.32rem 0.45rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.74rem;
  text-align: left;

  :hover {
    border-color: ${(props) => (props.$active ? '#a7c1ffcc' : '#ffffff66')};
  }
`

const GroupHeader = styled.div`
  margin-bottom: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.secondary};
  padding-bottom: 0.24rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const Group = styled.div`
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.38rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 0.45rem 0.48rem;
  box-sizing: border-box;
`

const ParamTable = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.32rem;
`

const InterModPanel = styled.div`
  flex: 0 0 auto;
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.divider};
  border-radius: 0.38rem;
  background: ${(props) => props.theme.colors.bg.darker};
  padding: 0.45rem 0.48rem;
  box-sizing: border-box;
`

const InterModPanelTitle = styled.div`
  margin-bottom: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.secondary};
  padding-bottom: 0.24rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
`

const InterModTable = styled.div`
  display: flex;
  flex-direction: column;
`

const InterModRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.4rem 0.55rem;
  padding: 0.38rem 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.divider};
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  &:first-of-type {
    padding-top: 0;
  }
`

const InterModRowTitle = styled.div`
  flex: 0 0 6.75rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text.primary};
  padding-top: 0.38rem;
  line-height: 1.2;
`

const InterModRowCells = styled.div`
  flex: 1 1 12rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  min-width: 0;
`

const StateBadge = styled.span<{ $active: boolean }>`
  min-width: 2.15rem;
  text-align: center;
  font-size: 0.64rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.16rem 0.34rem;
  border: 1px solid ${(props) => (props.$active ? '#8eb2ff77' : '#ffffff33')};
  color: ${(props) => (props.$active ? '#d8e6ff' : '#bfc8d8')};
  background: ${(props) => (props.$active ? '#4a70d033' : '#0006')};
`
