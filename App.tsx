/**
 * App.tsx
 * --- UPDATED to include the new UserProvider for setup status checking.
 */
import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { Authenticator } from '@aws-amplify/ui-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { PremiseProvider } from './src/context/PremiseContext';
import { UserProvider } from './src/context/UserContext'; // Import the new provider

function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <Authenticator.Provider>
          <UserProvider>
            <PremiseProvider>
              <StatusBar barStyle="light-content" />
              <AppNavigator />
            </PremiseProvider>
          </UserProvider>
        </Authenticator.Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
