const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: true,
      preload: path.join(__dirname, '../src/preload.js')
    }
  });

  win.loadURL(
    process.env.ELECTRON_START_URL || `file://${path.join(__dirname, '../build/index.html')}`
  );

  win.webContents.openDevTools();
}

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

ipcMain.handle('read-file', (event, filePath) => {
  const readFileAsync = promisify(fs.readFile);
  try {
    // ファイルを読み取ってその内容を返す
    const filename = path.join(__dirname, "..", filePath);
    return readFileAsync(filename, 'utf8');
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    throw error;
  }
});

ipcMain.handle('to-file-url', (event, relativePath) => {
  console.log("hoge");
  console.log(relativePath);
  const absolutePath = path.resolve(__dirname, "..", relativePath);
  const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`
  return fileUrl;
});

ipcMain.on('message-from-webview', (event, message) => {
  console.log('Received message from webview:', message);
});
