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
  addSceneGroup,
  removeSceneGroup,
} from 'renderer/redux/controlSlice'
import { getSortedGroups } from 'shared/dmxUtil'

interface Props {
  splitIndex: number
}

export default function GroupSelection({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const universe = useDmxSelector((dmx) => dmx.universe)
  const fixtureTypesById = useDmxSelector((dmx) => dmx.fixtureTypesByID)
  const availableGroups = getSortedGroups(universe, fixtureTypesById)
  const activeGroups = useActiveLightScene(
    (scene) => scene.splitScenes[splitIndex].groups
  )

  const activeGroupsString = activeGroups.join(', ')

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
        {activeGroups.length > 0 ? `${activeGroupsString}` : `all`}
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
            const isActive = activeGroups.includes(group)
            const payload = {
              index: splitIndex,
              group,
            }
            return (
              <AvailableGroup
                key={group}
                style={
                  isActive
                    ? {}
                    : { opacity: 0.5, textDecoration: 'line-through' }
                }
                onClick={() =>
                  isActive
                    ? dispatch(removeSceneGroup(payload))
                    : dispatch(addSceneGroup(payload))
                }
              >
                {group}
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

const AvailableGroup = styled.div`
  cursor: pointer;
  :hover {
    text-decoration: underline;
  }
  margin-bottom: 1rem;
`
