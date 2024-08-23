import { log, callNativeFunction, handleReactNativeMessage, setFunctions } from './reactNativeBridge.js';

window.ReactNativeWebView.handleMessage = handleReactNativeMessage;
window.ReactNativeWebView.log = log;

const functions = {
  add: (a, b) => a + b,
};

setFunctions(functions);

callNativeFunction('add', [2, 4])
  .then(result => {
    log('Result from React Native: ' + result);
    return callNativeFunction('asyncAdd', [20, 10]);
  })
  .then(result => {
    log('Result from React Native: ' + result);
  })
  .catch(error => {
    log('Error: ' + error);
  });

