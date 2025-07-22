/**
 * src/screens/ProfilesScreen.tsx
 *
 * Fetches and displays a draggable list of temperature profiles.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
// --- UPDATED: Import useFocusEffect ---
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { Svg, Rect } from 'react-native-svg';
import { BarChart2, GripVertical, CheckCircle } from 'lucide-react-native';

import { COLORS } from 'constants/colors';
import type { SettingsStackScreenProps, Profile, HalfHourlyRecord } from 'navigation/types';
import { fetchWithAuth } from 'api/fetchwithAuth';
import { useOrientation } from 'hooks/useOrientation';

// --- Reusable Components ---

const TempRangeBadge: React.FC<{ records: HalfHourlyRecord[] }> = ({ records }) => {
  if (!records || records.length === 0) {
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>--</Text>
      </View>
    );
  }
  const temps = records.flatMap(r => [Number(r.LowTemp), Number(r.HighTemp)]);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>▲ {isFinite(maxTemp) ? maxTemp.toFixed(1) : '--'}</Text>
      <View style={styles.badgeDivider} />
      <Text style={styles.badgeText}>▼ {isFinite(minTemp) ? minTemp.toFixed(1) : '--'}</Text>
    </View>
  );
};

const ThumbnailChart: React.FC<{ records: HalfHourlyRecord[] }> = ({ records }) => {
    if (!records || records.length === 0) {
        return <View style={styles.chartContainer} />;
    }

    const minTemp = Math.min(...records.map(r => Number(r.LowTemp)));
    const maxTemp = Math.max(...records.map(r => Number(r.HighTemp)));
    const yDomain = [Math.floor(minTemp - 1), Math.ceil(maxTemp + 1)];
    const yRange = yDomain[1] - yDomain[0];

    if (yRange <= 0 || !isFinite(yRange)) {
        return <View style={styles.chartContainer} />;
    }

    return (
        <View style={styles.chartContainer}>
            <Svg width="100%" height="100%">
                {records.map((record, index) => {
                    const low = Number(record.LowTemp);
                    const high = Number(record.HighTemp);
                    const x = (index / 48) * 100; // Position as a percentage
                    const barWidth = 100 / 48;
                    
                    const y = ((yDomain[1] - high) / yRange) * 100;
                    const height = ((high - low) / yRange) * 100;

                    return (
                        <Rect
                            key={index}
                            x={`${x}%`}
                            y={`${y}%`}
                            width={`${barWidth}%`}
                            height={`${height}%`}
                            fill={COLORS.cyan}
                        />
                    );
                })}
            </Svg>
        </View>
    );
};


// --- Main Screen Component ---

const ProfilesScreen: React.FC<SettingsStackScreenProps<'Profiles'>> = ({ navigation }) => {
  useOrientation('PORTRAIT');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [defaultProfile, setDefaultProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const originalOrderRef = useRef<string[]>([]);

  const fetchData = useCallback(async () => {
    // Set loading to true only if it's the initial fetch
    if (profiles.length === 0) setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('https://wt999xvbu1.execute-api.eu-west-2.amazonaws.com/default/TempProfileDisplayAPIv2');
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const profilesData = (typeof data.body === 'string') ? JSON.parse(data.body) : data;

      const transformedProfiles = Object.entries(profilesData).map(([key, value]: [string, any]) => ({
        ...value,
        ProfileKey: key,
        HalfHourlyRecords: Array.isArray(value.HalfHourlyRecords) ? value.HalfHourlyRecords.map((r: any) => ({
          FromTime: r.FromTime,
          LowTemp: r.TempDemandLow,
          HighTemp: r.TempDemandHigh
        })) : [],
      }));

      const defProf = transformedProfiles.find(p => p.PriorityName?.includes('Default')) || null;
      const otherProfs = transformedProfiles
        .filter(p => !p.PriorityName?.includes('Default'))
        .sort((a, b) => b.PriorityNum - a.PriorityNum);

      setDefaultProfile(defProf);
      setProfiles(otherProfs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- UPDATED: Use useFocusEffect to refetch data when the screen is focused ---
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const savePriority = async (reorderedProfiles: Profile[]) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    const payload = {
      profiles: reorderedProfiles.map((p, i) => ({
        profileKey: p.ProfileKey,
        profileName: p.PriorityName,
        priorityNum: reorderedProfiles.length - i
      }))
    };
    try {
      const response = await fetchWithAuth('https://anp440nimj.execute-api.eu-west-2.amazonaws.com/default/TempProfilePriorityUpdateAPIv2', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to save priority changes.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Profile>) => (
    <View style={[styles.row, { backgroundColor: isActive ? COLORS.accent : COLORS.card }]}>
      <TouchableOpacity onLongPress={drag} disabled={isActive} style={styles.dragHandle}>
        <GripVertical color={COLORS.textSecondary} size={24} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.rowContent}
        onPress={() => navigation.navigate('ProfileDetail', { profile: item, isNew: false })}
        disabled={isActive}
      >
        <View style={styles.textContainer}>
          <Text style={styles.rowTitle}>{item.PriorityName}</Text>
        </View>
        <TempRangeBadge records={item.HalfHourlyRecords} />
        <ThumbnailChart records={item.HalfHourlyRecords} />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.cyan} /></View>;
    }
    if (error) {
        return <View style={styles.centered}><Text style={styles.errorText}>Error: {error}</Text></View>;
    }
    return (
      <>
        {isSaving && <ActivityIndicator style={{ marginVertical: 10 }} color={COLORS.cyan} />}
        {saveSuccess && (
          <View style={styles.successMessage}>
            <CheckCircle color={COLORS.green} size={20} />
            <Text style={styles.successText}>Priority Saved!</Text>
          </View>
        )}
        <DraggableFlatList
          data={profiles}
          onDragBegin={() => {
            originalOrderRef.current = profiles.map(p => p.ProfileKey);
          }}
          onDragEnd={({ data }) => {
            const newOrder = data.map(p => p.ProfileKey);
            if (JSON.stringify(newOrder) !== JSON.stringify(originalOrderRef.current)) {
              savePriority(data);
            }
            setProfiles(data);
          }}
          keyExtractor={(item) => item.ProfileKey}
          renderItem={renderItem}
          containerStyle={{ flex: 1 }}
          ListHeaderComponent={
            <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('ProfileDetail', { profile: null, isNew: true })}>
              <Text style={styles.newButtonText}>NEW PROFILE</Text>
            </TouchableOpacity>
          }
          ListFooterComponent={
            defaultProfile ? (
              <View style={{marginTop: 20}}>
                <Text style={styles.defaultHeader}>Default Profile</Text>
                <TouchableOpacity style={styles.row} 
                  onPress={() => navigation.navigate('ProfileDetail', { profile: defaultProfile, isNew: false })}
                >
                    <BarChart2 color={COLORS.textSecondary} size={24} />
                    <View style={styles.textContainer}>
                        <Text style={styles.rowTitle}>{defaultProfile.PriorityName}</Text>
                        <Text style={styles.rowSubtitle}>(Locked)</Text>
                    </View>
                    <TempRangeBadge records={defaultProfile.HalfHourlyRecords} />
                    <ThumbnailChart records={defaultProfile.HalfHourlyRecords} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Temperature Profiles</Text>
      <Text style={styles.headerSubtitle}>Drag to reorder priority</Text>
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  headerSubtitle: { textAlign: 'center', color: COLORS.textSecondary, marginBottom: 16 },
  newButton: { backgroundColor: COLORS.cyan, paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  newButtonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: 12, 
    marginBottom: 12,
    overflow: 'hidden',
  },
  dragHandle: { 
    padding: 16,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
  },
  textContainer: { 
    flex: 1, 
    marginLeft: 4 
  },
  rowTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  rowSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', padding: 4, marginHorizontal: 8 },
  badgeText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  badgeDivider: { height: 1, width: '60%', backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 2 },
  chartContainer: { width: 120, height: 60, justifyContent: 'center', alignItems: 'center' },
  defaultHeader: { color: COLORS.textSecondary, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
  errorText: { color: COLORS.red, textAlign: 'center', fontSize: 16 },
  successMessage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(46, 213, 115, 0.15)', padding: 10, borderRadius: 8, marginBottom: 10 },
  successText: { color: COLORS.green, marginLeft: 8, fontWeight: 'bold' },
});

export default ProfilesScreen;
