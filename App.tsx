/**
 * App.tsx
 *
 * The main entry point for the React Native application.
 * It configures AWS Amplify and renders the main AppNavigator.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react-native';

import { AppNavigator } from './src/navigation/AppNavigator';

// AWS Amplify Configuration from your original file
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'eu-west-2_SpWEM2H2M',
      userPoolClientId: '7kde18g8ga9gr9hpck0llqfrll',
    }
  }
});

function App() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </>
  );
}

// Wrap the app with the Amplify Authenticator HOC
export default withAuthenticator(App);
