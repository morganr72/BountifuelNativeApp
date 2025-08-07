/**
 * src/screens/WaterDemandProfilesScreen.tsx
 *
 * --- FIX: Corrected priority calculation logic. ---
 * --- UPDATE: Centralized API endpoint usage. ---
 */
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { GripVertical, Save, Plus, Trash2, WifiOff } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import RNLinearGradient from 'react-native-linear-gradient';
import { v4 as uuidv4 } from 'uuid';
import { useFocusEffect } from '@react-navigation/native';

import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';
import type { SettingsStackScreenProps, WaterProfile } from '../navigation/types';
import { useOrientation } from '../hooks/useOrientation';
import { fetchWithAuth } from '../api/fetchwithAuth';
import { usePremise } from '../context/PremiseContext';

const WaterDemandProfilesScreen: React.FC<SettingsStackScreenProps<'WaterDemandProfiles'>> = ({ navigation }) => {
    useOrientation('PORTRAIT');
    const { currentPremise } = usePremise();

    const [profiles, setProfiles] = useState<WaterProfile[]>([]);
    const [defaultProfile, setDefaultProfile] = useState<WaterProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        if (!currentPremise) {
            setError("No premise selected.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const url = `${API_ENDPOINTS.getWaterProfiles}?controllerId=${currentPremise.Controller}`;
            const response = await fetchWithAuth(url);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch profiles.');
            const data: WaterProfile[] = await response.json();
            
            setDefaultProfile(data.find(p => p.isDefault) || null);
            setProfiles(data.filter(p => !p.isDefault).sort((a, b) => (b.priority || 0) - (a.priority || 0)));
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [currentPremise]);

    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));

    const handleSave = async () => {
        if (!currentPremise) {
            Alert.alert("Error", "No premise selected.");
            return;
        }
        setIsSaving(true);

        // --- FIX: Calculate priority based on the draggable list's length ---
        const updatedProfiles = profiles.map((p, index) => ({
            ...p,
            priority: profiles.length - 1 - index,
        }));

        // Combine with the default profile *after* calculating priorities
        const allProfiles = [...updatedProfiles, defaultProfile].filter((p): p is WaterProfile => !!p);
       
        const payload = { 
            profiles: allProfiles,
            controllerId: currentPremise.Controller
        };

        try {
            const response = await fetchWithAuth(API_ENDPOINTS.updateWaterProfile, { method: 'POST', body: JSON.stringify(payload) });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to save profiles.');
            Alert.alert('Success', 'Water demand profiles have been updated.');
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateProfile = (updatedProfile: WaterProfile) => {
        if (updatedProfile.isDefault) {
            setDefaultProfile(updatedProfile);
        } else {
            const profileExists = profiles.some(p => p.profileId === updatedProfile.profileId);
            setProfiles(current => profileExists ? current.map(p => p.profileId === updatedProfile.profileId ? updatedProfile : p) : [updatedProfile, ...current]);
        }
    };

    const handleAddNewProfile = () => {
        const newProfile: WaterProfile = {
            profileId: uuidv4(),
            profileName: `New Profile ${profiles.filter(p => p.profileName.startsWith('New Profile')).length + 1}`,
            priority: 0, isDefault: false, fromDate: new Date().toISOString().split('T')[0], toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            demandPeriods: [], monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true,
        };
        navigation.navigate('WaterDemandDetail', { initialProfile: newProfile, onUpdateProfile: handleUpdateProfile });
    };

    const handleDeleteProfile = (profileId: string) => {
        Alert.alert("Delete Profile", "Are you sure you want to delete this profile?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => setProfiles(ps => ps.filter(p => p.profileId !== profileId)) }]);
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<WaterProfile>) => (
        <ScaleDecorator>
            <View style={[styles.row, { backgroundColor: isActive ? COLORS.accent : COLORS.card }]}>
                <TouchableOpacity onLongPress={drag} disabled={isActive} style={styles.dragHandle}>
                    <GripVertical color={COLORS.textSecondary} size={24} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.rowContent}
                    onPress={() => navigation.navigate('WaterDemandDetail', { initialProfile: item, onUpdateProfile: handleUpdateProfile })}
                >
                    <View style={styles.textContainer}>
                        <Text style={styles.rowTitle}>{item.profileName}</Text>
                        {!item.isDefault && <Text style={styles.rowSubtitle}>{`${item.fromDate} to ${item.toDate}`}</Text>}
                    </View>
                </TouchableOpacity>
                {!item.isDefault && (
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteProfile(item.profileId)}>
                        <Trash2 color={COLORS.red} size={22} />
                    </TouchableOpacity>
                )}
            </View>
        </ScaleDecorator>
    );

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.cyan} /></View>;
    }

    if (error) {
        return <View style={styles.centered}><WifiOff size={48} color={COLORS.red} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={fetchData}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Water Demand Profiles</Text>
                <Text style={styles.subtitle}>Drag to reorder priority. The top profile is the highest priority.</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddNewProfile}>
                    <Plus color={COLORS.text} size={20} />
                    <Text style={styles.addButtonText}>Add New Profile</Text>
                </TouchableOpacity>
                <DraggableFlatList
                    data={profiles}
                    onDragEnd={({ data }) => setProfiles(data)}
                    keyExtractor={(item) => item.profileId}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListFooterComponent={defaultProfile ? (
                        <View style={styles.defaultProfileContainer}>
                            <Text style={styles.defaultHeader}>Default Profile</Text>
                            <TouchableOpacity
                                style={[styles.row, {opacity: 0.7}]}
                                onPress={() => navigation.navigate('WaterDemandDetail', { initialProfile: defaultProfile, onUpdateProfile: handleUpdateProfile })}
                            >
                                <View style={styles.dragHandle} />
                                <View style={styles.rowContent}>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.rowTitle}>{defaultProfile.profileName}</Text>
                                        <Text style={styles.rowSubtitle}>(Locked)</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                />
            </View>
            <View style={styles.saveButtonContainer}>
                <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
                    <RNLinearGradient colors={[COLORS.cyan, COLORS.accent]} style={styles.saveButtonGradient}>
                        {isSaving ? (<ActivityIndicator color={COLORS.text} />) : (<Save color={COLORS.text} size={20} />)}
                        <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                    </RNLinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: COLORS.red, fontSize: 16, textAlign: 'center', marginTop: 16 },
    retryButton: { marginTop: 20, backgroundColor: COLORS.cyan, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 },
    retryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green, padding: 12, borderRadius: 12, marginBottom: 20 },
    addButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
    dragHandle: { paddingLeft: 16, paddingVertical: 16 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingLeft: 16 },
    textContainer: { flex: 1 },
    rowTitle: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    rowSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    deleteButton: { padding: 16 },
    defaultProfileContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 20 },
    defaultHeader: { color: COLORS.textSecondary, fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
    saveButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background },
    saveButton: { width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    saveButtonGradient: { borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
});

export default WaterDemandProfilesScreen;
