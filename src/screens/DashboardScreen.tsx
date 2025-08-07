/**
 * src/screens/DashBoardScreen.tsx
 *
 * --- UPDATE: Centralized API endpoint usage. ---
 * --- FIX: Implemented platform-specific header padding for Android status bar. ---
 */
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Modal, FlatList, Platform, StatusBar } from 'react-native';
import { Svg, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import RNLinearGradient from 'react-native-linear-gradient';
import { Home, Droplet, AlertCircle, Loader, ChevronDown, MapPin, X, LogOut, WifiOff } from 'lucide-react-native';
import { getCurrentUser, signOut } from 'aws-amplify/auth';

import { COLORS } from '../constants/colors';
import { API_ENDPOINTS } from '../config/api';
import type { AppTabScreenProps } from '../navigation/types';
import { FlameIcon, WaterDropletIcon } from '../components/CustomIcons';
import { Gauge } from '../components/dashboard/Gauge';
import { GlassCard } from '../components/dashboard/GlassCard';
import { StatusDisplay } from '../components/dashboard/StatusDisplay';
import { fetchWithAuth } from '../api/fetchwithAuth';
import { useOrientation } from '../hooks/useOrientation';
import { usePremise, Premise } from '../context/PremiseContext';

// --- Type Definitions ---
type RunningStatus = {
  gas: 'heating' | 'water' | 'none';
  hp: 'heating' | 'water' | 'none';
};

type DashboardData = {
  destemplow: number;
  destemphigh: number;
  roomtemp: number;
  watertemp: number;
  tankcapacity: number;
  watervol: number;
  gascost: number;
  actcost: number;
  name: string;
  boosttype: 'H' | 'W' | 'N' | 'C';
  running_status: RunningStatus;
};

// --- Premise Selector Modal Component ---
const PremiseSelectorModal: React.FC<{
  visible: boolean;
  premises: Premise[];
  onClose: () => void;
  onSelect: (premise: Premise) => void;
}> = ({ visible, premises, onClose, onSelect }) => (
  <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Select a Premise</Text>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}><X color={COLORS.textSecondary} size={24} /></TouchableOpacity>
        <FlatList
          data={premises}
          keyExtractor={(item) => item.PremiseId}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.premiseRow} onPress={() => onSelect(item)}>
              <MapPin color={COLORS.cyan} size={20} />
              <Text style={styles.premiseAddress}>{item.PremiseName || item.PremiseId}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

const DashboardScreen: React.FC<AppTabScreenProps<'Dashboard'>> = () => {
  useOrientation('PORTRAIT');
  const { width: screenWidth } = useWindowDimensions();
  const { currentPremise, premisesList, setCurrentPremise } = usePremise();

  const [activePage, setActivePage] = useState<'heating' | 'water'>('heating');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoosting, setIsBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPremiseModalVisible, setIsPremiseModalVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  const fetchData = useCallback(async () => {
    if (!currentPremise) {
        setIsLoading(false);
        setError("No premise selected.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const url = `${API_ENDPOINTS.getDashboardData}?controllerId=${currentPremise.Controller}`;
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const apiContent = data.content?.[0];

      if (apiContent) {
        setDashboardData(apiContent);
      } else {
        throw new Error("API returned no content.");
      }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPremise]);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user.signInDetails?.loginId ?? 'user@email.com');
      } catch (e) { console.log('Could not retrieve user', e); }
    };
    initializeUser();
    fetchData();
  }, [fetchData]);

  const handleBoost = async (boostTypeToSet: 'H' | 'W') => {
    if (isBoosting || !dashboardData || !currentPremise) return;
    setIsBoosting(true);
    const heatWaterValue = dashboardData.boosttype === boostTypeToSet ? 'C' : boostTypeToSet;
    try {
      const payload = {
          heatwater: heatWaterValue,
          controllerId: currentPremise.Controller
      };
      await fetchWithAuth(API_ENDPOINTS.boost, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setDashboardData(prev => prev ? ({ ...prev, boosttype: heatWaterValue === 'C' ? 'N' : heatWaterValue }) : null);
      setTimeout(() => {
        fetchData().finally(() => setIsBoosting(false));
      }, 1500);
    } catch (err: any) {
      console.error("Failed to update boost status:", err);
      setError(err.message);
      setIsBoosting(false);
    }
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Good Morning!";
    if (currentHour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  const handleSelectPremise = (premise: Premise) => {
    setCurrentPremise(premise);
    setIsPremiseModalVisible(false);
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.cyan} /></View>;
    }
    if (error) {
      return <View style={styles.centered}><WifiOff size={48} color={COLORS.red} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={fetchData}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>;
    }
    if (!dashboardData) {
      return <View style={styles.centered}><Text style={styles.errorText}>No data available for this premise.</Text></View>;
    }

    const weeklySavings = (dashboardData.gascost || 0) - (dashboardData.actcost || 0);

    const HeatingDashboard = () => {
      const isBoostActive = dashboardData.boosttype === 'H';
      return (
        <View style={[styles.page, { width: screenWidth }]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Gauge value={dashboardData.roomtemp} min={16} max={25} lowThreshold={dashboardData.destemplow} highThreshold={dashboardData.destemphigh} label="ROOM TEMPERATURE" Icon={Home} size={screenWidth * 0.7} />
            <View style={styles.infoRow}>
              <GlassCard><Text style={styles.cardTitle}>Weekly Savings</Text><Text style={styles.cardValue}>£{weeklySavings.toFixed(2)}</Text></GlassCard>
              <GlassCard><Text style={styles.cardTitle}>Status</Text><StatusDisplay status={dashboardData.running_status} /></GlassCard>
            </View>
          </ScrollView>
          <View style={styles.boostButtonContainer}>
            <TouchableOpacity onPress={() => handleBoost('H')} disabled={isBoosting} style={styles.boostButton}>
              <RNLinearGradient colors={isBoostActive ? ['#ff9a44', '#ff6444'] : ['#38bdf8', '#3498db']} style={styles.boostButtonGradient}>
                {isBoosting && isBoostActive ? <Loader color={COLORS.text} /> : <FlameIcon color={COLORS.text} width={32} height={32} />}
                <Text style={styles.boostText}>HEAT BOOST</Text>
              </RNLinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ height: 30 }} />
        </View>
      );
    };

    const WaterStatusPage = () => {
      const isBoostActive = dashboardData.boosttype === 'W';
      return (
        <View style={[styles.page, { width: screenWidth }]}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Gauge value={dashboardData.watertemp} min={30} max={65} lowThreshold={45} highThreshold={55} label="WATER TEMPERATURE" Icon={Droplet} size={screenWidth * 0.7} />
            <View style={styles.infoRow}>
              <GlassCard><Text style={styles.cardTitle}>Tank Level</Text><Text style={styles.cardValue}>{((dashboardData.watervol || 0) / (dashboardData.tankcapacity || 1) * 100).toFixed(0)}%</Text></GlassCard>
              <GlassCard><Text style={styles.cardTitle}>Status</Text><StatusDisplay status={dashboardData.running_status} /></GlassCard>
            </View>
          </ScrollView>
          <View style={styles.boostButtonContainer}>
            <TouchableOpacity onPress={() => handleBoost('W')} disabled={isBoosting} style={styles.boostButton}>
              <RNLinearGradient colors={isBoostActive ? ['#38bdf8', '#3498db'] : ['#38bdf8', '#3498db']} style={styles.boostButtonGradient}>
                 {isBoosting && isBoostActive ? <Loader color={COLORS.text} /> : <WaterDropletIcon color={COLORS.text} width={32} height={32} />}
                <Text style={styles.boostText}>WATER BOOST</Text>
              </RNLinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ height: 30 }} />
        </View>
      );
    };

    return (
      <>
        <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false} 
            onScroll={(event) => { const pageIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth); setActivePage(pageIndex === 0 ? 'heating' : 'water'); }} 
            scrollEventThrottle={200}
        >
          <HeatingDashboard />
          <WaterStatusPage />
        </ScrollView>
        <View style={styles.pagination}>
          <View style={[styles.dot, activePage === 'heating' && styles.dotActive]} />
          <View style={[styles.dot, activePage === 'water' && styles.dotActive]} />
        </View>
      </>
    );
  };

  const Background = () => (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs><RadialGradient id="bgGrad" cx="50%" cy="0%" r="100%"><Stop offset="0%" stopColor={COLORS.backgroundLight} /><Stop offset="100%" stopColor={COLORS.background} /></RadialGradient></Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />
      </Svg>
    </View>
  );

  return (
    <View style={styles.container}>
      <Background />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
            <View style={{flex: 1}}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.emailText} numberOfLines={1}>{userEmail}</Text>
            </View>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.premiseSelector} onPress={() => setIsPremiseModalVisible(true)}>
                    <MapPin color={COLORS.textSecondary} size={16}/>
                    <Text style={styles.premiseText} numberOfLines={1}>{currentPremise?.PremiseName || 'No Premise'}</Text>
                    <ChevronDown color={COLORS.textSecondary} size={16}/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <LogOut color={COLORS.text} size={24} />
                </TouchableOpacity>
            </View>
        </View>
        {renderContent()}
      </SafeAreaView>
      <PremiseSelectorModal 
        visible={isPremiseModalVisible}
        premises={premisesList}
        onClose={() => setIsPremiseModalVisible(false)}
        onSelect={handleSelectPremise}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    page: { flex: 1 },
    scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    // --- FIX: Add platform-specific paddingTop for Android status bar ---
    header: { 
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        paddingHorizontal: 20, 
        paddingBottom: 10,
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    greeting: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
    emailText: { color: COLORS.textSecondary, fontSize: 16, flexShrink: 1 },
    premiseSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, maxWidth: 150 },
    premiseText: { color: COLORS.text, marginHorizontal: 6, flexShrink: 1 },
    signOutButton: { marginLeft: 16, padding: 8 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginVertical: 20 },
    cardTitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 8 },
    cardValue: { color: COLORS.text, fontSize: 24, fontWeight: 'bold' },
    boostButtonContainer: { paddingVertical: 10, paddingHorizontal: '5%', width: '100%' },
    boostButton: { width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8, },
    boostButtonGradient: { borderRadius: 25, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', },
    boostText: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
    pagination: { position: 'absolute', bottom: 15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
    dotActive: { backgroundColor: COLORS.text },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { color: COLORS.red, marginTop: 10, textAlign: 'center' },
    retryButton: { marginTop: 20, backgroundColor: COLORS.cyan, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 },
    retryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { width: '100%', backgroundColor: COLORS.background, borderRadius: 16, padding: 24, borderColor: COLORS.cyan, borderWidth: 1 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, marginBottom: 16 },
    modalCloseButton: { position: 'absolute', top: 16, right: 16 },
    premiseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    premiseAddress: { color: COLORS.text, fontSize: 16, marginLeft: 12 },
});

export default DashboardScreen;
