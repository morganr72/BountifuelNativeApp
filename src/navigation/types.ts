/**
 * =================================================================
 * IMPORTANT: This file should be saved at `src/navigation/types.ts`
 * =================================================================
 *
 * Defines TypeScript types for the navigation stacks and screen props.
 * This is a central place to manage navigation-related typings.
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps } from '@react-navigation/native';

// Define the parameters that can be passed to each screen in the Settings stack
export type SettingsStackParamList = {
  SettingsList: undefined;
  Profiles: undefined;
  ProfileDetail: { profileId: string };
  SignUp: { startStep?: number };
  ManualSwitches: undefined;
};

// Define the parameters for the main tabs
export type AppTabParamList = {
  Dashboard: undefined;
  SettingsStack: { screen: keyof SettingsStackParamList, params?: any };
};

// Type for the entire props object for screens within the AppTabNavigator
// This correctly types both `navigation` and `route`
export type AppTabScreenProps<T extends keyof AppTabParamList> =
  BottomTabScreenProps<AppTabParamList, T>;

// Type for props of screens within the SettingsStack, composing the stack and tab navigator types
export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    StackScreenProps<SettingsStackParamList, T>,
    BottomTabScreenProps<AppTabParamList>
  >;
