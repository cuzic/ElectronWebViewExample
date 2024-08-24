interface Window {
  fs?: {
    readFile: (path: string) => Promise<string>;
    toFileUrl: (relativePath: string) => Promise<string>;
  },
  electron: {
    callGuest: (guestWebContentsId: number, funcName: string, args?: [any]) => Promise<any>;
  }
}
