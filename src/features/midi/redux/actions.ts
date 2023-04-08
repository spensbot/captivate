import midiConfig from '../engine/midi.config'
import { MidiActions } from '../shared/actions'

// must uniquely identify an action (for use in a hash table)
// does not need to be human readable. Just unique for a given action
export function getActionID(action: MidiActions) {
  const config =
    midiConfig.buttons[action.type] || midiConfig.range[action.type]
  if (!config) return action.type
  const key = config.key

  if (!key) return action.type

  // TODO: fix this type
  return key(action as any)
}
