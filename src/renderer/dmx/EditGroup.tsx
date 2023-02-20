import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import { TextField } from '@mui/material'
import { useState } from 'react'
import { useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import {
  addActiveFixtureTypeGroup,
  removeActiveFixtureTypeGroup,
} from '../redux/dmxSlice'
import { Button } from '@mui/material'
import { getSortedGroups, getSortedGroupsForFixtureType } from 'shared/dmxUtil'

interface Props {}

export default function EditGroups({}: Props) {
  const dispatch = useDispatch()
  const [newGroup, setNewGroup] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dmx = useDmxSelector((dmx) => dmx)
  const fixtureGroups =
    dmx.activeFixtureType === null
      ? []
      : getSortedGroupsForFixtureType(
          dmx.fixtureTypesByID[dmx.activeFixtureType]
        )
  const allGroups = getSortedGroups(
    dmx.universe,
    dmx.fixtureTypes,
    dmx.fixtureTypesByID
  )

  return (
    <Root>
      <GroupName>{`${fixtureGroups.join(', ')}`}</GroupName>
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
        <Popup title="Edit Groups" onClose={() => setIsOpen(false)}>
          {allGroups.map((group) => {
            const isActive =
              fixtureGroups.find((g) => g === group) !== undefined
            return (
              <AvailableGroup
                isActive={isActive}
                key={group}
                onClick={() => {
                  if (isActive) {
                    dispatch(removeActiveFixtureTypeGroup(group))
                  } else {
                    dispatch(addActiveFixtureTypeGroup(group))
                  }
                }}
              >
                {group}
              </AvailableGroup>
            )
          })}
          <TextField
            size="small"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
          />
          <Button
            disabled={newGroup.length < 1}
            onClick={() => dispatch(addActiveFixtureTypeGroup(newGroup))}
          >
            Add
          </Button>
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

const AvailableGroup = styled.div<{ isActive: boolean }>`
  cursor: pointer;
  :hover {
    text-decoration: ${(props) =>
      props.isActive ? 'line-through' : 'underline'};
  }
  color: ${(props) => !props.isActive && props.theme.colors.text.secondary};
  margin-bottom: 1rem;
`
