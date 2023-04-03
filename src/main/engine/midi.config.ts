import {
  setAutoSceneBombacity,
  setMaster,
  setBaseParams,
  setPeriod,
  setActiveSceneIndex,
} from '../../renderer/redux/controlSlice'

import { MidiConfig } from 'main/engine/handleMidi'

const createMidiConfig = <T extends MidiConfig>(t: T) => {
  return t
}

export default createMidiConfig({
  buttons: {
    setActiveSceneIndex: {
      set: ({ action }, { dispatch }) => {
        dispatch(
          setActiveSceneIndex({
            sceneType: action.sceneType,
            val: action.index,
          })
        )
      },
    },
    tapTempo: {
      set: (_, { tapTempo }) => {
        tapTempo()
      },
    },
  },
  sliders: {
    setAutoSceneBombacity: {
      get: (_, { state }) => state.control.light.auto.epicness,
      set: ({ newVal }, { dispatch }) =>
        dispatch(
          setAutoSceneBombacity({
            sceneType: 'light',
            val: newVal,
          })
        ),
    },
    setMaster: {
      get: (_, { state }) => state.control.master,
      set: ({ newVal }, { dispatch }) => dispatch(setMaster(newVal)),
    },
    setBaseParam: {
      get: (_, { state }) =>
        state.control.light.byId[state.control.light.active]?.splitScenes[0]
          .baseParams[action.paramKey] || 0.5,
      set: ({ action, newVal }, { dispatch }) => {
        dispatch(
          setBaseParams({
            splitIndex: 0,
            params: {
              [action.paramKey]: newVal,
            },
          })
        )
      },
    },
    setBpm: {
      get: (_, { rt_state }) => rt_state.time.bpm,
      set: ({ newVal }, { nodeLink }) => {
        nodeLink.setTempo(newVal)
      },
    },
    tapTempo: {
      set: (_, { tapTempo }) => {
        tapTempo()
      },
    },
    setModulationParam: {
      period: {
        set: ({ action, newVal }, { dispatch }) => {
          dispatch(
            setPeriod({
              index: action.index,
              newVal: newVal,
              sceneId: action.sceneId,
            })
          )
        },
      },
    },
  },
})
