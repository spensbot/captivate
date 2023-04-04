import { useDmxSelector } from 'renderer/redux/store'
import { useDispatch } from 'react-redux'
import {
  addActiveFixtureTypeGroup,
  removeActiveFixtureTypeGroup,
} from '../redux/dmxSlice'
import { getSortedGroups, getSortedGroupsForFixtureType } from 'features/dmx/shared/dmxUtil'
import GroupPicker from 'features/ui/react/base/GroupPicker'

interface Props {}

export default function EditGroups({}: Props) {
  const dispatch = useDispatch()
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
    <GroupPicker
      groups={fixtureGroups}
      availableGroups={allGroups}
      addGroup={(g) => dispatch(addActiveFixtureTypeGroup(g))}
      removeGroup={(g) => dispatch(removeActiveFixtureTypeGroup(g))}
    />
  )
}
