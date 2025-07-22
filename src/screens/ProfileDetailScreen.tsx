/**
 * src/screens/ProfileDetailScreen.tsx
 *
 * Screen for editing a single temperature profile.
 * Enforces landscape orientation.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions, Platform, StatusBar, ActivityIndicator, useWindowDimensions, Modal, ScrollView } from 'react-native';
import { Svg, Rect, G, Line, Text as SvgText } from 'react-native-svg';
import { X, Plus, Minus, AlertTriangle, CheckCircle } from 'lucide-react-native';

import { COLORS } from 'constants/colors';
import type { SettingsStackScreenProps, Profile, HalfHourlyRecord } from 'navigation/types';
import { useOrientation } from 'hooks/useOrientation';
import { fetchWithAuth } from 'api/fetchwithAuth'; // Import the authenticated fetch utility

const ALL_DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREVIATIONS: { [key: string]: string } = { 'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' };


// --- Reusable Components ---

const DaySelector: React.FC<{ activeDays: Set<string>, onToggleDay: (day: string) => void, disabled?: boolean }> = ({ activeDays, onToggleDay, disabled }) => (
    <View style={styles.daySelectorContainer}>
        {ALL_DAYS_OF_WEEK.map(day => {
            const isActive = activeDays.has(day);
            return (
                <TouchableOpacity key={day} onPress={() => onToggleDay(day)} disabled={disabled} style={[styles.dayButton, isActive && styles.dayButtonActive, disabled && styles.disabledInput]}>
                    <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>{DAY_ABBREVIATIONS[day]}</Text>
                </TouchableOpacity>
            )
        })}
    </View>
);

// --- Chart and Modal Components ---
type TempBlock = {
    startIndex: number;
    endIndex: number;
    lowTemp: number;
    highTemp: number;
};

const CustomProfileChart: React.FC<{ records: HalfHourlyRecord[], onBlockPress: (block: TempBlock) => void, disabled?: boolean }> = ({ records, onBlockPress, disabled }) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = screenWidth - 40;
    const chartHeight = screenHeight * 0.55;
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const [tempBlocks, setTempBlocks] = useState<TempBlock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const blueShades = ['#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985'];

    useEffect(() => {
        setIsLoading(true);
        if (records.length === 0) {
            setIsLoading(false);
            return;
        }
        const timeoutId = setTimeout(() => {
            const blocks: TempBlock[] = [];
            let currentBlock: TempBlock = { startIndex: 0, endIndex: 0, lowTemp: Number(records[0].LowTemp), highTemp: Number(records[0].HighTemp) };
            for (let i = 1; i < records.length; i++) {
                const low = Number(records[i].LowTemp);
                const high = Number(records[i].HighTemp);
                if (low === currentBlock.lowTemp && high === currentBlock.highTemp) {
                    currentBlock.endIndex = i;
                } else {
                    blocks.push(currentBlock);
                    currentBlock = { startIndex: i, endIndex: i, lowTemp: low, highTemp: high };
                }
            }
            blocks.push(currentBlock);
            setTempBlocks(blocks);
            setIsLoading(false);
        }, 10);
        return () => clearTimeout(timeoutId);
    }, [records]);

    const minTemp = Math.min(...records.map(r => Number(r.LowTemp)));
    const maxTemp = Math.max(...records.map(r => Number(r.HighTemp)));
    const yDomain = [Math.floor(minTemp - 1), Math.ceil(maxTemp + 1)];
    const yRange = yDomain[1] - yDomain[0];
    const mapTempToY = (temp: number) => innerHeight - ((temp - yDomain[0]) / yRange) * innerHeight;
    const xDomain = [0, 48];
    const mapIndexToX = (index: number) => (index / xDomain[1]) * innerWidth;

    if (innerWidth <= 0 || innerHeight <= 0) return <ActivityIndicator color={COLORS.cyan} />;
    if (yRange <= 0 || !isFinite(yRange)) return <View><Text style={{ color: COLORS.textSecondary }}>Invalid temperature data</Text></View>;
    if (isLoading) return <ActivityIndicator color={COLORS.cyan} size="large" />;

    return (
        <Svg width={chartWidth} height={chartHeight}>
            <G x={padding.left} y={padding.top}>
                {Array.from({ length: yRange + 1 }, (_, i) => yDomain[0] + i).map(temp => {
                    const y = mapTempToY(temp);
                    return (
                        <G key={`y-axis-${temp}`}>
                            <Line x1={-5} y1={y} x2={innerWidth} y2={y} stroke={COLORS.border} strokeWidth={1} />
                            <SvgText x={-10} y={y + 4} fill={COLORS.textSecondary} fontSize="12" textAnchor="end">{`${temp}°C`}</SvgText>
                        </G>
                    );
                })}
                {records.map((record, index) => {
                    if (index % 4 !== 0) return null;
                    const x = mapIndexToX(index);
                    return <SvgText key={`x-axis-${index}`} x={x} y={innerHeight + 20} fill={COLORS.textSecondary} fontSize="12" textAnchor="middle">{record.FromTime}</SvgText>;
                })}
                {tempBlocks.map((block, index) => {
                    const x = mapIndexToX(block.startIndex);
                    const y = mapTempToY(block.highTemp);
                    const blockWidth = mapIndexToX(block.endIndex + 1) - x;
                    const blockHeight = mapTempToY(block.lowTemp) - y;
                    return <Rect key={`block-${index}`} x={x} y={y} width={blockWidth} height={blockHeight} fill={blueShades[index % blueShades.length]} onPress={disabled ? undefined : () => onBlockPress(block)} />;
                })}
            </G>
        </Svg>
    );
};

const NumberCircleInput: React.FC<{ value: string, onIncrement: () => void, onDecrement: () => void, disabled?: boolean }> = ({ value, onIncrement, onDecrement, disabled }) => (
    <View style={[styles.numberInputContainer, disabled && styles.disabledInput]}>
        <TouchableOpacity onPress={onIncrement} style={styles.numberInputButton} disabled={disabled}><Plus color={disabled ? COLORS.disabled : COLORS.green} size={24} strokeWidth={3} /></TouchableOpacity>
        <View style={styles.numberDisplay}>
            <Text style={styles.numberDisplayText}>{value}</Text>
        </View>
        <TouchableOpacity onPress={onDecrement} style={styles.numberInputButton} disabled={disabled}><Minus color={disabled ? COLORS.disabled : COLORS.red} size={24} strokeWidth={3} /></TouchableOpacity>
    </View>
);

const ErrorModal: React.FC<{ visible: boolean, onClose: () => void, message: string }> = ({ visible, onClose, message }) => (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
            <View style={styles.errorModalContent}>
                <AlertTriangle color={COLORS.orange} size={48} />
                <Text style={styles.errorModalTitle}>Validation Error</Text>
                <Text style={styles.errorModalMessage}>{message}</Text>
                <TouchableOpacity style={[styles.button, { width: '80%' }]} onPress={onClose}>
                    <Text style={styles.buttonText}>OK</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const ConfirmationModal: React.FC<{ visible: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }> = ({ visible, onClose, onConfirm, title, message }) => (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
            <View style={styles.errorModalContent}>
                <AlertTriangle color={COLORS.orange} size={48} />
                <Text style={styles.errorModalTitle}>{title}</Text>
                <Text style={styles.errorModalMessage}>{message}</Text>
                <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.textSecondary }]} onPress={onClose}><Text style={styles.buttonText}>CANCEL</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onConfirm}><Text style={styles.buttonText}>CONFIRM</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const EditChunkModal: React.FC<{ visible: boolean, onClose: () => void, onSubmit: (data: any) => void, onDelete: () => void, block: TempBlock | null, isNew: boolean, isFirstChunk: boolean, isLastChunk: boolean, onError: (message: string) => void, disabled?: boolean }> = ({ visible, onClose, onSubmit, onDelete, block, isNew, isFirstChunk, isLastChunk, onError, disabled }) => {
    const [startHour, setStartHour] = useState(8);
    const [startMinute, setStartMinute] = useState(0);
    const [endHour, setEndHour] = useState(17);
    const [endMinute, setEndMinute] = useState(0);
    const [lowTemp, setLowTemp] = useState(18);
    const [highTemp, setHighTemp] = useState(21);

    useEffect(() => {
        if (visible) {
            if (isNew || !block) {
                setStartHour(8); setStartMinute(0); setEndHour(17); setEndMinute(0); setLowTemp(18); setHighTemp(21);
            } else {
                const startTime = `${String(Math.floor(block.startIndex / 2)).padStart(2, '0')}:${block.startIndex % 2 === 0 ? '00' : '30'}`;
                const [sH, sM] = startTime.split(':').map(Number);
                setStartHour(sH); setStartMinute(sM);
                const endTimeIndex = block.endIndex + 1;
                const endTime = `${String(Math.floor(endTimeIndex / 2)).padStart(2, '0')}:${endTimeIndex % 2 === 0 ? '00' : '30'}`;
                const [eH, eM] = endTime.split(':').map(Number);
                setEndHour(eH); setEndMinute(eM);
                setLowTemp(block.lowTemp);
                setHighTemp(block.highTemp);
            }
        }
    }, [visible, block, isNew]);

    const handleSave = () => {
        const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        if (startTime >= endTime && endTime !== '00:00') {
            onError('Start time must be before end time.');
            return;
        }
        if ((highTemp - lowTemp) < 1) {
            onError('High temperature must be at least 1°C greater than low temperature.');
            return;
        }
        onSubmit({ startTime, endTime, lowTemp: String(lowTemp), highTemp: String(highTemp) });
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ScrollView contentContainerStyle={styles.modalScrollView}>
                        <View style={styles.modalSection}>
                            <View style={styles.modalRow}>
                                <NumberCircleInput value={String(startHour).padStart(2, '0')} onIncrement={() => setStartHour(p => (p + 1) % 24)} onDecrement={() => setStartHour(p => (p - 1 + 24) % 24)} disabled={isFirstChunk || disabled} />
                                <Text style={styles.modalSeparator}>:</Text>
                                <NumberCircleInput value={String(startMinute).padStart(2, '0')} onIncrement={() => setStartMinute(p => p === 0 ? 30 : 0)} onDecrement={() => setStartMinute(p => p === 0 ? 30 : 0)} disabled={isFirstChunk || disabled} />
                                <Text style={styles.modalSeparator}>-</Text>
                                <NumberCircleInput value={String(endHour).padStart(2, '0')} onIncrement={() => setEndHour(p => (p + 1) % 24)} onDecrement={() => setEndHour(p => (p - 1 + 24) % 24)} disabled={isLastChunk || disabled} />
                                <Text style={styles.modalSeparator}>:</Text>
                                <NumberCircleInput value={String(endMinute).padStart(2, '0')} onIncrement={() => setEndMinute(p => p === 0 ? 30 : 0)} onDecrement={() => setEndMinute(p => p === 0 ? 30 : 0)} disabled={isLastChunk || disabled} />
                            </View>
                        </View>
                        <View style={styles.modalSection}>
                            <View style={styles.modalRow}>
                                <NumberCircleInput value={lowTemp.toFixed(1)} onIncrement={() => setLowTemp(p => p + 0.5)} onDecrement={() => setLowTemp(p => p - 0.5)} disabled={disabled} />
                                <Text style={styles.modalSeparator}>-</Text>
                                <NumberCircleInput value={highTemp.toFixed(1)} onIncrement={() => setHighTemp(p => p + 0.5)} onDecrement={() => setHighTemp(p => p - 0.5)} disabled={disabled} />
                            </View>
                        </View>
                    </ScrollView>
                </View>

                <View style={styles.modalSideButtonContainer}>
                    <TouchableOpacity style={[styles.button, styles.modalSideButton, { backgroundColor: COLORS.textSecondary }]} onPress={onClose}>
                        <Text style={styles.buttonText}>CLOSE</Text>
                    </TouchableOpacity>
                    {!disabled && (
                        <>
                            <TouchableOpacity style={[styles.button, styles.modalSideButton]} onPress={handleSave}>
                                <Text style={styles.buttonText}>SAVE</Text>
                            </TouchableOpacity>
                            {!isNew && !isFirstChunk && (
                                <TouchableOpacity style={[styles.button, styles.modalSideButton, styles.deleteButton]} onPress={onDelete}>
                                    <Text style={styles.buttonText}>DELETE</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// --- Main Screen Component ---

const ProfileDetailScreen: React.FC<SettingsStackScreenProps<'ProfileDetail'>> = ({ route, navigation }) => {
  useOrientation('LANDSCAPE');
  const { profile, isNew } = route.params ?? { profile: null, isNew: true };
  const [profileName, setProfileName] = useState('');
  const [originalProfileName, setOriginalProfileName] = useState<string | null>(null);
  const [activeDays, setActiveDays] = useState(new Set<string>());
  const [halfHourlyRecords, setHalfHourlyRecords] = useState<HalfHourlyRecord[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TempBlock | null>(null);
  const [isNewPeriod, setIsNewPeriod] = useState(false);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDiscardModalVisible, setIsDiscardModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalProfileJSON, setOriginalProfileJSON] = useState<string | null>(null);

  useEffect(() => {
    const records = isNew ? Array.from({ length: 48 }, (_, i) => ({ FromTime: `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`, LowTemp: '18', HighTemp: '21' })) : profile?.HalfHourlyRecords || [];
    setHalfHourlyRecords(records);
    if (isNew) {
      setProfileName('New Profile');
      setOriginalProfileName(null);
      setActiveDays(new Set(ALL_DAYS_OF_WEEK));
      setOriginalProfileJSON(JSON.stringify({ name: 'New Profile', days: Array.from(new Set(ALL_DAYS_OF_WEEK)), records }));
    } else if (profile) {
      setProfileName(profile.PriorityName);
      setOriginalProfileName(profile.PriorityName);
      setActiveDays(new Set(profile.DaysOfWeek));
      setOriginalProfileJSON(JSON.stringify({ name: profile.PriorityName, days: profile.DaysOfWeek, records: profile.HalfHourlyRecords }));
    }
  }, [profile, isNew]);

  useEffect(() => {
    if (!originalProfileJSON) return;
    const currentProfile = JSON.stringify({ name: profileName, days: Array.from(activeDays), records: halfHourlyRecords });
    setHasChanges(originalProfileJSON !== currentProfile);
  }, [profileName, activeDays, halfHourlyRecords, originalProfileJSON]);

  const isDefault = !isNew && profile?.PriorityName?.includes('Default');

  const tempBlocks = useMemo<TempBlock[]>(() => {
    if (halfHourlyRecords.length === 0) return [];
    const blocks: TempBlock[] = [];
    let currentBlock: TempBlock = { startIndex: 0, endIndex: 0, lowTemp: Number(halfHourlyRecords[0].LowTemp), highTemp: Number(halfHourlyRecords[0].HighTemp) };
    for (let i = 1; i < halfHourlyRecords.length; i++) {
        const low = Number(halfHourlyRecords[i].LowTemp);
        const high = Number(halfHourlyRecords[i].HighTemp);
        if (low === currentBlock.lowTemp && high === currentBlock.highTemp) {
            currentBlock.endIndex = i;
        } else {
            blocks.push(currentBlock);
            currentBlock = { startIndex: i, endIndex: i, lowTemp: low, highTemp: high };
        }
    }
    blocks.push(currentBlock);
    return blocks;
  }, [halfHourlyRecords]);

  const handleBlockPress = (block: TempBlock) => {
    setSelectedBlock(block);
    setIsNewPeriod(false);
    setIsModalVisible(true);
  };

  const handleNewPeriod = () => {
    setSelectedBlock(null);
    setIsNewPeriod(true);
    setIsModalVisible(true);
  };

  const handleModalSubmit = (data: { startTime: string, endTime: string, lowTemp: string, highTemp: string }) => {
    const timeToIndex = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 2 + m / 30;
    };

    const newStartIndex = timeToIndex(data.startTime);
    const newEndIndex = timeToIndex(data.endTime) - 1;
    const originalStartIndex = selectedBlock?.startIndex ?? -1;
    const originalEndIndex = selectedBlock?.endIndex ?? -1;

    setHalfHourlyRecords(currentRecords => {
        const newRecords = [...currentRecords];

        if (selectedBlock) { // Only do gap filling if we are editing an existing block
            if (newStartIndex > originalStartIndex) {
                const precedingBlockTemp = newRecords[originalStartIndex - 1];
                for (let i = originalStartIndex; i < newStartIndex; i++) {
                    newRecords[i] = { ...newRecords[i], LowTemp: precedingBlockTemp.LowTemp, HighTemp: precedingBlockTemp.HighTemp };
                }
            }
            if (newEndIndex < originalEndIndex) {
                const nextBlockTemp = newRecords[originalEndIndex + 1];
                for (let i = newEndIndex + 1; i <= originalEndIndex; i++) {
                    newRecords[i] = { ...newRecords[i], LowTemp: nextBlockTemp.LowTemp, HighTemp: nextBlockTemp.HighTemp };
                }
            }
        }

        for (let i = newStartIndex; i <= newEndIndex; i++) {
            if (newRecords[i]) {
                newRecords[i] = { ...newRecords[i], LowTemp: data.lowTemp, HighTemp: data.highTemp };
            }
        }
        return newRecords;
    });
    setIsModalVisible(false);
  };

  const handleModalDelete = () => {
    if (!selectedBlock || selectedBlock.startIndex === 0) {
        showError("Cannot delete the first time period.");
        return;
    }
    const prevTemp = halfHourlyRecords[selectedBlock.startIndex - 1];
    setHalfHourlyRecords(currentRecords =>
        currentRecords.map((record, index) => {
            if (index >= selectedBlock.startIndex && index <= selectedBlock.endIndex) {
                return { ...record, LowTemp: prevTemp.LowTemp, HighTemp: prevTemp.HighTemp };
            }
            return record;
        })
    );
    setIsModalVisible(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
        const payload = {
            profileKey: isNew ? crypto.randomUUID() : profile?.ProfileKey,
            priorityNum: isNew ? 99 : profile?.PriorityNum,
            profileName,
            originalProfileName: isNew ? null : originalProfileName,
            fromDate: profile?.FromDate || new Date().toISOString().split('T')[0],
            toDate: profile?.ToDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            activeDays: Array.from(activeDays),
            halfHourlyRecords
        };
        const response = await fetchWithAuth('https://rcm4tg6vng.execute-api.eu-west-2.amazonaws.com/default/TempProfileUpdateAPIv2', { method: 'POST', body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('Failed to save profile.');
        navigation.goBack();
    } catch (error: any) {
        showError(error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const confirmDeleteProfile = async () => {
    setIsDeleteModalVisible(false);
    setIsSaving(true);
    try {
        const response = await fetchWithAuth('https://fa2tbi6j76.execute-api.eu-west-2.amazonaws.com/default/TempProfileDeleteAPIv2', { method: 'POST', body: JSON.stringify({ profileKey: profile?.ProfileKey, profileName: profile?.PriorityName }) });
        if (!response.ok) throw new Error('Failed to delete profile.');
        navigation.goBack();
    } catch (error: any) {
        showError(error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAttemptBack = () => {
    if (hasChanges && !isDefault) {
        setIsDiscardModalVisible(true);
    } else {
        navigation.goBack();
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setIsErrorModalVisible(true);
  };

  const isFirstChunk = selectedBlock ? selectedBlock.startIndex === 0 : false;
  const isLastChunk = selectedBlock ? selectedBlock.endIndex === 47 : false;

  return (
    <SafeAreaView style={styles.container}>
        <ErrorModal visible={isErrorModalVisible} onClose={() => setIsErrorModalVisible(false)} message={errorMessage} />
        <ConfirmationModal visible={isDeleteModalVisible} onClose={() => setIsDeleteModalVisible(false)} onConfirm={confirmDeleteProfile} title="Delete Profile" message={`Are you sure you want to permanently delete "${profileName}"?`} />
        <ConfirmationModal visible={isDiscardModalVisible} onClose={() => setIsDiscardModalVisible(false)} onConfirm={() => navigation.goBack()} title="Discard Changes" message="You have unsaved changes. Are you sure you want to leave?" />
        <EditChunkModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} onSubmit={handleModalSubmit} onDelete={handleModalDelete} block={selectedBlock} isNew={isNewPeriod} onError={showError} isFirstChunk={isFirstChunk} isLastChunk={isLastChunk} disabled={isDefault} />
        
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={handleAttemptBack} style={styles.backButton}><X color={COLORS.text} size={30} /></TouchableOpacity>
                <TextInput 
                    value={profileName} 
                    onChangeText={setProfileName} 
                    style={styles.titleInput} 
                    editable={!isDefault} 
                    placeholder="Profile Name"
                    placeholderTextColor={COLORS.textSecondary}
                />
            </View>
            <DaySelector activeDays={activeDays} onToggleDay={(day) => { setActiveDays(prev => { const newSet = new Set(prev); if (newSet.has(day)) newSet.delete(day); else newSet.add(day); return newSet; }) }} disabled={isDefault} />
        </View>
        
        <View style={styles.chartContainer}>
            {halfHourlyRecords.length > 0 ? <CustomProfileChart records={halfHourlyRecords} onBlockPress={handleBlockPress} disabled={isDefault} /> : <ActivityIndicator color={COLORS.cyan} size="large" />}
        </View>
        
        {!isDefault && (
            <View style={styles.bottomControls}>
                <TouchableOpacity style={styles.button} onPress={handleNewPeriod} disabled={isSaving}><Text style={styles.buttonText}>NEW PERIOD</Text></TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={isSaving || !hasChanges}>
                    {isSaving ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>SAVE</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.deleteButton]} disabled={isDefault || isNew || isSaving} onPress={() => setIsDeleteModalVisible(true)}><Text style={styles.buttonText}>DELETE</Text></TouchableOpacity>
            </View>
        )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingBottom: 10, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 20, },
  backButton: { paddingRight: 15, },
  titleInput: { 
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text, 
    fontSize: 24, 
    fontWeight: 'bold',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    textAlign: 'center',
  },
  daySelectorContainer: { flexDirection: 'row', },
  dayButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 4, },
  dayButtonActive: { backgroundColor: COLORS.cyan, borderColor: COLORS.cyan },
  dayButtonText: { color: COLORS.textSecondary },
  dayButtonTextActive: { color: COLORS.text, fontWeight: 'bold' },
  chartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  bottomControls: { flexDirection: 'row', justifyContent: 'center', paddingTop: 10, },
  button: { backgroundColor: COLORS.cyan, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, marginHorizontal: 10, minWidth: 120, alignItems: 'center' },
  deleteButton: { backgroundColor: COLORS.red },
  buttonText: { color: COLORS.text, fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', flexDirection: 'row' },
  modalContent: { backgroundColor: COLORS.background, borderRadius: 20, padding: 15, width: '70%', maxHeight: '95%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalScrollView: { flexGrow: 1, justifyContent: 'center' },
  modalSection: { marginVertical: 10 },
  modalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modalSeparator: { color: COLORS.text, fontSize: 30, fontWeight: 'bold', marginHorizontal: 5, textAlignVertical: 'center', includeFontPadding: false },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border },
  modalSideButtonContainer: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
  modalSideButton: { width: 120, height: 60, justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  numberInputContainer: { alignItems: 'center', marginHorizontal: 3 },
  numberInputButton: { padding: 8 },
  numberDisplay: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginVertical: 4 },
  numberDisplayText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold' },
  errorModalContent: { backgroundColor: COLORS.background, borderRadius: 20, padding: 20, width: '80%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  errorModalTitle: { color: COLORS.orange, fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  errorModalMessage: { color: COLORS.text, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  disabledInput: { opacity: 0.5 },
});

export default ProfileDetailScreen;
