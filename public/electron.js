const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

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
  const absolutePath = path.resolve(__dirname, "..", relativePath);
  const fileUrl = `file://${absolutePath.replace(/\\/g, '/')}`
  return fileUrl;
});

ipcMain.on('message-from-webview', (event, message) => {
  console.log('Received message from webview:', message);
});

const functions = {
  'hello': () => {
    return {
      status: 'success',
      message: 'Hello from Nodejs'
    };
  }
};

ipcMain.on('nodejs-request', async (event, request) => {
  console.log(request);

  const { function: functionName, args, responseChannel } = request;
  let response;

  try {
    const func = functions[functionName];
    if (func) {
      const result = func(...args);
      response = { status: 'success', message: result };
    } else {
      response ={ status: 'error', message: 'Unknown function' };
    }
  } catch (error) {
    response = { status: 'error', message: error.message };
  }

  event.sender.send(responseChannel, response);
});

ipcMain.handle('guest-request', (event, request) => {
  return new Promise((resolve, reject) => {
    const { guestWebContentsId, function: functionName, args } = request;
    const responseChannel = `guest-response-${uuidv4()}`;

    const guestWebContents = webContents.fromId(guestWebContentsId);
    const message = {
      function: functionName, args, responseChannel
    };
    guestWebContents.send('guest-request', message);

    ipcMain.once(responseChannel, (event, response) => {
      console.log(response);
      if (response.status === 'success') {
        resolve(response.message);
      } else {
        reject(new Error(response.message || 'Failed to execute function in guest page'));
      }
    });
  });
});



