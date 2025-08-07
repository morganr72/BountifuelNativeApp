/**
 * @format
 */

// --- CORRECT IMPORT ORDER ---
// react-native-gesture-handler must be the very first import.
import 'react-native-gesture-handler';

// The crypto polyfill for the `uuid` library must come next.
import 'react-native-get-random-values';

// Your existing imports and configuration follow.
import {AppRegistry} from 'react-native';
import { Amplify } from 'aws-amplify';
import App from './App'; // Assuming './App.tsx' is correct
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
