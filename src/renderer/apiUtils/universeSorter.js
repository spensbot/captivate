import {
  addFixtureChannel,
  addFixtureType,
  deleteFixtureType,
  setEditedFixture,
  setGroupForAllFixturesOfActiveType,
  updateFixtureType,
} from 'renderer/redux/dmxSlice'
import { initFixtureChannel, initFixtureType } from 'shared/dmxFixtures'
import { store } from 'renderer/redux/store'
import { nanoid } from '@reduxjs/toolkit'

export const universeSorter = (target, data) => {
  switch (target) {
    case 'fixtureType': {
      store.dispatch(addFixtureType(initFixtureType()))
      break
    }
    case 'setEditedFixture': {
      store.dispatch(setEditedFixture(data.id))
      break
    }
    case 'addFixtureChannel': {
      let init = initFixtureChannel(data.channels)
      let fixtureID = nanoid()
      store.dispatch(addFixtureChannel({ fixtureID, newChannels: init }))
      break
    }
    case 'updateFixtureType': {
      let init = [initFixtureChannel(data.channels)]
      data.channels = init

      store.dispatch(updateFixtureType(data))
      break
    }
    case 'setGroupForAllActiveFixtures': {
      store.dispatch(setGroupForAllFixturesOfActiveType(data.groupName))
      break
    }
    case 'deleteFixtureType': {
      store.dispatch(deleteFixtureType(data.id))
      break
    }
    case 'activeFixture': {
      store.dispatch(setEditedFixture(data.id))
      break
    }
    default: {
      throw Error('Invalid property.')
    }
  }
}
