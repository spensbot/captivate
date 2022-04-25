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
  toggleMainGroups,
} from 'renderer/redux/controlSlice'

interface Props {
  splitIndex: number | null
}

export default function GroupSelection({ splitIndex }: Props) {
  const dispatch = useDispatch()
  const [isOpen, setIsOpen] = useState(false)
  const availableGroups = [...useDmxSelector((dmx) => dmx.groups)]
  const activeGroups = useActiveLightScene((scene) =>
    splitIndex === null ? scene.groups : scene.splitScenes[splitIndex].groups
  )

  if (activeGroups === null)
    return (
      <Disabled
        onClick={() => {
          dispatch(toggleMainGroups())
        }}
      >
        Groups
      </Disabled>
    )

  const activeGroupsString = activeGroups.join(', ')

  return (
    <Root>
      <IconButton
        size="small"
        onClick={(e) => {
          e.preventDefault()
          if (splitIndex === null) {
            dispatch(toggleMainGroups())
          } else {
            dispatch(removeSplitSceneByIndex(splitIndex))
          }
        }}
      >
        <RemoveIcon />
      </IconButton>
      <GroupName>
        {activeGroups.length > 0
          ? `Groups: ${activeGroupsString}`
          : `No Groups`}
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

const Disabled = styled.div`
  color: ${(props) => props.theme.colors.text.secondary};
  text-decoration: underline;
  :hover {
    color: ${(props) => props.theme.colors.text.primary};
  }
`

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
