/**
 * src/screens/SettingsScreen.tsx
 *
 * The main settings page, providing navigation to various sub-screens.
 */
import React from 'react';
import { SafeAreaView, View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Wifi, BarChart2, SlidersHorizontal, ChevronRight } from 'lucide-react-native';

import { COLORS } from 'constants/colors';
import type { SettingsStackScreenProps, SettingsStackParamList } from 'navigation/types';
import { useOrientation } from 'hooks/useOrientation'; // Import the hook

// Define the type for each item in our settings list
type SettingsOption = {
  title: string;
  subtitle: string;
  icon: React.FC<any>; // Icon component from lucide-react-native
  screen: keyof SettingsStackParamList; // Use keyof for better type safety
  params?: any; // Use any for params as they vary
};

const SettingsScreen: React.FC<SettingsStackScreenProps<'SettingsList'>> = ({ navigation }) => {
  useOrientation('PORTRAIT'); // Enforce portrait mode
  const settingsOptions: SettingsOption[] = [
    { title: 'Run Full User Setup', subtitle: 'Set up user, property, and hardware.', icon: User, screen: 'SignUp', params: { startStep: 1 } },
    { title: 'Re-configure Primary WiFi', subtitle: 'Update the main WiFi network.', icon: Wifi, screen: 'SignUp', params: { startStep: 3 } },
    { title: 'Temperature Profiles', subtitle: 'Manage heating and cooling schedules.', icon: BarChart2, screen: 'Profiles' },
    { title: 'Manual Switch Control', subtitle: 'For developer and testing use.', icon: SlidersHorizontal, screen: 'ManualSwitches' }
  ];

  const renderItem = ({ item }: { item: SettingsOption }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate(item.screen as any, item.params as any)}
    >
      <item.icon color={COLORS.cyan} size={24} />
      <View style={styles.textContainer}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
      </View>
      <ChevronRight color={COLORS.textSecondary} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <FlatList
          data={settingsOptions}
          keyExtractor={(item) => item.title}
          style={{ width: '100%' }}
          renderItem={renderItem}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  }
});

export default SettingsScreen;
