/**
 * =================================================================
 * IMPORTANT: This file should be saved at `src/screens/DashBoardScreen.tsx`
 * =================================================================
 *
 * The main dashboard screen of the application.
 * Features a swipeable view for Heating and Water dashboards.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator
} from 'react-native';
import { Svg, Rect, Defs, RadialGradient, Stop } from 'react-native-svg';
import RNLinearGradient from 'react-native-linear-gradient';
import { Home, Droplet, AlertCircle, Loader } from 'lucide-react-native';
import { getCurrentUser } from 'aws-amplify/auth';

// UPDATED: Using absolute paths for more reliable module resolution
import { COLORS } from 'constants/colors';
import type { AppTabScreenProps } from 'navigation/types';
import { FlameIcon, WaterDropletIcon } from 'components/CustomIcons';
import { Gauge } from 'components/dashboard/Gauge';
import { GlassCard } from 'components/dashboard/GlassCard';
import { StatusDisplay } from 'components/dashboard/StatusDisplay';
import { fetchWithAuth } from 'api/fetchWithAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define types for the dashboard's data
type RunningStatus = { gas: 'heating' | 'water' | 'none'; hp: 'heating' | 'water' | 'none'; };
type DashboardData = {
  userName: string;
  weeklySavings: number;
  roomTemperature: number;
  waterTemperature: number;
  destTempLow: number;
  destTempHigh: number;
  boostType: 'H' | 'W' | 'N' | 'C';
  running_status: RunningStatus;
};

const DashboardScreen: React.FC<AppTabScreenProps<'Dashboard'>> = ({ navigation, route }) => {
  const [activePage, setActivePage] = useState<'heating' | 'water'>('heating');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isBoosting, setIsBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const response = await fetchWithAuth('https://kbrcagx0xi.execute-api.eu-west-2.amazonaws.com/default/FrontPageAPIv2');
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const apiContent = data.content?.[0];

      if (apiContent) {
        setDashboardData({
          userName: apiContent.name || "User",
          weeklySavings: parseFloat(apiContent.gascost) - parseFloat(apiContent.actcost),
          roomTemperature: parseFloat(apiContent.roomtemp),
          waterTemperature: parseFloat(apiContent.watertemp),
          destTempLow: parseFloat(apiContent.destemplow),
          destTempHigh: parseFloat(apiContent.destemphigh),
          boostType: apiContent.boosttype,
          running_status: apiContent.running_status
        });
      } else {
        throw new Error("API returned no content.");
      }
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await getCurrentUser();
        setUserEmail(user.signInDetails?.loginId ?? 'user@email.com');
      } catch (e) {
        console.log('Could not retrieve user', e);
      }
      fetchData();
    };
    initialize();
  }, [fetchData]);

  const handleBoost = async (boostTypeToSet: 'H' | 'W') => {
    if (isBoosting || !dashboardData) return;
    setIsBoosting(true);
    // If the selected boost is already active, send 'C' to cancel it.
    const heatWaterValue = dashboardData.boostType === boostTypeToSet ? 'C' : boostTypeToSet;
    try {
      await fetchWithAuth('https://3gtpvcw888.execute-api.eu-west-2.amazonaws.com/default/BoostAppAPIv2', {
        method: 'POST',
        body: JSON.stringify({ heatwater: heatWaterValue })
      });
      // Optimistically update the UI
      setDashboardData(prev => prev ? ({ ...prev, boostType: heatWaterValue === 'C' ? 'N' : heatWaterValue }) : null);
      // Re-fetch data after a short delay to confirm the state
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

  const renderContent = () => {
    if (isLoading) {
      return <View style={styles.centered}><Loader size={48} color={COLORS.text} /></View>;
    }
    if (error) {
      return <View style={styles.centered}><AlertCircle size={48} color={COLORS.red} /><Text style={styles.errorText}>{error}</Text></View>;
    }
    if (!dashboardData) {
      return <View style={styles.centered}><Text style={styles.errorText}>No data available.</Text></View>;
    }

    const HeatingDashboard = () => {
      const isBoostActive = dashboardData.boostType === 'H';
      return (
        <View style={styles.page}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Gauge value={dashboardData.roomTemperature} min={16} max={25} lowThreshold={dashboardData.destTempLow} highThreshold={dashboardData.destTempHigh} label="ROOM TEMPERATURE" Icon={Home} />
            <View style={styles.infoRow}>
              <GlassCard><Text style={styles.cardTitle}>Weekly Savings</Text><Text style={styles.cardValue}>£{dashboardData.weeklySavings.toFixed(2)}</Text></GlassCard>
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
      const isBoostActive = dashboardData.boostType === 'W';
      return (
        <View style={styles.page}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Gauge value={dashboardData.waterTemperature} min={30} max={65} lowThreshold={45} highThreshold={55} label="WATER TEMPERATURE" Icon={Droplet} />
            <View style={styles.infoRow}>
              <GlassCard><Text style={styles.cardTitle}>Tank Level</Text><Text style={styles.cardValue}>75%</Text></GlassCard>
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
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(event) => { const pageIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH); setActivePage(pageIndex === 0 ? 'heating' : 'water'); }} scrollEventThrottle={200}>
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
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>
        {renderContent()}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    page: { width: SCREEN_WIDTH, flex: 1 },
    scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    greeting: { color: COLORS.text, fontSize: 28, fontWeight: 'bold' },
    emailText: { color: COLORS.textSecondary, fontSize: 16 },
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
    errorText: { color: COLORS.red, marginTop: 10, textAlign: 'center' }
});

export default DashboardScreen;
