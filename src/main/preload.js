const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping')
    },
    send(channel, ...args) {
      const validChannels = ['new_control_state', 'user_command']
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
      const validChannels = ['save_file', 'load_file']
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

// export async function loadFile(
//   title: string,
//   fileFilters: Electron.FileFilter[]
// ): Promise<string> {
//   return ipcRenderer.invoke(LOAD_FILE, title, fileFilters)
// }
