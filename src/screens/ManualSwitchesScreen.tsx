/**
 * src/screens/ManualSwitchesScreen.tsx
 *
 * --- FIX: Switched from sending data in headers to request body. ---
 * --- UPDATE: Centralized API endpoint usage. ---
 */
import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, StyleSheet, Switch,
  TouchableOpacity, ActivityIndicator, Platform, Alert
} from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';
import type { SettingsStackScreenProps } from '../navigation/types';
import { fetchWithAuth } from '../api/fetchwithAuth';
import { useOrientation } from '../hooks/useOrientation';
import { usePremise } from '../context/PremiseContext';

const ToggleSwitch = ({ label, isEnabled, onToggle, disabled }: { label: string, isEnabled: boolean, onToggle: () => void, disabled: boolean }) => (
  <View style={styles.switchRow}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      trackColor={{ false: COLORS.disabled, true: COLORS.cyan }}
      thumbColor={isEnabled ? COLORS.backgroundLight : "#f4f3f4"}
      onValueChange={onToggle}
      value={isEnabled}
      disabled={disabled}
    />
  </View>
);

const ManualSwitchesScreen: React.FC<SettingsStackScreenProps<'ManualSwitches'>> = ({ navigation }) => {
  useOrientation('PORTRAIT');
  const { currentPremise } = usePremise();

  const initialSwitches = Array.from({ length: 17 }, (_, i) => `s${i + 1}`).reduce((acc, key) => ({ ...acc, [key]: 'F' }), {});
  
  const [switches, setSwitches] = useState<Record<string, string>>(initialSwitches);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = (switchName: string) => {
    setSwitches(prev => ({ ...prev, [switchName]: prev[switchName] === 'F' ? 'T' : 'F' }));
  };

  const handleSubmit = async (action: 'Set' | 'Cancel') => {
    if (!currentPremise) {
        Alert.alert("Error", "No premise selected. Please select a premise from the dashboard.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const { s9, ...restOfSwitches } = switches;
      
      // --- FIX: Send data in the request body for a cleaner, more standard API call ---
      const payload = {
        controllerId: currentPremise.Controller,
        status: action,
        other: s9,
        ...restOfSwitches
      };

      const response = await fetchWithAuth(API_ENDPOINTS.manualSwitches, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || `API Error: ${response.status}`);
      }
      setSuccess(`Action '${action}' for controller '${currentPremise.Controller}' was successful.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentPremise) {
      return (
          <SafeAreaView style={styles.container}>
              <View style={styles.centered}>
                  <Text style={styles.errorText}>No premise selected.</Text>
                  <Text style={styles.errorSubtitle}>Please go to the dashboard to select a premise.</Text>
              </View>
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SlidersHorizontal color={COLORS.cyan} size={48} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.title}>Manual Switch Control</Text>
        <Text style={styles.subtitle}>Targeting Controller: {currentPremise.Controller}</Text>

        <View style={styles.grid}>
          {Object.keys(switches).filter(k => k !== 's17').map(key => (
            <ToggleSwitch key={key} label={key.toUpperCase()} isEnabled={switches[key] === 'T'} onToggle={() => handleToggle(key)} disabled={isSubmitting} />
          ))}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>S17</Text>
            <Picker selectedValue={switches.s17} onValueChange={val => setSwitches(p => ({ ...p, s17: val }))} style={{ width: 120, color: COLORS.text }} dropdownIconColor={COLORS.text}>
              <Picker.Item label="F" value="F" color={Platform.OS === 'android' ? COLORS.text : undefined} />
              <Picker.Item label="H" value="H" color={Platform.OS === 'android' ? COLORS.text : undefined} />
              <Picker.Item label="C" value="C" color={Platform.OS === 'android' ? COLORS.text : undefined} />
            </Picker>
          </View>
        </View>

        {success && <Text style={styles.successText}>{success}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.green }]} onPress={() => handleSubmit('Set')} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Apply Changes</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.red, marginTop: 16 }]} onPress={() => handleSubmit('Cancel')} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Cancel Manual Mode</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  grid: { marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 8, marginBottom: 8 },
  switchLabel: { color: COLORS.text, fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  buttonContainer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 24, marginTop: 8 },
  button: { backgroundColor: COLORS.cyan, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  errorText: { color: COLORS.red, textAlign: 'center', marginBottom: 16 },
  errorSubtitle: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  successText: { color: COLORS.green, textAlign: 'center', marginBottom: 16 },
});

export default ManualSwitchesScreen;
 