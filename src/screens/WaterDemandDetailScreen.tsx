/**
 * src/screens/WaterDemandDetailScreen.tsx
 *
 * Screen for editing the water demand for a single day within a profile.
 * --- UPDATED with clearer edit box for profile name ---
 */
import React, { useState, useMemo, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Platform, TextInput, ScrollView } from 'react-native';
import { Droplet, Plus, Trash2, X, Check, Ban } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { v4 as uuidv4 } from 'uuid';
import RNLinearGradient from 'react-native-linear-gradient';

import { COLORS } from 'constants/colors';
import type { SettingsStackScreenProps, WaterProfile } from 'navigation/types';
import { useOrientation } from 'hooks/useOrientation';

const HOT_WATER_TANK_VOLUME_LITRES = 180;
const UK_STANDARD_SHOWER_LITRES = 60;

type LocalDemandPeriod = {
    id: string; // A local UUID for the keyExtractor
    time: string;
    demand: number;
};

const ALL_DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS: { [key: string]: string } = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };

// Reusable Day Selector Component
const DaySelector: React.FC<{ activeDays: Set<string>, onToggleDay: (day: string) => void, disabled?: boolean }> = ({ activeDays, onToggleDay, disabled }) => (
    <View style={styles.daySelectorContainer}>{ALL_DAYS_OF_WEEK.map(day => (<TouchableOpacity key={day} onPress={() => onToggleDay(day)} disabled={disabled} style={[styles.dayButton, activeDays.has(day) && styles.dayButtonActive, disabled && styles.disabledInput]}><Text style={[styles.dayButtonText, activeDays.has(day) && styles.dayButtonTextActive]}>{DAY_ABBREVIATIONS[day]}</Text></TouchableOpacity>))}
    </View>
);

// Time Edit Modal
const TimeEditModal: React.FC<{ visible: boolean, onClose: () => void, onSave: (newTime: string) => void, initialTime: string }> = ({ visible, onClose, onSave, initialTime }) => {
    const [time, setTime] = useState(initialTime);
    useEffect(() => { setTime(initialTime); }, [initialTime]);
    return (<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.modalContainer}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Edit Time</Text><TouchableOpacity onPress={onClose}><X color={COLORS.textSecondary} size={24} /></TouchableOpacity></View><View style={styles.timePickerContainer}><TouchableOpacity onPress={() => setTime(t => `${String((parseInt(t.split(':')[0]) + 25) % 24).padStart(2, '0')}:${t.split(':')[1]}`)}><Text style={styles.timePickerButton}>▲</Text></TouchableOpacity><Text style={styles.timePickerText}>{time.split(':')[0]}</Text><TouchableOpacity onPress={() => setTime(t => `${String((parseInt(t.split(':')[0]) + 23) % 24).padStart(2, '0')}:${t.split(':')[1]}`)}><Text style={styles.timePickerButton}>▼</Text></TouchableOpacity><Text style={styles.timePickerSeparator}>:</Text><TouchableOpacity onPress={() => setTime(t => `${t.split(':')[0]}:${String((parseInt(t.split(':')[1]) + 90) % 60).padStart(2, '0')}`)}><Text style={styles.timePickerButton}>▲</Text></TouchableOpacity><Text style={styles.timePickerText}>{time.split(':')[1]}</Text><TouchableOpacity onPress={() => setTime(t => `${t.split(':')[0]}:${String((parseInt(t.split(':')[1]) + 30) % 60).padStart(2, '0')}`)}><Text style={styles.timePickerButton}>▼</Text></TouchableOpacity></View><TouchableOpacity style={styles.modalSaveButton} onPress={() => onSave(time)}><Text style={styles.modalSaveButtonText}>Set Time</Text></TouchableOpacity></View></View></Modal>);
};

const WaterDemandDetailScreen: React.FC<SettingsStackScreenProps<'WaterDemandDetail'>> = ({ route, navigation }) => {
    const { initialProfile, onUpdateProfile } = route.params;
    const isDefault = initialProfile.isDefault ?? false;

    useOrientation('PORTRAIT');

    const [profileName, setProfileName] = useState(initialProfile.profileName);
    const [activeDays, setActiveDays] = useState<Set<string>>(new Set());
    const [fromDate, setFromDate] = useState(new Date(initialProfile.fromDate || new Date()));
    const [toDate, setToDate] = useState(new Date(initialProfile.toDate || new Date()));
    const [demandPeriods, setDemandPeriods] = useState<LocalDemandPeriod[]>([]);
    
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<LocalDemandPeriod | null>(null);

    useEffect(() => {
        setProfileName(initialProfile.profileName);
        setDemandPeriods(initialProfile.demandPeriods.map(p => ({ ...p, id: uuidv4() })));
        const initialDays = new Set<string>();
        if (initialProfile.monday) initialDays.add('Monday');
        if (initialProfile.tuesday) initialDays.add('Tuesday');
        if (initialProfile.wednesday) initialDays.add('Wednesday');
        if (initialProfile.thursday) initialDays.add('Thursday');
        if (initialProfile.friday) initialDays.add('Friday');
        if (initialProfile.saturday) initialDays.add('Saturday');
        if (initialProfile.sunday) initialDays.add('Sunday');
        setActiveDays(initialDays);
    }, [initialProfile]);

    const totalDemandLitres = useMemo(() => demandPeriods.reduce((sum, period) => sum + period.demand, 0), [demandPeriods]);
    const totalDemandShowers = (totalDemandLitres / UK_STANDARD_SHOWER_LITRES).toFixed(1);

    const handleDemandChange = (id: string, newDemand: number) => setDemandPeriods(ps => ps.map(p => p.id === id ? { ...p, demand: newDemand } : p));
    const handleAddPeriod = () => setDemandPeriods(ps => [...ps, { id: uuidv4(), time: '12:00', demand: 60 }]);
    const handleDeletePeriod = (id: string) => setDemandPeriods(ps => ps.filter(p => p.id !== id));
    const openTimeModal = (period: LocalDemandPeriod) => { setSelectedPeriod(period); setIsTimeModalVisible(true); };
    const handleTimeSave = (newTime: string) => { if (selectedPeriod) { setDemandPeriods(ps => ps.map(p => p.id === selectedPeriod.id ? { ...p, time: newTime } : p)); } setIsTimeModalVisible(false); setSelectedPeriod(null); };
    const handleToggleDay = (day: string) => setActiveDays(prev => { const newSet = new Set(prev); newSet.has(day) ? newSet.delete(day) : newSet.add(day); return newSet; });
    const onFromDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => { setShowFromPicker(Platform.OS === 'ios'); setFromDate(selectedDate || fromDate); };
    const onToDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => { setShowToPicker(Platform.OS === 'ios'); setToDate(selectedDate || toDate); };

    const handleDone = () => {
        const updatedProfile: WaterProfile = {
            ...initialProfile,
            profileName,
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            demandPeriods: demandPeriods.map(({ id, ...rest }) => rest),
            monday: activeDays.has('Monday'),
            tuesday: activeDays.has('Tuesday'),
            wednesday: activeDays.has('Wednesday'),
            thursday: activeDays.has('Thursday'),
            friday: activeDays.has('Friday'),
            saturday: activeDays.has('Saturday'),
            sunday: activeDays.has('Sunday'),
        };
        onUpdateProfile(updatedProfile);
        navigation.goBack();
    };

    const handleCancel = () => navigation.goBack();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    {/* --- UPDATED: Profile Name is now in a styled edit box --- */}
                    <View style={styles.titleInputContainer}>
                        <TextInput
                            style={styles.titleInput}
                            value={profileName}
                            onChangeText={setProfileName}
                            placeholder="Profile Name"
                            placeholderTextColor={COLORS.textSecondary}
                            editable={!isDefault}
                        />
                    </View>
                    <Text style={styles.subtitle}>Set hot water demand for specific times.</Text>
                    {!isDefault && (<View style={styles.dateInputContainer}><View><Text style={styles.dateLabel}>From</Text><TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateInput}><Text style={styles.dateInputText}>{fromDate.toISOString().split('T')[0]}</Text></TouchableOpacity></View><View><Text style={styles.dateLabel}>To</Text><TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateInput}><Text style={styles.dateInputText}>{toDate.toISOString().split('T')[0]}</Text></TouchableOpacity></View></View>)}
                    {showFromPicker && (<DateTimePicker testID="fromDateTimePicker" value={fromDate} mode="date" display="default" onChange={onFromDateChange} />)}
                    {showToPicker && (<DateTimePicker testID="toDateTimePicker" value={toDate} mode="date" display="default" onChange={onToDateChange} />)}
                    <DaySelector activeDays={activeDays} onToggleDay={handleToggleDay} disabled={isDefault} />
                    <View style={styles.summaryContainer}><Droplet color={COLORS.cyan} size={20} /><Text style={styles.summaryText}>Total Daily Demand: {totalDemandLitres}L ({totalDemandShowers} Showers)</Text></View>
                </View>
                <FlatList
                    data={demandPeriods.sort((a, b) => a.time.localeCompare(b.time))}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <View style={styles.periodRow}><TouchableOpacity onPress={() => openTimeModal(item)} disabled={isDefault}><Text style={styles.periodTime}>{`From ${item.time}`}</Text></TouchableOpacity><View style={styles.sliderContainer}><Slider style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={HOT_WATER_TANK_VOLUME_LITRES} step={5} value={item.demand} minimumTrackTintColor={COLORS.cyan} maximumTrackTintColor={COLORS.border} thumbTintColor={COLORS.cyan} onValueChange={(value) => handleDemandChange(item.id, value)} disabled={isDefault} /><Text style={styles.periodDemand}>{`${item.demand.toFixed(0)}L (~${(item.demand / UK_STANDARD_SHOWER_LITRES).toFixed(1)} Showers)`}</Text></View><TouchableOpacity onPress={() => handleDeletePeriod(item.id)} style={styles.deleteButton} disabled={isDefault}><Trash2 color={isDefault ? COLORS.disabled : COLORS.red} size={24} /></TouchableOpacity></View>
                    )}
                    ListFooterComponent={!isDefault ? (<TouchableOpacity style={styles.addButton} onPress={handleAddPeriod}><Plus color={COLORS.text} size={24} /><Text style={styles.addButtonText}>Add Demand Period</Text></TouchableOpacity>) : null}
                />
            </ScrollView>
            {selectedPeriod && (<TimeEditModal visible={isTimeModalVisible} onClose={() => setIsTimeModalVisible(false)} onSave={handleTimeSave} initialTime={selectedPeriod.time} />)}
            
            <View style={styles.footerButtonsContainer}>
                <TouchableOpacity style={[styles.footerButton, styles.cancelButton]} onPress={handleCancel}>
                    <Ban color={COLORS.text} size={20} />
                    <Text style={styles.footerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerButton} onPress={handleDone}>
                    <RNLinearGradient colors={[COLORS.green, COLORS.cyan]} style={styles.footerButtonGradient}>
                        <Check color={COLORS.text} size={20} />
                        <Text style={styles.footerButtonText}>Done</Text>
                    </RNLinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    // --- NEW styles for the title input box ---
    titleInputContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 16,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        padding: 16,
    },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
    summaryContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, backgroundColor: COLORS.card, padding: 10, borderRadius: 10 },
    summaryText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    periodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginHorizontal: 16, marginVertical: 8 },
    periodTime: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', width: 90 },
    sliderContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
    periodDemand: { color: COLORS.cyan, fontSize: 14, fontWeight: '600' },
    deleteButton: { padding: 8 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green, padding: 16, borderRadius: 12, margin: 16 },
    addButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    daySelectorContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
    dayButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    dayButtonActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
    dayButtonText: { color: COLORS.textSecondary },
    dayButtonTextActive: { color: COLORS.text, fontWeight: 'bold' },
    disabledInput: { opacity: 0.5 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: COLORS.background, borderRadius: 20, padding: 20, width: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: COLORS.text, fontSize: 22, fontWeight: 'bold' },
    modalSaveButton: { backgroundColor: COLORS.cyan, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    modalSaveButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    timePickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, padding: 8, borderRadius: 8 },
    timePickerButton: { color: COLORS.cyan, fontSize: 20, paddingHorizontal: 10 },
    timePickerText: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', width: 40, textAlign: 'center' },
    timePickerSeparator: { color: COLORS.text, fontSize: 20, fontWeight: 'bold', marginHorizontal: 5 },
    dateInputContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
    dateLabel: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4, textAlign: 'center' },
    dateInput: { backgroundColor: COLORS.card, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, width: 150, alignItems: 'center' },
    dateInputText: { color: COLORS.text },
    footerButtonsContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
    footerButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    footerButtonGradient: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    footerButtonText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
    cancelButton: { backgroundColor: COLORS.card, marginRight: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default WaterDemandDetailScreen;
