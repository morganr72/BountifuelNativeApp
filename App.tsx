/**
 * App.tsx
 *
 * The main entry point for the React Native application.
 */
import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AppNavigator from './src/navigation/AppNavigator';

const AppContent = () => {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </>
  );
};

function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Authenticator.Provider>
        <Authenticator>
          <AppContent />
        </Authenticator>
      </Authenticator.Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
