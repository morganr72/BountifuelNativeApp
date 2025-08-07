/**
 * src/navigation/AppNavigator.tsx
 *
 * --- UPDATED to handle the new setup flow ---
 * This component now uses the UserContext to check if an authenticated
 * user has completed setup. If not, it routes them to the HardwareSetupScreen.
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import { Home, Settings } from 'lucide-react-native';

import { COLORS } from '../constants/colors';
import { useUser } from '../context/UserContext';
import type { AppTabParamList, SettingsStackParamList, AuthStackParamList, SetupStackParamList } from './types';

// Import all screens
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManualSwitchesScreen from '../screens/ManualSwitchesScreen';
import ProfilesScreen from '../screens/ProfilesScreen';
import ProfileDetailScreen from '../screens/ProfileDetailScreen';
import WaterDemandProfilesScreen from '../screens/WaterDemandProfilesScreen';
import WaterDemandDetailScreen from '../screens/WaterDemandDetailScreen';
import ManageUsersScreen from '../screens/ManageUsersScreen';
import UserSignUpScreen from '../screens/UserSignUpScreen';
import SignInScreen from '../screens/SignInScreen';
import ConfirmSignUpScreen from '../screens/ConfirmSignUpScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HardwareSetupScreen from '../screens/HardwareSetupScreen';

// --- Define Navigators ---
const Tab = createBottomTabNavigator<AppTabParamList>();
const SettingsNav = createStackNavigator<SettingsStackParamList>();
const AuthNav = createStackNavigator<AuthStackParamList>();
const SetupNav = createStackNavigator<SetupStackParamList>();

// --- Stacks ---
const SettingsStack = () => (
  <SettingsNav.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.background } }}>
    <SettingsNav.Screen name="SettingsList" component={SettingsScreen} />
    <SettingsNav.Screen name="Profiles" component={ProfilesScreen} />
    <SettingsNav.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    <SettingsNav.Screen name="WaterDemandProfiles" component={WaterDemandProfilesScreen} />
    <SettingsNav.Screen name="WaterDemandDetail" component={WaterDemandDetailScreen} />
    <SettingsNav.Screen name="ManualSwitches" component={ManualSwitchesScreen} />
    <SettingsNav.Screen name="ManageUsers" component={ManageUsersScreen} />
  </SettingsNav.Navigator>
);

const AppTabs = () => (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border } }}>
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
        <Tab.Screen name="SettingsStack" component={SettingsStack} options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
);

const AuthStack = () => (
  <AuthNav.Navigator screenOptions={{ headerShown: false }}>
    <AuthNav.Screen name="SignIn" component={SignInScreen} />
    <AuthNav.Screen name="SignUp" component={UserSignUpScreen} />
    <AuthNav.Screen name="ConfirmSignUp" component={ConfirmSignUpScreen} />
    <AuthNav.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </AuthNav.Navigator>
);

const SetupStack = () => (
    <SetupNav.Navigator screenOptions={{ headerShown: false }}>
        <SetupNav.Screen name="HardwareSetup" component={HardwareSetupScreen} />
    </SetupNav.Navigator>
);

const LoadingScreen = () => (
    <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.cyan} />
    </View>
);

const RootNavigator = () => {
    const { authStatus } = useAuthenticator(context => [context.authStatus]);
    const { isSetupComplete, isLoading } = useUser();

    if (authStatus !== 'authenticated') {
        return <AuthStack />;
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (isSetupComplete) {
        return <AppTabs />;
    } else {
        return <SetupStack />;
    }
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
});

export default AppNavigator;
