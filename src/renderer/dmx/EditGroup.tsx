import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import { TextField } from '@mui/material'
import { useState } from 'react'
import { useDmxSelector } from 'renderer/redux/store'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { useDispatch } from 'react-redux'
import { setGroupForAllFixturesOfActiveType } from '../redux/dmxSlice'
import { Button } from '@mui/material'
import { getSortedGroups } from 'shared/dmxUtil'

interface Props {}

export default function EditGroup({}: Props) {
  const dispatch = useDispatch()
  const [newGroup, setNewGroup] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const activeFixtureTypeID = useDmxSelector((dmx) => dmx.activeFixtureType)
  const universe = useDmxSelector((dmx) => dmx.universe)
  const fixtureGroupString = useDmxSelector((dmx) => {
    const groupSet: Set<string> = new Set()
    for (const fixture of dmx.universe) {
      if (fixture.type === activeFixtureTypeID) {
        groupSet.add(fixture.group)
      }
    }
    const groups = Array.from(groupSet)
    if (groups.length < 1) {
      return 'unused'
    } else if (groups.length === 1) {
      return groups[0]
    } else {
      return 'Various'
    }
  })
  const groups = getSortedGroups(universe)

  return (
    <Root>
      <GroupName>{`${fixtureGroupString}`}</GroupName>
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
        <Popup title="Edit Group" onClose={() => setIsOpen(false)}>
          {groups.map((group) => (
            <AvailableGroup
              key={group}
              onClick={() =>
                dispatch(setGroupForAllFixturesOfActiveType(group))
              }
            >
              {group}
            </AvailableGroup>
          ))}
          <TextField
            size="small"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
          />
          <Button
            disabled={newGroup.length < 1}
            onClick={() =>
              dispatch(setGroupForAllFixturesOfActiveType(newGroup))
            }
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

const AvailableGroup = styled.div`
  cursor: pointer;
  :hover {
    text-decoration: underline;
  }
  margin-bottom: 1rem;
`
