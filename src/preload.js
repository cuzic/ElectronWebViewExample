const { contextBridge, ipcRenderer } = require('electron');

// contextBridgeを使用して、rendererプロセスに安全なAPIを提供
contextBridge.exposeInMainWorld('fs', {
  readFile: async (filePath) => {
    return ipcRenderer.invoke('read-file', filePath);
  },
  toFileUrl: async (relativePath) => {
    return ipcRenderer.invoke('to-file-url', relativePath);
  }
});

// ipcRendererを使用して、メインプロセスとの通信を行う関数を提供
contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      // Strip event as it includes `sender` (webContents) and is not JSON serializable
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
