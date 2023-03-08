import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import { TextField } from '@mui/material'
import { useState } from 'react'
import styled from 'styled-components'
import Popup from '../base/Popup'
import { Button } from '@mui/material'
import wrapClick from './wrapClick'

interface Props {
  groups: string[]
  availableGroups: string[]
  addGroup: (newGroup: string) => void
  removeGroup: (newGroup: string) => void
}

export default function GroupPicker({
  groups,
  availableGroups,
  addGroup,
  removeGroup,
}: Props) {
  const [newGroup, setNewGroup] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const groupsText = groups.join(', ')

  return (
    <Root>
      <GroupList>{`${
        groupsText.length > 0 ? groupsText : 'Groups (none)'
      }`}</GroupList>
      <IconButton size="small" onClick={wrapClick(() => setIsOpen(true))}>
        <EditIcon />
      </IconButton>
      {isOpen && (
        <Popup title="Edit Groups" onClose={() => setIsOpen(false)}>
          {availableGroups.map((group) => {
            const isActive = groups.find((g) => g === group) !== undefined
            return (
              <AvailableGroup
                isActive={isActive}
                key={group}
                onClick={() => {
                  if (isActive) {
                    removeGroup(group)
                  } else {
                    addGroup(group)
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
            onClick={() => addGroup(newGroup)}
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

const GroupList = styled.div`
  margin-right: 0.5rem;
  font-size: 0.9rem;
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
