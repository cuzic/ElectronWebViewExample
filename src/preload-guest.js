const { contextBridge, ipcRenderer } = require('electron');

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

      console.log(request);
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
});

const functions = {
  'click': (selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      return {
        status: 'success',
        message: `Clicked element with selector ${selector}`
      };
    } else {
      return {
        status: 'error',
        message: 'Element not found'
      };
    }
  },
  'hello': () => {
    return {
      status: 'success',
      message: 'Hello from Guest WebView'
    };
  }
};

ipcRenderer.on('guest-request', (event, request) => {
  const { function: functionName, args, responseChannel } = request;

  try {
    const func = functions[functionName];
    let result;
    if (func) {
      result = func(...args);
    } else {
      result = { status: 'error', message: 'Unknown function' };
    }
    ipcRenderer.send(responseChannel, result);
  } catch (error) {
    ipcRenderer.send(responseChannel, { status: 'error', message: error.message });
  }
});

