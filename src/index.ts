import { AppRegistry, Platform } from 'react-native';
import App from './App';

const appName = 'simple-browser';

// React Native for Web用の設定
if (Platform.OS === 'web') {
  AppRegistry.registerComponent(appName, () => App);
  AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
  });
}

