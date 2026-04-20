import { Page } from './pages'

export default {
  new_time_state: 'new_time_state',
  dmx_connection_update: 'dmx_connection_update',
  midi_connection_update: 'midi_connection_update',
  new_control_state: 'new_control_state',
  /** Full Redux snapshot for Lighting 3D preview only (structure + patch). */
  lighting3d_preview_bootstrap: 'lighting3d_preview_bootstrap',
  /** Throttled slim DMX / split / master stream for Lighting 3D preview only. */
  lighting3d_realtime_tick: 'lighting3d_realtime_tick',
  dispatch_to_main: 'dispatch_to_main',
  user_command: 'user_command',
  dispatch: 'dispatch',
  load_file: 'load_file',
  save_file: 'save_file',
  read_text_file: 'read_text_file',
  load_fixture_library_default: 'load_fixture_library_default',
  save_fixture_library_default: 'save_fixture_library_default',
  get_fixture_library_default_path: 'get_fixture_library_default_path',
  open_visualizer: 'open_visualizer',
  open_page_window: 'open_page_window',
  reconcile_video_enabled: 'reconcile_video_enabled',
  /** Primary renderer → main: sync Extras menu checkbox for LED sidebar visibility. */
  sync_led_sidebar_menu: 'sync_led_sidebar_menu',
  app_close_prompt: 'app_close_prompt',
  detached_window_close_prompt: 'detached_window_close_prompt',
  request_app_quit: 'request_app_quit',
  request_window_close: 'request_window_close',
  /** Detached VideoViewport (minimal popout) window: toggle or query OS fullscreen. */
  visualizer_detached_fullscreen: 'visualizer_detached_fullscreen',
  get_local_filepaths: 'get_local_filepaths',
  get_local_directories: 'get_local_directories',
  main_command: 'main_command',
  visualizer_stream_start: 'visualizer_stream_start',
  visualizer_stream_stop: 'visualizer_stream_stop',
  visualizer_stream_state: 'visualizer_stream_state',
  visualizer_stream_health: 'visualizer_stream_health',
  visualizer_stream_relay_start: 'visualizer_stream_relay_start',
  visualizer_stream_relay_stop: 'visualizer_stream_relay_stop',
  visualizer_stream_settings_get: 'visualizer_stream_settings_get',
  visualizer_stream_settings_set: 'visualizer_stream_settings_set',
  visualizer_stream_detect_ndi_runtime: 'visualizer_stream_detect_ndi_runtime',
  visualizer_stream_ndi_list_sources: 'visualizer_stream_ndi_list_sources',
  detect_projectm_runtime: 'detect_projectm_runtime',
  projectm_list_presets: 'projectm_list_presets',
  projectm_list_presets_in_directory: 'projectm_list_presets_in_directory',
  projectm_bridge_status: 'projectm_bridge_status',
  projectm_install_binaries: 'projectm_install_binaries',
  projectm_bridge_init_session: 'projectm_bridge_init_session',
  projectm_bridge_push_audio: 'projectm_bridge_push_audio',
  projectm_bridge_render: 'projectm_bridge_render',
  projectm_bridge_shutdown_session: 'projectm_bridge_shutdown_session',
  get_desktop_audio_source_id: 'get_desktop_audio_source_id',
  get_page_window_media_source_id: 'get_page_window_media_source_id',
  wled_discover_controllers: 'wled_discover_controllers',
  wled_probe_controller: 'wled_probe_controller',
  audio_engine_metrics: 'audio_engine_metrics',
  diagnostics_event: 'diagnostics_event',
  telemetry_mark: 'telemetry_mark',
  telemetry_get_snapshot: 'telemetry_get_snapshot',
  telemetry_export_snapshot: 'telemetry_export_snapshot',
  app_about_info: 'app_about_info',
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

export interface OpenPageWindow {
  type: 'open-page-window'
  page: Page
}

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
interface About {
  type: 'about'
}
interface SetLedSidebarEnabled {
  type: 'set-led-sidebar-enabled'
  enabled: boolean
}
export type MainCommand =
  | Undo
  | Redo
  | Save
  | Load
  | NewProject
  | About
  | SetLedSidebarEnabled
