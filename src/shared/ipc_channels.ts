export default {
  new_time_state: 'new_time_state',
  dmx_connection_update: 'dmx_connection_update',
  midi_connection_update: 'midi_connection_update',
  new_control_state: 'new_control_state',
  user_command: 'user_command',
  dispatch: 'dispatch',
  load_file: 'load_file',
  save_file: 'save_file',
  save_scene_config: 'save_scene_config',
  load_scene_config: 'load_scene_config',
  fetch_scenes: 'fetch_scenes',
  put_scenes: 'put_scenes',
  open_visualizer: 'open_visualizer',
  get_local_filepaths: 'get_local_filepaths',
  main_command: 'main_command',
} as const

export interface SetLinkEnabled {
  type: 'SetLinkEnabled'
  isEnabled: boolean
}
export interface IncrementTempo {
  type: 'IncrementTempo'
  amount: number
}

export interface EnableStartStopSync {
  type: 'EnableStartStopSync'
  isEnabled: boolean
}

export interface SetIsPlaying {
  type: 'SetIsPlaying'
  isPlaying: boolean
}

export interface SetBPM {
  type: 'SetBPM'
  bpm: number
}

export interface TapTempo {
  type: 'TapTempo'
}

// Redux Action-like commands Renderer -> Main
export type UserCommand =
  | SetLinkEnabled
  | IncrementTempo
  | EnableStartStopSync
  | SetIsPlaying
  | SetBPM
  | TapTempo

interface Undo {
  type: 'undo'
}
interface Redo {
  type: 'redo'
}
interface Save {
  type: 'save'
}
interface Load {
  type: 'load'
}
interface NewProject {
  type: 'new-project'
}
interface LEDFx {
  type: 'ledfx-url'
}
interface SceneSelect {
  type: 'scene-select'
}
export type MainCommand =
  | Undo
  | Redo
  | Save
  | Load
  | NewProject
  | LEDFx
  | SceneSelect
