/**
 * src/navigation/types.ts
 *
 * Defines TypeScript types for the navigation stacks and screen props.
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps } from '@react-navigation/native';

// --- Data Structure Types ---
// FIXED: Added 'export' so these types can be imported by other files.
export type HalfHourlyRecord = {
  FromTime: string;
  LowTemp: string;
  HighTemp: string;
};

export type Profile = {
  ProfileKey: string;
  PriorityName: string;
  PriorityNum: number;
  FromDate: string;
  ToDate: string;
  DaysOfWeek: string[];
  HalfHourlyRecords: HalfHourlyRecord[];
};


// --- Navigation Param Lists ---

export type SettingsStackParamList = {
  SettingsList: undefined;
  Profiles: undefined;
  ProfileDetail: { profile: Profile | null, isNew: boolean };
  SignUp: { startStep?: number };
  ManualSwitches: undefined;
};

export type AppTabParamList = {
  Dashboard: undefined;
  SettingsStack: { screen: keyof SettingsStackParamList, params?: any };
};


// --- Screen Prop Types ---

export type AppTabScreenProps<T extends keyof AppTabParamList> =
  BottomTabScreenProps<AppTabParamList, T>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    StackScreenProps<SettingsStackParamList, T>,
    BottomTabScreenProps<AppTabParamList>
  >;
