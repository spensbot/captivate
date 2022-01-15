const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping')
    },
    send(channel, ...args) {
      const validChannels = ['new_control_state']
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
  },
})
