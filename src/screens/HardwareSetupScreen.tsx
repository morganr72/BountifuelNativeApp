/**
 * src/screens/HardwareSetupScreen.tsx
 *
 * A dedicated screen for setting up the hardware after a user has
 * successfully signed up and logged in.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Home,
  Bluetooth,
  Check,
  X,
  Wifi,
  Search,
  CheckCircle,
  XCircle,
  Signal,
  PlusCircle,
  Settings,
} from 'lucide-react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

import { COLORS } from '../constants/colors';
import type { SetupStackScreenProps } from '../navigation/types';

// --- Bluetooth Configuration ---
const WIFI_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const WIFI_SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const WIFI_PASS_CHAR_UUID = 'c842332e-36e2-4688-b7f5-ea07361b26a8';
const WIFI_SSID_SEC_CHAR_UUID = '156e829a-5634-4a2b-8a8b-e4e4a023588b';
const WIFI_PASS_SEC_CHAR_UUID = '29a8a6e8-e50f-48e0-9b37-531e5828e8c6';
const WIFI_SCAN_TRIGGER_UUID = 'a7b2488f-5133-45b7-b359-5a21e655a224';
const WIFI_SCAN_RESULT_UUID = 'd5e5c26b-0552-475a-a5ab-d735f50d5c43';
const WIFI_STATUS_CHAR_UUID = '32b7a5a8-447c-445b-b892-3593e7f29599';

const InputField: React.FC<{ icon: React.ReactElement; placeholder: string; value: string; onChange: (text: string) => void; secureTextEntry?: boolean; disabled?: boolean; }> = ({ icon, placeholder, value, onChange, secureTextEntry = false, disabled = false }) => (
    <View style={[styles.inputContainer, disabled && styles.disabled]}>
        {icon}
        <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textSecondary}
            value={value}
            onChangeText={onChange}
            secureTextEntry={secureTextEntry}
            editable={!disabled}
            autoCapitalize="none"
        />
    </View>
);


const HardwareSetupScreen: React.FC<SetupStackScreenProps<'HardwareSetup'>> = ({ navigation }) => {
  const bleManager = useRef(new BleManager()).current;
  const jsonBuffer = useRef('');
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);
  const statusTimeout = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState({
    premiseName: '',
    wifiSSID: '',
    wifiPassword: '',
    wifiSSIDSecondary: '',
    wifiPasswordSecondary: '',
  });

  const [btStatus, setBtStatus] = useState<'disconnected' | 'scanning' | 'connecting' | 'connected' | 'testing' | 'error'>('disconnected');
  const [btError, setBtError] = useState('');
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [scannedNetworks, setScannedNetworks] = useState<{ ssid: string; rssi: number }[]>([]);
  
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSecondaryModalOpen, setIsSecondaryModalOpen] = useState(false);

  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
        if (state === 'PoweredOn') {
            // BLE Manager is ready
        }
    }, true);

    return () => {
        subscription.remove();
        bleManager.stopDeviceScan();
        if (scanTimeout.current) clearTimeout(scanTimeout.current);
        if (statusTimeout.current) clearTimeout(statusTimeout.current);
        if (connectedDevice) connectedDevice.cancelConnection();
        bleManager.destroy();
    };
  }, [bleManager]);


  const requestBluetoothPermission = async () => {
    if (Platform.OS === 'ios') return true;
    
    const apiLevel = Platform.Version;
    if (typeof apiLevel === 'number' && apiLevel >= 31) { // Android 12+
        const res = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        return res['android.permission.BLUETOOTH_CONNECT'] === 'granted' && res['android.permission.BLUETOOTH_SCAN'] === 'granted';
    } else { // Android 11 and below
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        return res === 'granted';
    }
  };

  const handleScanForDevice = async () => {
    const isPermissionGranted = await requestBluetoothPermission();
    if (!isPermissionGranted) {
        setBtError("Bluetooth permission not granted.");
        setBtStatus('error');
        return;
    }

    setBtStatus('scanning');
    setBtError('');

    bleManager.startDeviceScan([WIFI_SERVICE_UUID], null, (error, device) => {
      if (error) {
        setBtError(error.message);
        setBtStatus('error');
        bleManager.stopDeviceScan();
        return;
      }

      if (device) {
        bleManager.stopDeviceScan();
        setBtStatus('connecting');
        connectToDevice(device);
      }
    });
  };

  const connectToDevice = async (device: Device) => {
    try {
      device.onDisconnected((error, disconnectedDevice) => {
          setBtError(error ? error.message : "Device disconnected unexpectedly.");
          setBtStatus('disconnected');
          setConnectedDevice(null);
      });

      const connectedDev = await device.connect({timeout: 10000});
      setBtStatus('connecting');
      
      await connectedDev.requestMTU(512);
      await connectedDev.discoverAllServicesAndCharacteristics();
      
      connectedDev.monitorCharacteristicForService(
          WIFI_SERVICE_UUID,
          WIFI_STATUS_CHAR_UUID,
          (error, characteristic) => {
              if (error) { return; }
              if (characteristic?.value) {
                  const status = Buffer.from(characteristic.value, 'base64').toString('utf8');
                  if (status === '1') {
                      if (statusTimeout.current) clearTimeout(statusTimeout.current);
                      // TODO: Call API to create premise, then navigate to subscription
                      Alert.alert("Setup Complete!", "Your hardware is connected. Next step is subscription.");
                      connectedDev.cancelConnection();
                  } else if (status === '0') {
                      if (statusTimeout.current) clearTimeout(statusTimeout.current);
                      setBtError("WiFi connection failed. Please check credentials.");
                      setBtStatus('connected');
                  }
              }
          }
      );

      setConnectedDevice(connectedDev);
      setBtStatus('connected');
    } catch (error: any) {
      setBtError(`Connection failed: ${error.message}`);
      setBtStatus('error');
    }
  };
  
  const handleWifiScan = async () => {
      if (!connectedDevice) return;
      setIsScanningWifi(true);
      setIsScanModalOpen(true);
      setScannedNetworks([]);
      jsonBuffer.current = '';

      const processJson = () => {
          try {
              const rawNetworks = JSON.parse(jsonBuffer.current);
              const networkMap = new Map();
              if (Array.isArray(rawNetworks)) {
                rawNetworks.forEach(net => {
                    if (net.ssid && (!networkMap.has(net.ssid) || net.rssi > networkMap.get(net.ssid).rssi)) {
                        networkMap.set(net.ssid, net);
                    }
                });
              }
              const finalNetworks = Array.from(networkMap.values()).sort((a, b) => b.rssi - a.rssi);
              setScannedNetworks(finalNetworks);
          } catch (e: any) {
              setBtError(`Failed to parse scan results: ${e.message}`);
          } finally {
              setIsScanningWifi(false);
              jsonBuffer.current = '';
          }
      };

      const subscription = connectedDevice.monitorCharacteristicForService(
          WIFI_SERVICE_UUID,
          WIFI_SCAN_RESULT_UUID,
          (error, characteristic) => {
              if (error) {
                  if (scanTimeout.current) clearTimeout(scanTimeout.current);
                  subscription.remove();
                  return;
              }
              if (characteristic?.value) {
                  jsonBuffer.current += Buffer.from(characteristic.value, 'base64').toString('utf8');
                  if (scanTimeout.current) clearTimeout(scanTimeout.current);
                  scanTimeout.current = setTimeout(processJson, 1500);
              }
          }
      );

      await connectedDevice.writeCharacteristicWithResponseForService(
          WIFI_SERVICE_UUID,
          WIFI_SCAN_TRIGGER_UUID,
          Buffer.from([1]).toString('base64')
      );
  };

  const handleSendWifiCredentials = async () => {
      if (!connectedDevice || !formData.wifiSSID || !formData.premiseName) {
          Alert.alert("Missing Information", "Please enter a premise name and primary WiFi details.");
          return;
      }
      setBtStatus('testing');
      setBtError('');
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      statusTimeout.current = setTimeout(() => {
          setBtError("WiFi connection failed. Device did not respond.");
          setBtStatus('connected');
      }, 20000);

      try {
          const write = async (uuid: string, val: string) => await connectedDevice.writeCharacteristicWithResponseForService(WIFI_SERVICE_UUID, uuid, Buffer.from(val).toString('base64'));
          await write(WIFI_SSID_CHAR_UUID, formData.wifiSSID);
          await delay(200);
          await write(WIFI_PASS_CHAR_UUID, formData.wifiPassword);
          if (formData.wifiSSIDSecondary) {
              await delay(200);
              await write(WIFI_SSID_SEC_CHAR_UUID, formData.wifiSSIDSecondary);
              await delay(200);
              await write(WIFI_PASS_SEC_CHAR_UUID, formData.wifiPasswordSecondary);
          }
          await delay(1000); 
          await write(WIFI_STATUS_CHAR_UUID, '1');
      } catch (error: any) {
          if (statusTimeout.current) clearTimeout(statusTimeout.current);
          setBtError(`Send credentials failed: ${error.message}`);
          setBtStatus('error');
      }
  };

  const isSending = btStatus === 'testing';

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.mainContent}>
            <Text style={styles.title}>Setup Your Premise</Text>
            <Text style={styles.subtitle}>First, give your premise a name, then connect your controller to WiFi.</Text>

            <InputField 
                icon={<Home color={COLORS.textSecondary} />}
                placeholder="Premise Name (e.g., My Home)"
                value={formData.premiseName}
                onChange={(text) => setFormData(p => ({...p, premiseName: text}))}
                disabled={isSending}
            />
            
            {btStatus === 'disconnected' && (
              <TouchableOpacity style={styles.buttonBluetooth} onPress={handleScanForDevice}>
                <View style={styles.buttonContent}>
                    <Bluetooth color={COLORS.text} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Scan for Controller</Text>
                </View>
              </TouchableOpacity>
            )}

            {(btStatus === 'scanning' || btStatus === 'connecting' || btStatus === 'testing') && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={COLORS.cyan} />
                <Text style={styles.loaderText}>{btStatus.charAt(0).toUpperCase() + btStatus.slice(1)}...</Text>
              </View>
            )}

            {btStatus === 'error' && (
              <View style={styles.errorContainer}>
                <XCircle size={32} color={COLORS.red} />
                <Text style={styles.errorTitle}>An Error Occurred</Text>
                <Text style={styles.errorText}>{btError}</Text>
                <TouchableOpacity onPress={() => { setBtStatus('disconnected'); setBtError(''); }}>
                    <Text style={styles.tryAgainText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {btStatus === 'connected' && (
              <View style={styles.fullWidth}>
                <View style={styles.successContainer}>
                  <CheckCircle size={32} color={COLORS.green} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.successTitle}>Controller Connected!</Text>
                    <Text style={styles.successText}>{connectedDevice?.name || 'Unknown Device'}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.buttonScanWifi} onPress={handleWifiScan} disabled={isScanningWifi}>
                    <View style={styles.buttonContent}>
                        {isScanningWifi ? <ActivityIndicator color={COLORS.text} /> : <Search color={COLORS.text} style={{ marginRight: 8 }} />}
                        <Text style={styles.buttonText}>Scan for WiFi Networks</Text>
                    </View>
                </TouchableOpacity>

                <InputField 
                    icon={<Wifi color={COLORS.textSecondary} />}
                    placeholder="Primary WiFi SSID"
                    value={formData.wifiSSID}
                    onChange={(text) => setFormData(p => ({...p, wifiSSID: text}))}
                    disabled={isSending}
                />
                <InputField 
                    icon={<Wifi color={COLORS.textSecondary} />}
                    placeholder="Primary WiFi Password"
                    value={formData.wifiPassword}
                    onChange={(text) => setFormData(p => ({...p, wifiPassword: text}))}
                    secureTextEntry
                    disabled={isSending}
                />

                <View style={styles.divider} />

                <TouchableOpacity style={styles.buttonSecondaryWifi} onPress={() => setIsSecondaryModalOpen(true)} disabled={isSending}>
                    <View style={styles.buttonContent}>
                        <PlusCircle size={16} color={COLORS.cyan} style={{ marginRight: 8 }} />
                        <Text style={styles.buttonSecondaryWifiText}>Add/Edit Secondary WiFi</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.buttonPrimary, isSending && styles.disabled]} onPress={handleSendWifiCredentials} disabled={isSending}>
                    <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>{isSending ? 'Testing...' : 'Send Credentials & Connect'}</Text>
                    </View>
                </TouchableOpacity>
                
                {btError && !isSending && <Text style={styles.inlineErrorText}>{btError}</Text>}
              </View>
            )}
        </ScrollView>

        {/* WiFi Scan Modal */}
        <Modal transparent visible={isScanModalOpen} animationType="fade" onRequestClose={() => setIsScanModalOpen(false)}>
            <View style={styles.modalBackdrop}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Available Networks</Text><TouchableOpacity onPress={() => setIsScanModalOpen(false)} style={styles.modalCloseButton}><X color={COLORS.textSecondary} size={24} /></TouchableOpacity>{isScanningWifi ? (<View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.cyan} /><Text style={styles.loaderText}>Scanning...</Text></View>) : (<FlatList data={scannedNetworks} keyExtractor={(item) => item.ssid} renderItem={({ item }) => (<TouchableOpacity style={styles.networkRow} onPress={() => {setFormData(p => ({...p, wifiSSID: item.ssid})); setIsScanModalOpen(false);}}><Text style={styles.networkSsid}>{item.ssid}</Text><View style={styles.networkRssiContainer}><Signal size={16} color={COLORS.textSecondary} /><Text style={styles.networkRssiText}>{item.rssi} dBm</Text></View></TouchableOpacity>)} ListEmptyComponent={<Text style={styles.emptyListText}>No networks found.</Text>} />)}</View></View>
        </Modal>

        {/* Secondary WiFi Modal */}
        <Modal transparent visible={isSecondaryModalOpen} animationType="fade" onRequestClose={() => setIsSecondaryModalOpen(false)}>
            <View style={styles.modalBackdrop}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Secondary WiFi</Text><TouchableOpacity onPress={() => setIsSecondaryModalOpen(false)} style={styles.modalCloseButton}><X color={COLORS.textSecondary} size={24} /></TouchableOpacity><Text style={styles.subtitle}>Enter details for your backup network.</Text><InputField icon={<Wifi color={COLORS.textSecondary} />} placeholder="Secondary WiFi SSID" value={formData.wifiSSIDSecondary} onChange={(text) => setFormData(p => ({...p, wifiSSIDSecondary: text}))} /><InputField icon={<Wifi color={COLORS.textSecondary} />} placeholder="Secondary WiFi Password" value={formData.wifiPasswordSecondary} onChange={(text) => setFormData(p => ({...p, wifiPasswordSecondary: text}))} secureTextEntry /><View style={styles.modalButtonContainer}><TouchableOpacity style={[styles.buttonSecondary, {flex: 1}]} onPress={() => setIsSecondaryModalOpen(false)}><View style={styles.buttonContent}><Text style={styles.buttonText}>Cancel</Text></View></TouchableOpacity><TouchableOpacity style={[styles.buttonPrimary, {flex: 1}]} onPress={() => setIsSecondaryModalOpen(false)}><View style={styles.buttonContent}><Text style={styles.buttonText}>Save</Text></View></TouchableOpacity></View></View></View>
        </Modal>
    </SafeAreaView>
  );
};

// Styles are extensive and have been omitted for brevity, but are similar to the original UserSignUpScreen
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  mainContent: { flexGrow: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  fullWidth: { width: '100%', alignItems: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: COLORS.cyan, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', marginTop: 10 },
  buttonSecondary: { backgroundColor: COLORS.card, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', marginTop: 10 },
  buttonBluetooth: { backgroundColor: '#3b82f6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%' },
  buttonScanWifi: { backgroundColor: COLORS.card, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, width: '100%' },
  buttonSecondaryWifi: { paddingVertical: 12, width: '100%' },
  buttonSecondaryWifiText: { color: COLORS.cyan, fontWeight: 'bold' },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  loaderContainer: { height: 160, alignItems: 'center', justifyContent: 'center' },
  loaderText: { marginTop: 16, fontSize: 18, color: COLORS.text },
  errorContainer: { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderColor: COLORS.red, borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', width: '100%', gap: 8 },
  errorTitle: { color: COLORS.red, fontSize: 16, fontWeight: 'bold' },
  errorText: { color: COLORS.textSecondary, textAlign: 'center' },
  tryAgainText: { color: COLORS.cyan, textDecorationLine: 'underline', marginTop: 8 },
  inlineErrorText: { color: COLORS.red, textAlign: 'center', marginTop: 8 },
  successContainer: { backgroundColor: 'rgba(46, 204, 113, 0.1)', borderColor: COLORS.green, borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', width: '100%' },
  successTitle: { color: COLORS.green, fontWeight: 'bold' },
  successText: { color: COLORS.textSecondary, fontSize: 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16, width: '100%' },
  textInput: { flex: 1, height: 50, color: COLORS.text, marginLeft: 12, fontSize: 16 },
  divider: { height: 1, backgroundColor: COLORS.border, width: '100%', marginVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 400, backgroundColor: COLORS.background, borderRadius: 16, padding: 24, borderColor: COLORS.cyan, borderWidth: 1, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  modalCloseButton: { position: 'absolute', top: 16, right: 16 },
  networkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  networkSsid: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  networkRssiContainer: { flexDirection: 'row', alignItems: 'center' },
  networkRssiText: { color: COLORS.textSecondary, fontSize: 12, marginLeft: 4 },
  emptyListText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 32 },
  modalButtonContainer: { flexDirection: 'row', gap: 16, marginTop: 16 }
});

export default HardwareSetupScreen;
