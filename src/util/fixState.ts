import { ReduxState } from '../redux/store'

export default function (oldState: ReduxState) {
  if (oldState.gui.videos === undefined) oldState.gui.videos = []
  if (oldState.gui.text === undefined) oldState.gui.text = []
  if (oldState.dmx.overwrites === undefined) oldState.dmx.overwrites = []
  return oldState
}