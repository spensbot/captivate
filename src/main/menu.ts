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
import { exportDebugLog } from './telemetry'
import {
  CAPTIVATE_GITHUB_DISCUSSIONS_URL,
  CAPTIVATE_GITHUB_ISSUES_URL,
  CAPTIVATE_GITHUB_REPO_URL,
} from '../shared/githubRepo'
import {
  formatRecentProjectMenuLabel,
  type RecentProjectEntry,
} from '../shared/recentProjects'

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
  autosaveMenuChecked = true
  recentProjects: RecentProjectEntry[] = []

  constructor(mainWindow: BrowserWindow, res: MenuResource) {
    this.mainWindow = mainWindow
    this.res = res
  }

  setLedSidebarMenuChecked(checked: boolean) {
    this.ledSidebarMenuChecked = checked
  }

  setAutosaveMenuChecked(checked: boolean) {
    this.autosaveMenuChecked = checked
  }

  setRecentProjects(entries: RecentProjectEntry[]) {
    this.recentProjects = entries
  }

  private buildRecentProjectMenuItems(): MenuItemConstructorOptions[] {
    const items: MenuItemConstructorOptions[] = [{ type: 'separator' }]
    if (this.recentProjects.length === 0) {
      items.push({
        label: 'Recent Projects',
        enabled: false,
      })
      items.push({
        label: '(none)',
        enabled: false,
      })
      return items
    }
    items.push({
      label: 'Recent Projects',
      submenu: this.recentProjects.map((entry) => ({
        label: formatRecentProjectMenuLabel(entry),
        toolTip: entry.path,
        click: () => {
          this.res.ipcCallbacks.send_main_command({
            type: 'load-recent-project',
            path: entry.path,
          })
        },
      })),
    })
    items.push({
      label: 'Clear Recent Projects',
      click: () => {
        this.res.ipcCallbacks.send_main_command({ type: 'clear-recent-projects' })
      },
    })
    return items
  }

  private buildSettingsMenu(): MenuItemConstructorOptions {
    return {
      label: 'Settings',
      submenu: [
        {
          label: 'Preferences…',
          accelerator: process.platform === 'darwin' ? 'Command+,' : 'Ctrl+,',
          click: () => {
            this.res.ipcCallbacks.send_main_command({ type: 'open-settings' })
          },
        },
      ],
    }
  }

  private buildFileSubmenu(
    accelerators: {
      newProject: string
      save: string
      saveAs: string
      load: string
    }
  ): MenuItemConstructorOptions[] {
    return [
      {
        label: 'New Project',
        accelerator: accelerators.newProject,
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'new-project' })
        },
      },
      { type: 'separator' },
      {
        label: 'Save Project',
        accelerator: accelerators.save,
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'save' })
        },
      },
      {
        label: 'Save Project As…',
        accelerator: accelerators.saveAs,
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'save-as' })
        },
      },
      {
        label: 'Load Project…',
        accelerator: accelerators.load,
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'load' })
        },
      },
      {
        label: 'Autosave',
        type: 'checkbox',
        checked: this.autosaveMenuChecked,
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'toggle-autosave' })
        },
      },
      { type: 'separator' },
      {
        label: 'Save Fixture Database',
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'save-fixture-database' })
        },
      },
      {
        label: 'Save Fixture Database As…',
        click: () => {
          this.res.ipcCallbacks.send_main_command({
            type: 'save-fixture-database-as',
          })
        },
      },
      {
        label: 'Load Fixture Database…',
        click: () => {
          this.res.ipcCallbacks.send_main_command({ type: 'load-fixture-database' })
        },
      },
      ...this.buildRecentProjectMenuItems(),
    ]
  }

  private async exportDebugLogFromMenu() {
    try {
      const result = await exportDebugLog(this.mainWindow)
      await dialog.showMessageBox(this.mainWindow, {
        title: 'Debug Log Exported',
        message:
          `Debug log saved to:\n${result.filePath}\n\n` +
          `${result.lineCount} lines (${result.bytesWritten} bytes).\n\n` +
          'Attach this file when reporting issues on GitHub.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('cancelled')) {
        return
      }
      await dialog.showMessageBox(this.mainWindow, {
        title: 'Debug Log Export Failed',
        message,
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
      submenu: this.buildFileSubmenu({
        newProject: 'Command+N',
        save: 'Command+S',
        saveAs: 'Command+Shift+S',
        load: 'Command+O',
      }),
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
          label: 'Export Debug Log…',
          click: () => {
            void this.exportDebugLogFromMenu()
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
      this.buildSettingsMenu(),
      subMenuExtras,
      subMenuHelp,
    ]
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const templateDefault: MenuItemConstructorOptions[] = [
      {
        label: '&File',
        submenu: this.buildFileSubmenu({
          newProject: 'Ctrl+N',
          save: 'Ctrl+S',
          saveAs: 'Ctrl+Shift+S',
          load: 'Ctrl+O',
        }),
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
      this.buildSettingsMenu(),
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
            label: 'Export Debug Log…',
            click: () => {
              void this.exportDebugLogFromMenu()
            },
          },
        ],
      },
    ]

    return templateDefault
  }
}
