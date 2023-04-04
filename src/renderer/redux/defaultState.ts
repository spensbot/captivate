import defaultSave from './defaultSave.json'
import { SaveState } from 'features/fileSaving/shared/save'
import initState from './initState'
import { CleanReduxState } from './store'

export default function defaultState(): CleanReduxState {
  const save = defaultSave as SaveState
  const state = initState()
  if (save.device) state.control.device = save.device
  if (save.dmx) state.dmx = save.dmx
  if (save.light) state.control.light = save.light
  if (save.visual) state.control.visual = save.visual
  return state
}
