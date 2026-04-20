const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping')
    },
    send(channel, ...args) {
      const validChannels = ['diagnostics_event', 'telemetry_mark']
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args)
      } else {
        console.error(`Tried to send ipc through an invalid channel: ${channel}`)
      }
    },
    on(channel, func) {
      const validChannels = ['new_visualizer_state']
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
    invoke(channel, ...args) {
      const validChannels = [
        'visualizer_stream_relay_start',
        'visualizer_stream_relay_stop',
        'projectm_bridge_status',
        'projectm_install_binaries',
        'projectm_bridge_init_session',
        'projectm_bridge_push_audio',
        'projectm_bridge_render',
        'projectm_bridge_shutdown_session',
      ]
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      }
      return Promise.reject(
        `Tried to ipc invoke through an invalid channel: ${channel}`
      )
    },
  },
})
