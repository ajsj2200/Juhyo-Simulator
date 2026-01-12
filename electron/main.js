/* global process */
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import url from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.setName('주효 인생 시뮬레이터');

const createWindow = () => {
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const isDev = process.env.NODE_ENV === 'development' || !!process.env.VITE_DEV_SERVER_URL;
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '..', isDev ? 'public' : 'dist', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const load = async () => {
    if (isDev) {
      try {
        await win.loadURL(devUrl);
        win.webContents.openDevTools({ mode: 'detach' });
        return;
      } catch {
        // fall through to file load
      }
    }
    const indexPath = url.pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).toString();
    await win.loadURL(indexPath);
  };

  load();
};

app.on('ready', createWindow);

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
