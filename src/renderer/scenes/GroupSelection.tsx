import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import RemoveIcon from '@mui/icons-material/Remove'
import { useState } from 'react'
import { useActiveLightScene, useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import {
  removeSplitSceneByIndex,
  setSceneGroup,
} from 'renderer/redux/controlSlice'
import { getSortedGroups } from 'shared/dmxUtil'

interface Props {
  splitIndex: number
}

export default function GroupSelection({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const dmx = useDmxSelector((dmx) => dmx)
  let availableGroups = getSortedGroups(
    dmx.universe,
    dmx.fixtureTypes,
    dmx.fixtureTypesByID
  )
  const activeGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex].groups
  )
  const entries = Object.entries(activeGroups)

  let allAvailableGroups = new Set(availableGroups)
  for (const [group, _] of entries) {
    allAvailableGroups.add(group)
  }
  availableGroups = Array.from(allAvailableGroups)

  const activeGroupsString = entries
    .map(([group, inclusive]) => `${inclusive ? '' : 'not'} ${group}`)
    .join(', ')

  return (
    <Root>
      {splitIndex > 0 && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.preventDefault()
            dispatch(removeSplitSceneByIndex(splitIndex))
          }}
        >
          <RemoveIcon />
        </IconButton>
      )}
      <GroupName>
        {entries.length > 0 ? `${activeGroupsString}` : `all`}
      </GroupName>
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen(true)
        }}
      >
        <EditIcon />
      </IconButton>
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
    </Root>
  )
}

const Root = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const GroupName = styled.div`
  margin-right: 0.5rem;
  font-size: 1rem;
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
