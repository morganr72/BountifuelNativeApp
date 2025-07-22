/**
 * src/navigation/AppNavigator.tsx
 *
 * The root navigator for the application. It sets up the main
 * bottom tab navigator that holds all the primary screens.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Home, Settings } from 'lucide-react-native';

import { COLORS } from 'constants/colors';
import type { AppTabParamList, SettingsStackParamList } from 'navigation/types';

// Import the screens
import DashboardScreen from 'screens/DashboardScreen';
import SettingsScreen from 'screens/SettingsScreen';
import ManualSwitchesScreen from 'screens/ManualSwitchesScreen';
import ProfilesScreen from 'screens/ProfilesScreen';
import ProfileDetailScreen from 'screens/ProfileDetailScreen';
import UserSignUpScreen from 'screens/UserSignUpScreen';


const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createStackNavigator<SettingsStackParamList>();

// This stack contains all the screens accessible from the settings page
const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: COLORS.background } }}>
    <Stack.Screen name="SettingsList" component={SettingsScreen} />
    <Stack.Screen name="Profiles" component={ProfilesScreen} />
    <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} />
    <Stack.Screen name="SignUp" component={UserSignUpScreen} />
    <Stack.Screen name="ManualSwitches" component={ManualSwitchesScreen} />
  </Stack.Navigator>
);


const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? '';
            if (routeName === 'ProfileDetail') {
              return { display: 'none' };
            }
            return {
              backgroundColor: COLORS.background,
              borderTopColor: COLORS.border,
              paddingTop: 8,
            };
          })(route),
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        }
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SettingsStack"
        component={SettingsStack}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
        // --- UPDATED: Add a listener to reset the stack on tab press ---
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Prevent the default action
            e.preventDefault();
            // Reset the stack to its initial screen
            navigation.navigate('SettingsStack', { screen: 'SettingsList' });
          },
        })}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <AppTabs />
    </NavigationContainer>
  );
};

export default AppNavigator;
