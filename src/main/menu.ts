import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  dialog,
} from 'electron'
import { IPC_Callbacks } from './engine/ipcHandler'
import { listPorts } from './engine/dmxConnection'

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string
  submenu?: DarwinMenuItemConstructorOptions[] | Menu
}

interface MenuResource {
  ipcCallbacks: IPC_Callbacks
}

export default class MenuBuilder {
  mainWindow: BrowserWindow
  res: MenuResource

  constructor(mainWindow: BrowserWindow, res: MenuResource) {
    this.mainWindow = mainWindow
    this.res = res
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment()
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate()

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    return menu
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y)
          },
        },
      ]).popup({ window: this.mainWindow })
    })
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'Electron',
      submenu: [
        {
          label: 'About Captivate',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    }
    const subMenuFile: DarwinMenuItemConstructorOptions = {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'Command+N',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'new-project' })
          },
        },
        {
          label: 'Save',
          accelerator: 'Command+S',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'save' })
          },
        },
        // {
        //   label: 'Save Selective',
        //   accelerator: 'Shift+Command+S',
        //   click: () => {},
        // },
        {
          label: 'Load',
          accelerator: 'Command+O',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'load' })
          },
        },
        // {
        //   label: 'Load Selective',
        //   accelerator: 'Shift+Command+O',
        //   click: () => {},
        // },
      ],
    }
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'Command+Z',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'undo' })
          },
        },
        {
          label: 'Redo',
          accelerator: 'Shift+Command+Z',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'redo' })
          },
        },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    }
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload()
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools()
          },
        },
      ],
    }
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen())
          },
        },
      ],
    }
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    }
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://captivatesynth.com/')
          },
        },
        {
          label: 'Tutorials',
          click() {
            shell.openExternal('https://captivatesynth.com/getting_started')
          },
        },
        {
          label: 'Discussion',
          click() {
            shell.openExternal(
              'https://github.com/spensbot/captivate/discussions'
            )
          },
        },
        {
          label: 'USB Troubleshooting',
          click: () => {
            listPorts().then((ports) =>
              dialog.showMessageBox(this.mainWindow, {
                title: 'USB Troubleshooting',
                message:
                  JSON.stringify(ports) + Array(100).fill('hello').join(' \n'),
              })
            )
          },
        },
      ],
    }

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd

    return [
      subMenuAbout,
      subMenuFile,
      subMenuEdit,
      subMenuView,
      subMenuWindow,
      subMenuHelp,
    ]
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'Ctrl+N',
            click: () => {
              this.res.ipcCallbacks.send_main_command({ type: 'new-project' })
            },
          },
          {
            label: 'Save',
            accelerator: 'Ctrl+S',
            click: () => {
              this.res.ipcCallbacks.send_main_command({ type: 'save' })
            },
          },
          {
            label: 'Load',
            accelerator: 'Ctrl+O',
            click: () => {
              this.res.ipcCallbacks.send_main_command({ type: 'load' })
            },
          },
        ],
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload()
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    )
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools()
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen()
                    )
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://captivatesynth.com/')
            },
          },
        ],
      },
    ]

    return templateDefault
  }
}
