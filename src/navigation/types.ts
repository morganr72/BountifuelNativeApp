/**
 * src/navigation/types.ts
 *
 * --- UPDATED to add the new SetupStack for the hardware setup flow ---
 * --- RESTORED missing data structure types ---
 */
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import type { CompositeScreenProps } from '@react-navigation/native';

// --- Data Structure Types ---
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

export type WaterProfile = {
    profileId: string;
    profileName: string;
    priority: number;
    isDefault?: boolean;
    fromDate: string;
    toDate: string;
    demandPeriods: { time: string; demand: number; }[];
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
};


// --- Navigation Param Lists ---

// For unauthenticated users
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: { startStep?: number };
  ConfirmSignUp: { email: string };
  ResetPassword: { email?: string };
};

// For authenticated users who need to set up hardware
export type SetupStackParamList = {
    HardwareSetup: undefined;
    // Add SubscriptionScreen here later
};

// For the settings section of the main app
export type SettingsStackParamList = {
  SettingsList: undefined;
  Profiles: undefined;
  ProfileDetail: { profile: Profile | null, isNew: boolean };
  WaterDemandProfiles: undefined;
  WaterDemandDetail: {
      initialProfile: WaterProfile;
      onUpdateProfile: (updatedProfile: WaterProfile) => void;
  };
  ManualSwitches: undefined;
  ManageUsers: { premiseId: string; masterUserSub: string };
};

// For the main bottom tabs
export type AppTabParamList = {
  Dashboard: undefined;
  SettingsStack: { screen: keyof SettingsStackParamList, params?: any };
};


// --- Screen Prop Types ---

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  StackScreenProps<AuthStackParamList, T>;

export type SetupStackScreenProps<T extends keyof SetupStackParamList> =
    StackScreenProps<SetupStackParamList, T>;

export type AppTabScreenProps<T extends keyof AppTabParamList> =
  BottomTabScreenProps<AppTabParamList, T>;

export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  CompositeScreenProps<
    StackScreenProps<SettingsStackParamList, T>,
    CompositeScreenProps<
        BottomTabScreenProps<AppTabParamList>,
        StackScreenProps<AuthStackParamList>
    >
  >;
