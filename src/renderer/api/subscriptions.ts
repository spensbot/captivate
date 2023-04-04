import { MainCommand } from '../../features/shared/engine/ipc_channels'
import {
  RealtimeState,
  initRealtimeState,
  realtimeStore,
  update as updateRealtimeStore,
} from '../redux/realtimeStore'
import * as dmxConnection from 'features/dmx/engine/dmxConnection'
import * as midiConnection from 'features/midi/engine/midiConnection'
import { PayloadAction } from '@reduxjs/toolkit'
import { subscribeIpc } from './core/ipcSubscription'
import { getCleanReduxState, store } from '../redux/store'
import { load } from '../../features/fileSaving/react/SaveLoad'
import {
  setDmx,
  setMidi,
  setSaving,
  setLoading,
  setNewProjectDialog,
} from '../redux/guiSlice'
import {
  getUndoGroup,
  undoAction,
  redoAction,
} from '../../features/scenes/react/controls/UndoRedo'
import { getSaveConfig } from 'features/fileSaving/shared/save'
import * as mutations from './mutations'
import { autoSave } from '../../features/fileSaving/react/autosave'
import { animationLoop } from 'features/shared/react'

type Emissions = {
  main_command: [command: MainCommand]
  dispatch: [action: PayloadAction<any>]
  new_time_state: [realtimeState: RealtimeState]
  midi_connection_update: [payload: midiConnection.UpdatePayload]
  dmx_connection_update: [payload: dmxConnection.UpdatePayload]
}

type Context = {
  store: typeof store
}

export const subcribe = ({ store }: Context) => {
  let _frequentlyUpdatedRealtimeState = initRealtimeState()

  const getUpatedRealtimeState = () => _frequentlyUpdatedRealtimeState

  autoSave(store)

  subscribeIpc<Emissions>({
    dmx_connection_update: (payload) => {
      store.dispatch(setDmx(payload))
    },
    midi_connection_update: (payload) => {
      store.dispatch(setMidi(payload))
    },
    new_time_state: (newRealtimeState) => {
      _frequentlyUpdatedRealtimeState = newRealtimeState
    },
    dispatch: (action) => {
      store.dispatch(action)
    },
    main_command: (command) => {
      const getGroup = () => getUndoGroup(store.getState())
      if (command.type === 'undo') {
        const group = getGroup()
        if (group !== null) {
          store.dispatch(undoAction(group))
        }
      } else if (command.type === 'redo') {
        const group = getGroup()
        if (group !== null) {
          store.dispatch(redoAction(group))
        }
      } else if (command.type === 'load') {
        load()
          .then((state) =>
            store.dispatch(
              setLoading({
                state,
                config: getSaveConfig(state),
              })
            )
          )
          .catch((err) => console.warn(err))
      } else if (command.type === 'save') {
        store.dispatch(setSaving(true))
      } else if (command.type === 'new-project') {
        store.dispatch(setNewProjectDialog(true))
      }
    },
  })

  animationLoop(() => {
    realtimeStore.dispatch(
      updateRealtimeStore(getUpatedRealtimeState())
    )
  })

  mutations.send_control_state(getCleanReduxState(store.getState()))

  store.subscribe(() =>
    mutations.send_control_state(getCleanReduxState(store.getState()))
  )
}
