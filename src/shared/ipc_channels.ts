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
  get_recent_projects: 'get_recent_projects',
  record_recent_project: 'record_recent_project',
  clear_recent_projects: 'clear_recent_projects',
  get_app_settings: 'get_app_settings',
  set_app_settings: 'set_app_settings',
  read_text_file: 'read_text_file',
  write_text_file: 'write_text_file',
  load_fixture_library_default: 'load_fixture_library_default',
  save_fixture_library_default: 'save_fixture_library_default',
  get_fixture_library_default_path: 'get_fixture_library_default_path',
  open_visualizer: 'open_visualizer',
  open_page_window: 'open_page_window',
  reconcile_video_enabled: 'reconcile_video_enabled',
  /** Primary renderer → main: sync Extras menu checkbox for LED sidebar visibility. */
  sync_led_sidebar_menu: 'sync_led_sidebar_menu',
  sync_autosave_menu: 'sync_autosave_menu',
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
  /** List connected displays for choosing where a detached window opens. */
  list_screen_displays: 'list_screen_displays',
  wled_discover_controllers: 'wled_discover_controllers',
  wled_probe_controller: 'wled_probe_controller',
  audio_engine_metrics: 'audio_engine_metrics',
  diagnostics_event: 'diagnostics_event',
  telemetry_mark: 'telemetry_mark',
  telemetry_get_snapshot: 'telemetry_get_snapshot',
  telemetry_export_snapshot: 'telemetry_export_snapshot',
  telemetry_export_debug_log: 'telemetry_export_debug_log',
  app_about_info: 'app_about_info',
  /** Visualizer → main: downsampled RGBA frame for stage pixel mapping. */
  visualizer_stage_light_map: 'visualizer_stage_light_map',
  /** Main renderer → main: fetch latest stage light map for split UI preview. */
  stage_light_map_preview_get: 'stage_light_map_preview_get',
  /** Laser window → main: register / arm DAC session (ILDA or IDN). */
  laser_dac_connect: 'laser_dac_connect',
  laser_dac_disconnect: 'laser_dac_disconnect',
  laser_dac_stop_output: 'laser_dac_stop_output',
  laser_dac_status: 'laser_dac_status',
  /** Laser window → main: stream sampled frame (throttled in renderer). */
  laser_dac_push_frame: 'laser_dac_push_frame',
  /** Laser window → main: enumerate USB/network DAC devices for setup wizard. */
  laser_dac_list_devices: 'laser_dac_list_devices',
  remote_control_get_status: 'remote_control_get_status',
  remote_control_apply_settings: 'remote_control_apply_settings',
  remote_control_regenerate_pin: 'remote_control_regenerate_pin',
  submit_fixture_to_community_library: 'submit_fixture_to_community_library',
  fixture_library_submit_progress: 'fixture_library_submit_progress',
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
interface SaveAs {
  type: 'save-as'
}
interface Load {
  type: 'load'
}
interface ToggleAutosave {
  type: 'toggle-autosave'
}
interface LoadFixtureDatabase {
  type: 'load-fixture-database'
}
interface SaveFixtureDatabase {
  type: 'save-fixture-database'
}
interface SaveFixtureDatabaseAs {
  type: 'save-fixture-database-as'
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
interface LoadRecentProject {
  type: 'load-recent-project'
  path: string
}
interface ClearRecentProjects {
  type: 'clear-recent-projects'
}
interface OpenSettings {
  type: 'open-settings'
}
export type MainCommand =
  | Undo
  | Redo
  | Save
  | SaveAs
  | Load
  | ToggleAutosave
  | LoadFixtureDatabase
  | SaveFixtureDatabase
  | SaveFixtureDatabaseAs
  | NewProject
  | About
  | SetLedSidebarEnabled
  | LoadRecentProject
  | ClearRecentProjects
  | OpenSettings
