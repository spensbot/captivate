import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  Fixture,
  FixtureType,
  Universe,
  fixtureTypes,
  fixtureTypesByID,
  getTestUniverse,
  FixtureChannel,
} from '../../engine/dmxFixtures'
import { clampNormalized } from '../../util/util'

export interface DmxState {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: { [id: string]: FixtureType }
  editedFixture: null | string
  selectedFixture: null | number
  groups: string[]
}

interface SetFixtureWindowPayload {
  x: number
  y: number
  index: number
}

interface IncrementFixtureWindowPayload {
  dWidth: number
  dHeight: number
  index: number
}

interface SetFixtureWindowEnabledPayload {
  dimension: 'x' | 'y'
  index: number
  isEnabled: boolean
}

export function initDmxState(): DmxState {
  return {
    universe: getTestUniverse(),
    fixtureTypes: fixtureTypes,
    fixtureTypesByID: fixtureTypesByID,
    editedFixture: null,
    selectedFixture: null,
    groups: [],
  }
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initDmxState(),
  reducers: {
    resetDmxState: (state, { payload }: PayloadAction<DmxState>) => {
      state = payload
    },
    setSelectedFixture: (state, { payload }: PayloadAction<number>) => {
      state.selectedFixture = payload
    },
    addFixture: (state, { payload }: PayloadAction<Fixture>) => {
      state.universe.push(payload)
      state.universe.sort((a, b) => a.ch - b.ch)
      state.selectedFixture = state.universe.findIndex(
        (fixture) => fixture.ch == payload.ch
      )
    },
    removeFixture: (state, { payload }: PayloadAction<number>) => {
      state.selectedFixture = null
      state.universe.splice(payload, 1)
    },
    setFixtureWindow: (
      state,
      { payload }: PayloadAction<SetFixtureWindowPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (window.x) {
        window.x.pos = payload.x
      }
      if (window.y) {
        window.y.pos = payload.y
      }
    },
    setFixtureWindowEnabled: (
      state,
      { payload }: PayloadAction<SetFixtureWindowEnabledPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (payload.isEnabled) {
        window[payload.dimension] = {
          pos: 0.5,
          width: 0,
        }
      } else {
        delete window[payload.dimension]
      }
    },
    incrementFixtureWindow: (
      state,
      { payload }: PayloadAction<IncrementFixtureWindowPayload>
    ) => {
      const window = state.universe[payload.index].window
      if (window.x) {
        window.x.width = clampNormalized(window.x.width + payload.dWidth)
      }
      if (window.y) {
        window.y.width = clampNormalized(window.y.width + payload.dHeight)
      }
    },
    setSelectedFixtureGroups: (state, { payload }: PayloadAction<string[]>) => {
      const i = state.selectedFixture
      if (i === null) {
        console.error('i === null')
        return
      }
      if (state.universe[i] === undefined) {
        console.warn(state.universe[i] === undefined)
        return
      }
      state.universe[i].groups = payload
    },
    setEditedFixture: (state, { payload }: PayloadAction<null | string>) => {
      state.editedFixture = payload
    },
    addFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      state.fixtureTypes.push(payload.id)
      state.fixtureTypesByID[payload.id] = payload
      state.editedFixture = payload.id
    },
    updateFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      state.fixtureTypesByID[payload.id] = payload
    },
    addFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        newChannel: FixtureChannel
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels.push(
        payload.newChannel
      )
    },
    editFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        channelIndex: number
        newChannel: FixtureChannel
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels[payload.channelIndex] =
        payload.newChannel
    },
    removeFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        channelIndex: number
      }>
    ) => {
      state.fixtureTypesByID[payload.fixtureID].channels.splice(
        payload.channelIndex,
        1
      )
    },
    reorderFixtureChannel: (
      state,
      {
        payload,
      }: PayloadAction<{
        fixtureID: string
        fromIndex: number
        toIndex: number
      }>
    ) => {
      const fixture = state.fixtureTypesByID[payload.fixtureID]
      let element = fixture.channels.splice(payload.fromIndex, 1)[0]
      fixture.channels.splice(payload.toIndex, 0, element)
    },
    deleteFixtureType: (state, { payload }: PayloadAction<string>) => {
      let index = state.fixtureTypes.indexOf(payload)
      if (index !== -1) {
        state.fixtureTypes.splice(index, 1)
      }
      delete state.fixtureTypesByID[payload]
      state.editedFixture = null
    },
    setGroups: (state, { payload }: PayloadAction<string[]>) => {
      state.groups = payload
    },
  },
})

export const {
  resetDmxState,
  setSelectedFixture,
  setEditedFixture,
  setFixtureWindow,
  setFixtureWindowEnabled,
  setSelectedFixtureGroups,
  incrementFixtureWindow,
  addFixture,
  removeFixture,
  addFixtureType,
  updateFixtureType,
  deleteFixtureType,
  addFixtureChannel,
  editFixtureChannel,
  removeFixtureChannel,
  reorderFixtureChannel,
  setGroups,
} = dmxSlice.actions

export default dmxSlice.reducer
