/**
 * @format
 */

// ADDED: This import is required for react-native-gesture-handler.
// It must be the very first line of your entry file.
import 'react-native-gesture-handler';

import {AppRegistry} from 'react-native';
import { Amplify } from 'aws-amplify';
import App from './App';
import {name as appName} from './app.json';

// Configure Amplify here, at the very root of the application.
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-west-2_SpWEM2H2M',
      userPoolClientId: '7kde18g8ga9gr9hpck0llqfrll',
    }
  }
});

AppRegistry.registerComponent(appName, () => App);
