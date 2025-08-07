/**
 * src/screens/SettingsScreen.tsx
 *
 * --- FIX: Removed the "Sign Up" option which was causing a TypeScript
 * error after navigation refactoring. A logged-in user should not see this option.
 */
import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ChevronRight, Sliders, Droplet, Power, Users, LogOut } from 'lucide-react-native';
import { signOut } from 'aws-amplify/auth';

import { COLORS } from '../constants/colors';
import { usePremise } from '../context/PremiseContext';
import type { SettingsStackScreenProps, SettingsStackParamList } from '../navigation/types';

type SettingsOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  screen: keyof SettingsStackParamList;
  params?: any;
};

const SettingsScreen: React.FC<SettingsStackScreenProps<'SettingsList'>> = ({ navigation }) => {
  const { currentPremise } = usePremise();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  const settingsOptions: (SettingsOption | { isSignOut: true })[] = [
    {
      id: '1',
      title: 'Heating Profiles',
      description: 'Manage temperature schedules',
      icon: <Sliders color={COLORS.cyan} />,
      screen: 'Profiles',
    },
    {
      id: '2',
      title: 'Water Demand Profiles',
      description: 'Set hot water schedules',
      icon: <Droplet color={COLORS.cyan} />,
      screen: 'WaterDemandProfiles',
    },
    {
      id: '3',
      title: 'Manual Switches',
      description: 'Override system controls',
      icon: <Power color={COLORS.cyan} />,
      screen: 'ManualSwitches',
    },
    {
      id: '4',
      title: 'Manage Users',
      description: 'Add or remove users for this premise',
      icon: <Users color={COLORS.cyan} />,
      screen: 'ManageUsers',
      params: {
        premiseId: currentPremise?.PremiseId,
        masterUserSub: currentPremise?.masterUserSub,
      },
    },
    { isSignOut: true }, // Sign out button
  ];

  const renderItem = ({ item }: { item: SettingsOption | { isSignOut: true } }) => {
    if ('isSignOut' in item) {
      return (
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut color={COLORS.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      );
    }

    const isManageUsersDisabled = item.screen === 'ManageUsers' && !currentPremise;

    return (
      <TouchableOpacity
        style={[styles.optionRow, isManageUsersDisabled && styles.disabled]}
        onPress={() => !isManageUsersDisabled && navigation.navigate(item.screen, item.params)}
        disabled={isManageUsersDisabled}
      >
        <View style={styles.iconWrapper}>{item.icon}</View>
        <View style={styles.textWrapper}>
          <Text style={styles.optionTitle}>{item.title}</Text>
          <Text style={styles.optionDescription}>{item.description}</Text>
        </View>
        <ChevronRight color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>{currentPremise?.PremiseName || 'No Premise Selected'}</Text>
      </View>
      <FlatList
        data={settingsOptions}
        keyExtractor={(item) => ('isSignOut' in item ? 'signout' : item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  listContent: { paddingHorizontal: 16 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 12,
    borderRadius: 8,
  },
  textWrapper: { flex: 1, marginHorizontal: 16 },
  optionTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  optionDescription: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  signOutText: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  disabled: { opacity: 0.5 },
});

export default SettingsScreen;
