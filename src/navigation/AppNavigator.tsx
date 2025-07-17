/**
 * =================================================================
 * IMPORTANT: This file should be saved as a FILE at:
 * `src/navigation/AppNavigator.tsx`
 *
 * Please ensure it is not a folder with the same name.
 * =================================================================
 *
 * The root navigator for the application. It sets up the main
 * bottom tab navigator that holds all the primary screens.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Settings } from 'lucide-react-native';

// This import expects `colors.ts` to be in `src/constants/`
import { COLORS } from '../constants/colors';
// This import expects `types.ts` to be in the SAME folder (`src/navigation/`)
import type { AppTabParamList } from './types';

// This import expects `DashboardScreen.tsx` to be in `src/screens/`
import DashboardScreen from '../screens/DashboardScreen';

// A properly typed placeholder component for screens we haven't built yet.
const PlaceholderScreen: React.FC = () => null;


const Tab = createBottomTabNavigator<AppTabParamList>();

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.cyan,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
        }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      {/* We'll replace this with the real SettingsStack later */}
      <Tab.Screen
        name="SettingsStack"
        component={PlaceholderScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <AppTabs />
    </NavigationContainer>
  );
};
