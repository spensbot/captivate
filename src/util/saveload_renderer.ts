import { ipcRenderer } from 'electron'
import fs from 'fs'

const LOAD_FILE = 'load-file'
const SAVE_FILE = 'save-file'

ipcRenderer.on(LOAD_FILE, (event, filepath: string | null) => {
  if (filepath !== null) {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) {
        return console.log(err)
      }
      console.log(data)
    })
  }
})

export async function loadFile(title: string, defaultPath: string | null) {
  ipcRenderer.send(LOAD_FILE, title, defaultPath)
}

ipcRenderer.on(SAVE_FILE, (event, filepath: string | null) => {
  if (filepath !== null) {
    fs.writeFile(filepath, )
  }
})

export async function saveFile(title: string, defaultPath: string | null) {
  ipcRenderer.send(SAVE_FILE, title, defaultPath)
}

