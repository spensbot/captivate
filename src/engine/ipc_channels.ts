export default {
  new_time_state: 'new_time_state',
  dmx_connection_update: 'dmx_connection_update',
  midi_connection_update: 'midi_connection_update',
  new_control_state: 'new_control_state',
  user_command: 'user_command',
  dispatch: 'dispatch',
  load_file: 'load_file',
  save_file: 'save_file',
} as const

// Add types if we ever need to send commands from the renderer to main
export type UserCommand = null
