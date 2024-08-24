import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, Text } from 'react-native';
import WebViewHandler from './WebViewHandler';

const App: React.FC = () => {
  const [preloadPath, setPreloadPath] = useState<string|null>(null);
  const defaultUrl = 'https://www.example.net'
  const [url, setUrl] = useState<string>(defaultUrl);
  const webviewRef = useRef<HTMLWebViewElement | null>(null);
  const [eventHandlers, setEventHandlers] = useState({
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    navigate: () => {},
    callGuest: () => {}
  });

  const fs = window.fs;
  useEffect(() => {
    if (!fs) return;

    const asyncFn = async () => {
      const preloadjs = await fs.toFileUrl("src/preload-guest.js");
      setPreloadPath(preloadjs);
    }
    asyncFn();
  }, [fs])

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const isValidUrlFormat = (inputUrl: string): boolean => {
      const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
      return pattern.test(inputUrl);
    };

    if (isValidUrlFormat(url)) {
      try {
        const webViewHandler = new WebViewHandler({}, webview);
        const validUrl = new URL(url);

        webview.src = validUrl.toString();

        const handleMessage = (event: any) => {
          webViewHandler.handleMessage(event);
        };
        webview.addEventListener('ipc-message', handleMessage);

        const handleFailLoad = (event: any) => {
          console.error('Webview failed to load:', event.errorCode, event.errorDescription, event.validatedURL);
          if (event.errorCode === -3) {
            console.log('Request was aborted. Retrying or handling the abort...');
            // 必要に応じて再試行や別の処理を行う
          }
        };

        webview.addEventListener('did-fail-load', handleFailLoad);

        // cleanup callback
        return () => {
          webview.removeEventListener('ipc-message', handleMessage);
          webview.removeEventListener('did-fail-load', handleFailLoad);
        }
      } catch (error) {
        console.error('Invalid URL:', error);
      }
    } else {
      console.error('invalid URL format.' + url);
    }

  }, [url, webviewRef]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handlers = {
      goBack: () => {
        if (webview.canGoBack()) {
          webview.goBack();
        }
      },
      goForward: () => {
        if (webview.canGoForward()) {
          webview.goForward();
        }
      },
      reload: () => {
        webview.reload();
      },
      navigate: () => {
        setUrl(url); // setUrl関数が別途定義されていることを前提としています
      },
      callGuest: () => {
        console.log("callGuest called");
        window.electron.callGuest(webview.getWebContentsId(), "hello")
          .then((response) => console.log(`response: ${response}`))
          .catch((response) => console.error(response));
      }
    };

    setEventHandlers(handlers);
  }, [url, webviewRef, preloadPath]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!fs || !webview) return;

    const inject = async () => {
      try {
        const userscript = await fs.readFile("src/userscripts/preload.js");

        window.addEventListener('message', (event) => {
          if (event.data.type === 'FROM_WEBVIEW') {
            console.log("Received message from WebView:", event.data.data);
          }
        })
        // 読み込んだスクリプトをWebViewにインジェクト
        const result = await webview.executeJavaScript(userscript);
        console.log('Preload script executed:', result);

      } catch (error) {
        console.error('Failed to inject preload script:', error);
      };
    };
    inject();

    webview.addEventListener('dom-ready', () => {
      console.log(`guest WebContents Id: ${webview.getWebContentsId()}`);
      webview.openDevTools();
    });
  }, [preloadPath, fs, webviewRef]);

  if (!window.fs || !preloadPath) {
    return <Text>Now Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={eventHandlers.goBack}>
          <Text>←</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={eventHandlers.goForward}>
          <Text>→</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={eventHandlers.reload}>
          <Text>🔄</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={eventHandlers.callGuest}>
          <Text>//</Text>
        </Pressable>
        <TextInput
          style={styles.urlInput}
          value={url}
          onChangeText={(text) => setUrl(text)}
          onSubmitEditing={eventHandlers.navigate}
          placeholder="Enter URL"
        />
        <Pressable style={styles.button} onPress={eventHandlers.navigate}>
          <Text>Go</Text>
        </Pressable>
      </View>
      <webview
        ref={webviewRef}
        src={defaultUrl}
        style={styles.webview}
        preload={preloadPath}
        webpreferences="contextIsolation=true, sandbox=true, nodeintegration=false"
        partition="persist:webview_partition"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  controls: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    padding: 10,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginRight: 10,
    paddingLeft: 8,
  },
  button: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginRight: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
});

export default App;
