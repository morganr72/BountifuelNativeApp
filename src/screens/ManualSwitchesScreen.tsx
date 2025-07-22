/**
 * src/screens/ManualSwitchesScreen.tsx
 *
 * A screen for developers to manually control system switches.
 */
import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, StyleSheet, Switch,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

import { COLORS } from 'constants/colors';
import type { SettingsStackScreenProps } from 'navigation/types';
import { fetchWithAuth } from 'api/fetchwithAuth';
import { useOrientation } from 'hooks/useOrientation'; // Import the hook

// A reusable toggle switch component for this screen
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
  useOrientation('PORTRAIT'); // Enforce portrait mode
  const initialSwitches = Array.from({ length: 17 }, (_, i) => `s${i + 1}`).reduce((acc, key) => ({ ...acc, [key]: 'F' }), {});
  
  const [switches, setSwitches] = useState<Record<string, string>>(initialSwitches);
  const [selectedSite, setSelectedSite] = useState('Sim');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = (switchName: string) => {
    setSwitches(prev => ({ ...prev, [switchName]: prev[switchName] === 'F' ? 'T' : 'F' }));
  };

  const handleSubmit = async (action: 'Set' | 'Cancel') => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const { s9, ...restOfSwitches } = switches;
      const headers = {
        user: 'rmorganml@gmail.com', // This should be dynamic in a real app
        site: selectedSite,
        status: action,
        other: s9,
        ...restOfSwitches
      };
      const response = await fetchWithAuth('https://hm7zj3k1s7.execute-api.eu-west-2.amazonaws.com/default/ManualSwitchAPI', {
        method: 'POST',
        headers: headers as any, // Cast to any to avoid header type issues
      });
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.message || `API Error: ${response.status}`);
      }
      setSuccess(`Action '${action}' for site '${selectedSite}' was successful.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SlidersHorizontal color={COLORS.cyan} size={48} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.title}>Manual Switch Control</Text>
        <Text style={styles.subtitle}>For developer and testing use only.</Text>

        <Text style={styles.pickerLabel}>Select Target Site:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSite}
            onValueChange={(itemValue) => setSelectedSite(itemValue)}
            style={styles.picker}
            dropdownIconColor={COLORS.text}
          >
            <Picker.Item label="Sim" value="Sim" color={Platform.OS === 'android' ? COLORS.text : undefined} />
            <Picker.Item label="Office" value="Office" color={Platform.OS === 'android' ? COLORS.text : undefined} />
            <Picker.Item label="Farm" value="Farm" color={Platform.OS === 'android' ? COLORS.text : undefined} />
          </Picker>
        </View>

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
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  pickerLabel: { color: COLORS.textSecondary, marginBottom: 8, marginLeft: 4 },
  pickerContainer: { backgroundColor: COLORS.card, borderRadius: 8, marginBottom: 24 },
  picker: { color: COLORS.text },
  grid: { marginBottom: 24 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 8, marginBottom: 8 },
  switchLabel: { color: COLORS.text, fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  buttonContainer: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 24, marginTop: 8 },
  button: { backgroundColor: COLORS.cyan, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
});

export default ManualSwitchesScreen;
