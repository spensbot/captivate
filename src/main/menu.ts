import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  dialog,
} from 'electron'
import { IPC_Callbacks } from './engine/ipcHandler'
import { SerialPort } from 'serialport'
import { exportTelemetrySnapshot } from './telemetry'
import {
  CAPTIVATE_GITHUB_DISCUSSIONS_URL,
  CAPTIVATE_GITHUB_ISSUES_URL,
  CAPTIVATE_GITHUB_REPO_URL,
} from '../shared/githubRepo'

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string
  submenu?: DarwinMenuItemConstructorOptions[] | Menu
}

interface MenuResource {
  ipcCallbacks: IPC_Callbacks
  openPageWindow: (page: import('../shared/pages').Page) => void
  /** Same path as renderer-initiated quit: save, teardown engine, then exit. */
  requestAppQuit: () => void
}

export default class MenuBuilder {
  mainWindow: BrowserWindow
  res: MenuResource
  /** Mirrored from renderer: WLED sidebar feature on (`true` = show “Disable…”, off = show “Enable…”). */
  ledSidebarMenuChecked = false

  constructor(mainWindow: BrowserWindow, res: MenuResource) {
    this.mainWindow = mainWindow
    this.res = res
  }

  setLedSidebarMenuChecked(checked: boolean) {
    this.ledSidebarMenuChecked = checked
  }

  private async exportTelemetryFromMenu() {
    try {
      const result = await exportTelemetrySnapshot()
      await dialog.showMessageBox(this.mainWindow, {
        title: 'Telemetry Exported',
        message: `Telemetry snapshot saved to:\n${result.filePath}`,
      })
    } catch (error) {
      await dialog.showMessageBox(this.mainWindow, {
        title: 'Telemetry Export Failed',
        message: error instanceof Error ? error.message : String(error),
      })
    }
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
      label: app.name,
      submenu: [
        {
          label: 'About Captivate 2',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'about' })
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            this.res.requestAppQuit()
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
        { type: 'separator' },
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
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools()
          },
        },
      ],
    }
    const subMenuExtras: MenuItemConstructorOptions = {
      label: 'Extras',
      submenu: [
        {
          label: this.ledSidebarMenuChecked
            ? 'Disable WLED Feature'
            : 'Enable WLED Feature',
          click: () => {
            this.res.ipcCallbacks.send_main_command({
              type: 'set-led-sidebar-enabled',
              enabled: !this.ledSidebarMenuChecked,
            })
          },
        },
        { type: 'separator' },
        {
          label: 'Open Lighting 3D Window (Alpha)',
          click: () => {
            this.res.openPageWindow('Lighting3D')
          },
        },
        {
          label: 'Open Laser Window (Alpha)',
          click: () => {
            this.res.openPageWindow('Laser')
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
          label: 'About Captivate 2',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'about' })
          },
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://captivatesynth.com/')
          },
        },
        {
          label: 'GitHub Repository',
          click() {
            shell.openExternal(CAPTIVATE_GITHUB_REPO_URL)
          },
        },
        {
          label: 'GitHub Issues',
          click() {
            shell.openExternal(CAPTIVATE_GITHUB_ISSUES_URL)
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
            shell.openExternal(CAPTIVATE_GITHUB_DISCUSSIONS_URL)
          },
        },
        {
          label: 'USB Troubleshooting',
          click: () => {
            SerialPort.list().then((ports) =>
              dialog.showMessageBox(this.mainWindow, {
                title: 'USB Troubleshooting',
                message:
                  JSON.stringify(ports) + Array(100).fill('hello').join(' \n'),
              })
            )
          },
        },
        {
          label: 'Export Telemetry Snapshot',
          click: () => {
            void this.exportTelemetryFromMenu()
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
      subMenuWindow,
      subMenuView,
      subMenuExtras,
      subMenuHelp,
    ]
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const templateDefault: MenuItemConstructorOptions[] = [
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
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools()
                  },
                },
              ],
      },
      {
        label: 'Extras',
        submenu: [
          {
            label: this.ledSidebarMenuChecked
              ? 'Disable WLED Feature'
              : 'Enable WLED Feature',
            click: () => {
              this.res.ipcCallbacks.send_main_command({
                type: 'set-led-sidebar-enabled',
                enabled: !this.ledSidebarMenuChecked,
              })
            },
          },
          { type: 'separator' },
          {
            label: 'Open Lighting 3D Window (Alpha)',
            click: () => {
              this.res.openPageWindow('Lighting3D')
            },
          },
          {
            label: 'Open Laser Window (Alpha)',
            click: () => {
              this.res.openPageWindow('Laser')
            },
          },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Captivate 2',
            click: () => {
              this.res.ipcCallbacks.send_main_command({ type: 'about' })
            },
          },
          { type: 'separator' },
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://captivatesynth.com/')
            },
          },
          {
            label: 'GitHub Repository',
            click() {
              shell.openExternal(CAPTIVATE_GITHUB_REPO_URL)
            },
          },
          {
            label: 'GitHub Issues',
            click() {
              shell.openExternal(CAPTIVATE_GITHUB_ISSUES_URL)
            },
          },
          {
            label: 'GitHub Discussions',
            click() {
              shell.openExternal(CAPTIVATE_GITHUB_DISCUSSIONS_URL)
            },
          },
          {
            label: 'Export Telemetry Snapshot',
            click: () => {
              void this.exportTelemetryFromMenu()
            },
          },
        ],
      },
    ]

    return templateDefault
  }
}
