import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  Fixture,
  FixtureType,
  Universe,
  fixtureTypes,
  fixtureTypesByID,
  getTestUniverse,
  FixtureChannel,
  getSortedGroups,
  ColorMapColor,
} from '../../shared/dmxFixtures'
import { clampNormalized } from '../../shared/util'

export interface DmxState {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: { [id: string]: FixtureType }
  activeFixtureType: null | string
  activeFixture: null | number
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
    activeFixtureType: null,
    activeFixture: null,
    groups: [],
  }
}

export const dmxSlice = createSlice({
  name: 'dmx',
  initialState: initDmxState(),
  reducers: {
    setSelectedFixture: (state, { payload }: PayloadAction<number>) => {
      state.activeFixture = payload
    },
    addFixture: (state, { payload }: PayloadAction<Fixture>) => {
      state.universe.push(payload)
      state.universe.sort((a, b) => a.ch - b.ch)
      state.activeFixture = state.universe.findIndex(
        (fixture) => fixture.ch == payload.ch
      )
    },
    removeFixture: (state, { payload }: PayloadAction<number>) => {
      state.activeFixture = null
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
    setGroupForActiveFixture: (
      state,
      { payload }: PayloadAction<string | null>
    ) => {
      const i = state.activeFixture
      if (i === null) {
        console.error('active fixture index === null')
        return
      }
      if (state.universe[i] === undefined) {
        console.warn('active fixture === null')
        return
      }
      if (payload === null) {
        state.universe[i].groups = []
      } else {
        state.universe[i].groups = [payload]
      }
      state.groups = getSortedGroups(state.universe)
    },
    setGroupForAllFixturesOfActiveType: (
      state,
      { payload }: PayloadAction<string | null>
    ) => {
      const activeType = state.activeFixtureType
      for (const fixture of state.universe) {
        if (fixture.type === activeType) {
          if (payload === null) {
            fixture.groups = []
          } else {
            fixture.groups = [payload]
          }
        }
      }
      state.groups = getSortedGroups(state.universe)
    },
    setEditedFixture: (state, { payload }: PayloadAction<null | string>) => {
      state.activeFixtureType = payload
    },
    addFixtureType: (state, { payload }: PayloadAction<FixtureType>) => {
      state.fixtureTypes.push(payload.id)
      state.fixtureTypesByID[payload.id] = payload
      state.activeFixtureType = payload.id
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
      state.activeFixtureType = null
    },
    addColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex },
      }: PayloadAction<{ fixtureTypeId: string; channelIndex: number }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        const lastColorMax = channel.colors[channel.colors.length - 1]?.max
        channel.colors.push({
          max: lastColorMax ?? 0,
          hue: 0,
        })
      } else {
        console.error(
          `Tried to addColorMapColor to non-coloMap channel: ${channelIndex}`
        )
      }
    },
    removeColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex },
      }: PayloadAction<{ fixtureTypeId: string; channelIndex: number }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        channel.colors.pop()
      } else {
        console.error(
          `Tried to removeColorMapColor to non-colorMap channel: ${channelIndex}`
        )
      }
    },
    setColorMapColor: (
      state,
      {
        payload: { fixtureTypeId, channelIndex, colorIndex, newColor },
      }: PayloadAction<{
        fixtureTypeId: string
        channelIndex: number
        colorIndex: number
        newColor: ColorMapColor
      }>
    ) => {
      const activeFixtureType = state.fixtureTypesByID[fixtureTypeId]
      const channel = activeFixtureType.channels[channelIndex]
      if (channel.type === 'colorMap') {
        channel.colors[colorIndex] = newColor
      } else {
        console.error(
          `Tried to setColorMapColor to non-colorMap channel: ${channelIndex}`
        )
      }
    },
  },
})

export const {
  setSelectedFixture,
  setEditedFixture,
  setFixtureWindow,
  setFixtureWindowEnabled,
  setGroupForActiveFixture,
  setGroupForAllFixturesOfActiveType,
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
  addColorMapColor,
  removeColorMapColor,
  setColorMapColor,
} = dmxSlice.actions

export default dmxSlice.reducer
