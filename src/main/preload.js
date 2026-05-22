const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping')
    },
    send(channel, ...args) {
      const validChannels = [
        'new_control_state',
        'lighting3d_preview_bootstrap',
        'dispatch_to_main',
        'user_command',
        'open_visualizer',
        'open_page_window',
        'reconcile_video_enabled',
        'sync_led_sidebar_menu',
        'audio_engine_metrics',
        'diagnostics_event',
        'telemetry_mark',
        'visualizer_stage_light_map',
        'laser_dac_push_frame',
      ]
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      } else {
        console.error(
          `Tried to send ipc through an invalid channel: ${channel}`
        )
      }
    },
    on(channel, func) {
      const validChannels = [
        'new_time_state',
        'new_midi_message',
        'dmx_connection_update',
        'midi_connection_update',
        'dispatch',
        'new_control_state',
        'lighting3d_preview_bootstrap',
        'lighting3d_realtime_tick',
        'new_time_state',
        'new_visualizer_state',
        'main_command',
        'app_close_prompt',
        'detached_window_close_prompt',
      ]
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => {
          func(...args)
        })
      } else {
        console.error(
          `Tried to recieve ipc through an invalid channel: ${channel}`
        )
      }
    },
    once(channel, func) {
      const validChannels = ['ipc-example']
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args))
      } else {
        console.error(
          `Tried to recieve ipc through an invalid channel: ${channel}`
        )
      }
    },
    invoke(channel, ...args) {
      const validChannels = [
        'save_file',
        'load_file',
        'read_text_file',
        'get_local_filepaths',
        'get_local_directories',
        'load_fixture_library_default',
        'save_fixture_library_default',
        'get_fixture_library_default_path',
        'visualizer_stream_start',
        'visualizer_stream_stop',
        'visualizer_stream_state',
        'visualizer_stream_health',
        'visualizer_stream_relay_start',
        'visualizer_stream_relay_stop',
        'visualizer_stream_settings_get',
        'visualizer_stream_settings_set',
        'visualizer_stream_detect_ndi_runtime',
        'visualizer_stream_ndi_list_sources',
        'detect_projectm_runtime',
        'projectm_list_presets',
        'projectm_list_presets_in_directory',
        'projectm_bridge_status',
        'projectm_install_binaries',
        'projectm_bridge_init_session',
        'projectm_bridge_push_audio',
        'projectm_bridge_render',
        'projectm_bridge_shutdown_session',
        'get_desktop_audio_source_id',
        'get_page_window_media_source_id',
        'list_screen_displays',
        'wled_discover_controllers',
        'wled_probe_controller',
        'request_app_quit',
        'request_window_close',
        'visualizer_detached_fullscreen',
        'telemetry_get_snapshot',
        'telemetry_export_snapshot',
        'app_about_info',
        'stage_light_map_preview_get',
        'laser_dac_connect',
        'laser_dac_disconnect',
        'laser_dac_status',
        'remote_control_get_status',
        'remote_control_apply_settings',
        'remote_control_regenerate_pin',
      ]
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      } else {
        return Promise.reject(
          `Tried to ipc invoke through an invalid channel: ${channel}`
        )
      }
    },
  },
})
