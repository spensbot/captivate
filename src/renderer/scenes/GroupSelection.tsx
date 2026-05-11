import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import RemoveIcon from '@mui/icons-material/Remove'
import TuneIcon from '@mui/icons-material/Tune'
import { useState } from 'react'
import {
  useActiveLightScene,
  useDmxSelector,
  useTypedSelector,
} from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import {
  removeSplitSceneByIndex,
  setSceneGroup,
} from 'renderer/redux/controlSlice'
import { universeHasMovers } from 'shared/dmxFixtures'
import { getSortedGroupsFromPlacedFixtures } from 'shared/dmxUtil'
import { listAtmosFxtrs } from 'shared/atmosphericsMapping'
import { showVisGroupUi, splitDisplayName } from './splitUiVisibility'
import SplitModShapingModal from './SplitModShapingModal'

interface Props {
  splitIndex: number
}

export default function GroupSelection({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const [modShapingOpen, setModShapingOpen] = useState(false)
  const videoEnabled = useTypedSelector((state) => state.gui.videoEnabled)
  const showVisualizerGroup = showVisGroupUi(videoEnabled)
  const dmx = useDmxSelector((dmx) => dmx)
  const hasMoverFixtures = universeHasMovers(
    dmx.universe,
    dmx.fixtureTypesByID
  )
  let availableGroups = getSortedGroupsFromPlacedFixtures(
    dmx.universe,
    dmx.fixtureTypesByID
  )
  const hasAtmosphericsInUniverse =
    listAtmosFxtrs(dmx).length > 0
  const ledGroups = dmx.led.ledFixtures
    .flatMap((fixture) => fixture.groups)
    .map((group) => group.trim())
    .filter((group) => group.length > 0)
  const activeGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.groups ?? {}
  )
  const hasSplitModShaping = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex]?.splitModShaping !== undefined
  )
  const entries = Object.entries(activeGroups)

  let allAvailableGroups = new Set(availableGroups)
  for (const group of ledGroups) {
    allAvailableGroups.add(group)
  }
  if (showVisualizerGroup) {
    allAvailableGroups.add('Visualizer')
  }
  if (hasMoverFixtures) {
    allAvailableGroups.add('Movers')
  }
  if (hasAtmosphericsInUniverse) {
    allAvailableGroups.add('Atmosphere')
  }
  for (const [group, _] of entries) {
    if (!showVisualizerGroup && group === 'Visualizer') {
      continue
    }
    allAvailableGroups.add(group)
  }
  availableGroups = Array.from(allAvailableGroups)
    .filter(
      (group) =>
        (showVisualizerGroup || group !== 'Visualizer') &&
        (hasMoverFixtures ||
          group !== 'Movers' ||
          activeGroups.Movers !== undefined)
    )
    .sort((a, b) => (a > b ? 1 : -1))

  const splitHeading = splitDisplayName(splitIndex, activeGroups)

  return (
    <Root>
      {splitIndex > 0 && (
        <IconButton
          size="small"
          sx={{ flexShrink: 0 }}
          onClick={(e) => {
            e.preventDefault()
            dispatch(removeSplitSceneByIndex(splitIndex))
          }}
        >
          <RemoveIcon />
        </IconButton>
      )}
      <GroupName title={splitHeading}>{splitHeading}</GroupName>
      <IconToolbar>
        <IconButton
          size="small"
          sx={{ flexShrink: 0 }}
          onClick={(e) => {
            e.preventDefault()
            setIsOpen(true)
          }}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Split modulation modifiers"
          title="Modulation for this split only: invert, phase offset, stair-step"
          onClick={(e) => {
            e.preventDefault()
            setModShapingOpen(true)
          }}
          sx={{
            flexShrink: 0,
            color: hasSplitModShaping ? '#8eb0ff' : undefined,
            '& .MuiSvgIcon-root': {
              opacity: hasSplitModShaping ? 1 : 0.92,
            },
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>
      </IconToolbar>
      {isOpen && (
        <Popup title="Select Groups" onClose={() => setIsOpen(false)}>
          {availableGroups.map((group) => {
            const activeState = activeGroups[group]
            return (
              <AvailableGroup
                activeState={activeState}
                key={group}
                onClick={() => {
                  let next =
                    activeState === undefined
                      ? true
                      : activeState === true
                      ? false
                      : undefined
                  dispatch(
                    setSceneGroup({
                      index: splitIndex,
                      group,
                      val: next,
                    })
                  )
                }}
              >
                {`${activeState === false ? 'not ' : ''}${group}`}
              </AvailableGroup>
            )
          })}
        </Popup>
      )}
      {modShapingOpen && (
        <Popup
          title={`${splitHeading} — modulation modifiers`}
          onClose={() => setModShapingOpen(false)}
          cardWidth="min(28rem, calc(100vw - 2rem))"
        >
          <SplitModShapingModal
            splitIndex={splitIndex}
            onClose={() => setModShapingOpen(false)}
          />
        </Popup>
      )}
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0.15rem 0.35rem 0 0;
`

const IconToolbar = styled.div`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`

const GroupName = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  margin-right: 0.35rem;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const AvailableGroup = styled.div<{ activeState: boolean | undefined }>`
  cursor: pointer;
  /* :hover {
    text-decoration: ${(props) =>
    props.activeState === false ? 'line-through' : 'underline'};
  } */
  color: ${(props) =>
    props.activeState === undefined && props.theme.colors.text.secondary};
  margin-bottom: 1rem;
`
