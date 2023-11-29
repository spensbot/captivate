import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  Fixture,
  FixtureType,
  Universe,
  FixtureChannel,
  ColorMapColor,
  initSubFixture,
  SubFixture,
} from '../../shared/dmxFixtures'
import { clampNormalized } from '../../math/util'
import { defaultParamsList } from '../../shared/params'
import { initLedState, LedState } from './ledState'
import { initLedFixture, LedFixture } from '../../shared/ledFixtures'
import { Point } from '../../math/point'

export interface DmxState {
  universe: Universe
  fixtureTypes: string[]
  fixtureTypesByID: { [id: string]: FixtureType }
  activeFixtureType: null | string
  activeFixture: null | number
  activeSubFixture: null | number
  led: LedState
}

export function getCustomChannels(dmx: DmxState): Set<string> {
  let result = new Set() as Set<string>

  for (const ftId of dmx.fixtureTypes) {
    for (const ch of dmx.fixtureTypesByID[ftId].channels) {
      if (ch.type === 'custom' && ch.isControllable) {
        result.add(ch.name)
      }
    }
  }

  return result
}

export function getAllParamKeys(dmx: DmxState): string[] {
  return (defaultParamsList as string[]).concat(
    Array.from(getCustomChannels(dmx))
  )
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
    universe: [],
    fixtureTypes: [],
    fixtureTypesByID: {},
    activeFixtureType: null,
    activeFixture: null,
    activeSubFixture: null,
    led: initLedState(),
  }
}

function modifyActiveFixtureType(
  state: DmxState,
  f: (fixtureType: FixtureType) => void
) {
  if (state.activeFixtureType !== null) {
    const fixtureType = state.fixtureTypesByID[state.activeFixtureType]
    f(fixtureType)
  } else {
    console.error(
      `Tried to modifyActiveFixtureType when activeFixtureType is null`
    )
  }
}

function modifyActiveLedFixture(
  state: DmxState,
  f: (ledFixture: LedFixture) => void
) {
  if (state.led.activeFixture !== null) {
    const activeLedFixture = state.led.ledFixtures[state.led.activeFixture]
    f(activeLedFixture)
  } else {
    console.error(
      `Tried to modifyActiveLedFixture when led.activeFixture is null`
    )
  }
}

function add_noDuplicates<T>(t: T, ts: T[]): T[] {
  const set = new Set(ts)
  set.add(t)
  return Array.from(set)
}

function remove_noDuplicates<T>(t: T, ts: T[]): T[] {
  const set = new Set(ts)
  set.delete(t)
  return Array.from(set)
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
    addActiveFixtureTypeGroup: (state, { payload }: PayloadAction<string>) => {
      modifyActiveFixtureType(
        state,
        (ft) => (ft.groups = add_noDuplicates(payload, ft.groups))
      )
    },
    removeActiveFixtureTypeGroup: (
      state,
      { payload }: PayloadAction<string>
    ) => {
      modifyActiveFixtureType(
        state,
        (ft) => (ft.groups = remove_noDuplicates(payload, ft.groups))
      )
    },
    setEditedFixture: (state, { payload }: PayloadAction<null | string>) => {
      state.activeFixtureType = payload
      state.activeSubFixture = null
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
          saturation: 1.0,
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
    addSubFixture: (state, _: PayloadAction<undefined>) => {
      modifyActiveFixtureType(state, (ft) =>
        ft.subFixtures.push(initSubFixture())
      )
    },
    removeSubFixture: (state, { payload }: PayloadAction<number>) => {
      modifyActiveFixtureType(state, (ft) => ft.subFixtures.splice(payload, 1))
      state.activeSubFixture = null
    },
    setActiveSubFixture: (state, { payload }: PayloadAction<number | null>) => {
      state.activeSubFixture = payload
    },
    assignChannelToSubFixture: (
      state,
      {
        payload: { channelIndex, subFixtureIndex },
      }: PayloadAction<{
        channelIndex: number
        subFixtureIndex: number
      }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        for (const subFixture of ft.subFixtures) {
          subFixture.channels = remove_noDuplicates(
            channelIndex,
            subFixture.channels
          )
        }

        ft.subFixtures[subFixtureIndex].channels.push(channelIndex)
      })
    },
    removeChannelFromSubFixtures: (
      state,
      {
        payload: { channelIndex },
      }: PayloadAction<{
        channelIndex: number
      }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        for (const subFixture of ft.subFixtures) {
          subFixture.channels = remove_noDuplicates(
            channelIndex,
            subFixture.channels
          )
        }
      })
    },
    replaceActiveFixtureTypeSubFixture: (
      state,
      {
        payload,
      }: PayloadAction<{ subFixtureIndex: number; subFixture: SubFixture }>
    ) => {
      modifyActiveFixtureType(state, (ft) => {
        ft.subFixtures[payload.subFixtureIndex] = payload.subFixture
      })
    },
    setActiveLedFixture: (state, { payload }: PayloadAction<number | null>) => {
      state.led.activeFixture = payload
    },
    updateActiveLedFixture: (state, { payload }: PayloadAction<LedFixture>) => {
      if (state.led.activeFixture !== null) {
        state.led.ledFixtures[state.led.activeFixture] = payload
      }
    },
    addLedFixture: (state, _: PayloadAction<undefined>) => {
      state.led.ledFixtures.push(initLedFixture())
    },
    removeLedFixture: (state, { payload }: PayloadAction<number>) => {
      state.led.activeFixture = null
      state.led.ledFixtures.splice(payload, 1)
    },
    addLedFixturePoint: (state, { payload }: PayloadAction<Point>) => {
      modifyActiveLedFixture(state, (f) => f.points.push(payload))
    },
    removeLedFixturePoint: (state, { payload }: PayloadAction<number>) => {
      modifyActiveLedFixture(state, (f) => f.points.splice(payload, 1))
    },
    updateLedFixturePoint: (
      state,
      { payload }: PayloadAction<{ index: number; newPoint: Point }>
    ) => {
      modifyActiveLedFixture(
        state,
        (f) => (f.points[payload.index] = payload.newPoint)
      )
    },
  },
})

export const {
  setSelectedFixture,
  setEditedFixture,
  setFixtureWindow,
  setFixtureWindowEnabled,
  incrementFixtureWindow,
  addFixture,
  removeFixture,
  addFixtureType,
  updateFixtureType,
  deleteFixtureType,
  addActiveFixtureTypeGroup,
  removeActiveFixtureTypeGroup,
  addFixtureChannel,
  editFixtureChannel,
  removeFixtureChannel,
  reorderFixtureChannel,
  addColorMapColor,
  removeColorMapColor,
  setColorMapColor,
  addSubFixture,
  removeSubFixture,
  setActiveSubFixture,
  assignChannelToSubFixture,
  removeChannelFromSubFixtures,
  replaceActiveFixtureTypeSubFixture,
  setActiveLedFixture,
  updateActiveLedFixture,
  addLedFixture,
  removeLedFixture,
  addLedFixturePoint,
  removeLedFixturePoint,
  updateLedFixturePoint,
} = dmxSlice.actions

export default dmxSlice.reducer
