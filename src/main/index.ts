import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { handleSoundScheme, registerSoundScheme } from './protocol'
import { readConfig, writeConfig } from './storage'
import { unwatchAll } from './watcher'

registerSoundScheme()

// opt-in remote debugging, used only for automated UI verification
if (process.env['SOUNDBOARD_DEBUG_PORT']) {
  app.commandLine.appendSwitch('remote-debugging-port', process.env['SOUNDBOARD_DEBUG_PORT'])
}

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  const config = await readConfig()
  const { w, h, x, y } = config.window

  mainWindow = new BrowserWindow({
    width: w,
    height: h,
    x: x ?? undefined,
    y: y ?? undefined,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#0f1115',
    title: 'Soundboard',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // keep audio playing and responsive even when the window loses focus mid-event
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // persist window bounds on close
  mainWindow.on('close', () => {
    if (!mainWindow || mainWindow.isMaximized() || mainWindow.isMinimized()) return
    const b = mainWindow.getBounds()
    void readConfig().then((c) =>
      writeConfig({ ...c, window: { w: b.width, h: b.height, x: b.x, y: b.y } })
    )
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    handleSoundScheme()

    // Needed so enumerateDevices() exposes audio-output device labels.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === 'media')
    })
    session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')

    registerIpc(() => mainWindow)
    await createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow()
    })
  })

  app.on('window-all-closed', () => {
    unwatchAll()
    if (process.platform !== 'darwin') app.quit()
  })
}
