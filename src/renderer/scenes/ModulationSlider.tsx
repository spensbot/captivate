import { useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { DefaultParam, paramDisplayName } from '../../shared/params'
import {
  useActiveLightScene,
  useBaseParams,
  useDmxSelector,
  useModParam,
  useTypedSelector,
} from '../redux/store'
import { hideVisSplitUi } from './splitUiVisibility'
import { setModulation } from '../redux/controlSlice'
import useDragMapped from '../hooks/useDragMapped'
import styled from 'styled-components'
import Popup from 'renderer/base/Popup'
import { indexArray } from 'shared/util'
import { getAllParamKeys } from 'renderer/redux/dmxSlice'
import { getAtmosphericsFixtureDescriptors } from '../../shared/atmosphericsMapping'
import {
  auxColorParamAllowed,
  getSplitAuxColorGates,
} from '../../shared/splitAuxColorGates'

interface Props {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
}

export default function ModulationSlider({
  splitIndex,
  modIndex,
  param,
}: Props) {
  const modVal = useModParam(param, modIndex, splitIndex)
  const dispatch = useDispatch()
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({ splitIndex, param, modIndex, value: x }))
  })

  if (modVal === undefined) {
    return null
  }

  const width = Math.abs(modVal - 0.5)
  const left = modVal > 0.5 ? 0.5 : modVal

  return (
    <Root ref={dragContainer} onMouseDown={onMouseDown}>
      {`Split ${splitIndex + 1} ${paramDisplayName(param)}`}
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
    <AddModRoot>
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
    </AddModRoot>
  )
}

const AddModRoot = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 0.7rem;
  width: 100%;
  max-width: 100%;
  max-height: min(70vh, 38rem);
  overflow: auto;
  padding: 0.25rem 0.1rem 0.1rem 0.1rem;
  box-sizing: border-box;
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
  const entries = Object.entries(splitGroups).sort(([a], [b]) =>
    a.localeCompare(b)
  )
  const groupLabel =
    entries.length > 0
      ? entries.map(([group, include]) => `${include === false ? 'not ' : ''}${group}`).join(', ')
      : 'all'
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
        getAtmosphericsFixtureDescriptors(dmx).map((fixture) => fixture.fixtureId)
      ),
    [dmx]
  )
  const auxColorGates = useMemo(
    () => getSplitAuxColorGates(dmx, splitGroups, atmosFixtureIdSet),
    [atmosFixtureIdSet, dmx, splitGroups]
  )

  return (
    <Group>
      <GroupHeader>{groupLabel}</GroupHeader>
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
      <span>{paramDisplayName(param)}</span>
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
