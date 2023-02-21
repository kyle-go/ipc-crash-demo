/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const remoteMain = require('@electron/remote/main');

remoteMain.initialize();

let firstWindow: any;
const createFirstWindow = () => {
  const options = {
    width: 600,
    height: 300,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      contextIsolation: false,
      preload: path.join(__dirname, '../../assets/first_preload.js'),
      nativeWindowOpen: true,
      enableRemoteModule: true,
      sandbox: false,
    },
    // resizable: true,
    // minimizable: false,
    // maximizable: false,
    acceptFirstMouse: true,
    movable: true,
    alwaysOnTop: true,
    // fullscreenable: false,
    // frame: false,
  };

  firstWindow = new BrowserWindow(options);
  remoteMain.enable(firstWindow.webContents);
  firstWindow.loadURL(
    `file://${path.join(__dirname, '../../assets/first.html')}`
  );

  firstWindow.setAlwaysOnTop(true, 'screen-saver');
  firstWindow.setVisibleOnAllWorkspaces(true);

  firstWindow.on('closed', () => {
    firstWindow = null;
  });
  firstWindow.webContents.openDevTools();
};

// eslint-disable-next-line no-unused-vars
let secondWindow: any;
// let secondWindowSystemClose = true;

const createSecondWindow = () => {
  const options = {
    width: 600,
    height: 300,
    minWidth: 1024,
    minHeight: 768,
    autoHideMenuBar: true,
    // backgroundColor: '#181A20',
    show: true,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      contextIsolation: false,
      preload: path.join(__dirname, '../../assets/second_preload.js'),
      nativeWindowOpen: true,
      enableRemoteModule: true,
      sandbox: false,
    },
    acceptFirstMouse: true,
    // fullscreenable: false,
    // titleBarStyle: 'hidden',
  };

  // @ts-ignore
  secondWindow = new BrowserWindow(options);

  secondWindow.loadURL(
    `file://${path.join(__dirname, '../../assets/second.html')}`
  );

  // secondWindow.on('close', (e: { preventDefault: () => void }) => {
  //   if (secondWindowSystemClose) {
  //     e.preventDefault();
  //     secondWindow.webContents.send('system-close');
  //   }
  // });

  secondWindow.on('closed', () => {
    if (firstWindow) {
      firstWindow.hide();
    }
  });

  secondWindow.webContents.openDevTools();
};

ipcMain.on('ipc-example', async (_, arg) => {
  console.log(arg);
  // const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  // console.log(msgTemplate(arg));
  // event.reply('ipc-example', msgTemplate('pong'));

  // create browserWindows
  createFirstWindow();
  createSecondWindow();

  setTimeout(() => {
    if (secondWindow) {
      secondWindow.webContents.send('want-close');
    }
  }, 3000);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
