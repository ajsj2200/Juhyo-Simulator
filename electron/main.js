/* global process */
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.setName('주효 인생 시뮬레이터');

let mainWindow = null;

const createWindow = () => {
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '..', isDev ? 'public' : 'dist', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[electron] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // level: 0=log,1=warn,2=error
    const tag = level === 2 ? 'error' : level === 1 ? 'warn' : 'log';
    console[tag]('[renderer]', message, sourceId ? `(${sourceId}:${line})` : '');
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[electron] render-process-gone', details);
  });

  const load = async () => {
    if (isDev) {
      try {
        await mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        return;
      } catch {
        // fall through to file load
      }
    }

    // 패키징된 경우 app.getAppPath()는 app.asar 경로입니다.
    // dist/가 asar 안에 들어가 있으면 여기서 안정적으로 찾을 수 있습니다.
    const appRoot = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
    const indexFilePath = path.join(appRoot, 'dist', 'index.html');
    try {
      await mainWindow.loadFile(indexFilePath);
    } catch (e) {
      // 예외 케이스 대비 fallback
      console.error('[electron] loadFile failed, falling back to loadURL', e);
      // loadURL fallback은 Windows에서 공백/한글 경로 처리까지 고려하면 부작용이 있어,
      // 여기서는 에러를 다시 던져 did-fail-load 로그로 원인 파악이 가능하게 합니다.
      throw e;
    }

    if (process.env.ELECTRON_DEBUG === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  };

  load();
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
