import {
  setAutoSceneBombacity,
  setMaster,
  setBaseParam,
  setPeriod,
  setActiveSceneIndex,
} from '../../../renderer/redux/controlSlice'
import { AllowedMidiActions, Config } from '../shared/actions'

import { createMidiConfig } from './handleMidi'

export default createMidiConfig<AllowedMidiActions, Config<AllowedMidiActions>>(
  {
    buttons: {
      setActiveSceneIndex: {
        set: ({ action }, { dispatch }) => {
          dispatch(setActiveSceneIndex(action))
        },
        key: (action) => action.type + action.sceneType + action.val.toString(),
      },

      TapTempo: {
        set: (_, { tapTempo }) => {
          tapTempo()
        },
      },
    },
    range: {
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
        key: (action) => action.type + action.paramKey,
        get: ({ action }, { state }) =>
          state.control.light.byId[state.control.light.active]?.splitScenes[0]
            .baseParams[action.paramKey] || 0.5,
        set: ({ action, newVal }, { dispatch }) => {
          dispatch(
            setBaseParam({
              splitIndex: 0,
              paramKey: action.paramKey,
              value: newVal,
            })
          )
        },
      },
      SetBPM: {
        get: (_, { rt_state }) => rt_state.time.bpm,
        set: ({ newVal }, { nodeLink }) => {
          nodeLink.setTempo(newVal)
        },
      },
      TapTempo: {
        set: (_, { tapTempo }) => {
          tapTempo()
        },
      },
      setPeriod: {
        key: (action) => `${action.type}:${action.sceneId}:${action.index}`,
        set: ({ action, newVal }, { dispatch }) => {
          dispatch(
            setPeriod({
              ...action,
              newVal: newVal,
            })
          )
        },
      },
    },
  }
)
