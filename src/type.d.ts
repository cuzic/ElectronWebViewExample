interface Window {
  fs?: {
    readFile: (path: string) => Promise<string>;
    toFileUrl: (relativePath: string) => Promise<string>;
  }
}
