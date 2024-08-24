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
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },

  on: (channel, func) => {
    const validChannels = ['guest-request'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, func);
    } else {
      throw new Error(`Channel ${channel} is not allowed.`);
    }
  },

  invoke: (channel, data) => {
    const validChannels = ['guest-request'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    } else {
      return Promise.reject(new Error(`Channel ${channel} is not allowed.`));
    }
  }
});

// このフレームワーク内の独自の関数は 互換性を意識して、ReactNativeWebView オブジェクトに置く
//
function generateRandomString() {
  return Math.random().toString(36).substr(2, 9);
};

contextBridge.exposeInMainWorld('electron', {
  callNodejs: (funcName, args = []) => {
    const channel = "nodejs-request";
    return new Promise((resolve, reject) => {
      const randomString = generateRandomString();
      const responseChannel = `${channel}-${randomString}`

      const request = {
        function: funcName,
        args: args,
        responseChannel
      };

      ipcRenderer.send(channel, request);

      ipcRenderer.once(responseChannel, (event, response) => {
        if (response.status === 'success') {
          resolve(response.message);
        } else {
          reject(new Error(response.message));
        }
      });
    });
  },
  callGuest: (guestWebContentsId, funcName, args = []) => {
    const request = {
      guestWebContentsId,
      function: funcName,
      args: args
    };
    console.log(request);
    return ipcRenderer.invoke('guest-request', request);
  },
});

