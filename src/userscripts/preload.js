const pendingPromises = {};

window.electron.callNodejs("hello")
  .then( ({ message }) => {
    console.log(`message: ${message}`);
  })
  .catch( (response) => {
    console.error(response);
  });

function log(message) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message }));
}

function generateID() {
  return Math.random().toString(36).substr(2, 9);
}

function sendMessage(message) {
  window.ReactNativeWebView.postMessage(JSON.stringify(message));
}

function callNativeFunction(name, args) {
  return new Promise((resolve, reject) => {
    const id = generateID();
    pendingPromises[id] = { resolve, reject };
    const message = {
      id,
      type: 'request',
      name,
      args
    };
    sendMessage(message);
  });
}

function handleResponseMessage(data) {
  const { id, result, error } = data;
  if (!pendingPromises[id]) return;
  const { resolve, reject } = pendingPromises[id];
  if (result !== undefined) {
    resolve(result);
  } else {
    reject(error);
  }
  delete pendingPromises[id];
}

let functions;
function setFunctions(funcs) {
  functions = funcs;
}

function handleRequestMessage(data) {
  const { id, name, args } = data;

  if (!functions[name]) {
    log('Unknown request: ' + name);
    return;
  }

  const result = functions[name].apply(null, args);
  sendMessage({ id, type: 'response', result });
}

function handleReactNativeMessage(event) {
  try {
    const data = JSON.parse(event.data);
    const { type } = data;
    switch (type) {
      case 'response':
        handleResponseMessage(data);

        break;
      case 'request':
        handleRequestMessage(data);
        break;
      case 'log':
        log(data.message);
        break;
      default:
        log(`Unknown message type: ${type}`);
    }
  } catch (e) {
    log('Error: ' + e.message);
  }
}

