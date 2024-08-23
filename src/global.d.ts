// global.d.ts

interface HTMLWebViewElement extends HTMLElement {
  src: string;
  canGoBack: () => boolean;
  goBack: () => void;
  canGoForward: () => boolean;
  goForward: () => void;
  reload: () => void;
  executeJavaScript: (code: string) => Promise<any>; // メソッドを追加
  addEventListener: (
    type: 'dom-ready' | 'ipc-message' | 'did-fail-load',
    listener: (this: HTMLWebViewElement, ev: MessageEvent) => any,
    options?: boolean | AddEventListenerOptions
  ) => void;
  openDevTools(): void;
}
