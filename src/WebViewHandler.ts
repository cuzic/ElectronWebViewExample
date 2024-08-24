import {RefObject } from 'react';

interface Functions {
  [key: string]: (...args: any[]) => any;
}

interface PendingPromise {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

interface ResponseData {
  id: string;
  result?: any;
  error?: string;
}

class WebViewHandler {
  private functions: Functions;
  private webview: HTMLWebViewElement;
  private pendingPromises: Record<string, PendingPromise> = {};

  constructor(functions: Functions, webview: HTMLWebViewElement) {
    this.functions = functions;
    this.webview = webview;
  }

  private generateID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private createMessageScript(message: object): string {
    return `
      (function() {
        const message = ${JSON.stringify(message)};
        window.ReactNativeWebView.log(JSON.stringify(message));
        window.ReactNativeWebView.handleMessage({data: JSON.stringify(message)});
      })();
    `;
  }

  private sendMessageToWebView(message: object): void {
    const script = this.createMessageScript(message);
    this.webview.executeJavaScript(script);
  }

  handleRequest(data: { id: string, name: string, args: any[] }): void {
    const { id, name, args } = data;
    if (!this.functions[name]) {
      console.error(`function name ${name} not found`);
      this.sendMessageToWebView({ id: id, type: 'response', error: `function name ${name} not found` });
      return;
    }

    const value = this.functions[name].apply(null, args);

    if (value && typeof value.then === 'function' && typeof value.catch === 'function') {
      value
        .then((resolvedResult: any) => {
          this.sendMessageToWebView({ id: id, type: 'response', result: resolvedResult });
        })
        .catch((error: any) => {
          this.sendMessageToWebView({ id: id, type: 'response', error: error.toString() });
        });
    } else {
      this.sendMessageToWebView({ id: id, type: 'response', result: value });
    }
  }

  handleResponse(data: ResponseData): void {
    const { id, result, error } = data;
    const promise = this.pendingPromises[id];
    if (!promise) return;

    const { resolve, reject } = promise;
    if (result !== undefined) {
      resolve(result);
    } else {
      reject(error);
    }
    delete this.pendingPromises[id];
  }

  handleMessage(event: MessageEvent): void {
    console.log(event.data);
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'request':
          this.handleRequest(data);
          break;
        case 'log':
          console.log(data.message);
          break;
        case 'response':
          this.handleResponse(data);
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (e) {
      console.error("Failed to parse JSON", e);
    }
  }

  callWebView(name: string, args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.generateID();
      this.pendingPromises[id] = { resolve, reject };
      const requestMessage = {
        id: id,
        type: 'request',
        name: name,
        args: args
      };
      this.sendMessageToWebView(requestMessage);
    });
  }
}

export default WebViewHandler;

