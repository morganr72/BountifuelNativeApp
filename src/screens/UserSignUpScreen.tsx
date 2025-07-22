/**
 * src/screens/UserSignUpScreen.tsx
 *
 * A multi-step screen for user sign-up and hardware setup.
 * This version includes the full Bluetooth LE implementation for ESP32 WiFi provisioning.
 *
 * V16: Implements a more robust styling fix for button content centering.
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
} from 'react-native';
import {
  User,
  Home,
  Bluetooth,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Wifi,
  Search,
  CheckCircle,
  XCircle,
  Signal,
  PlusCircle,
  Settings,
} from 'lucide-react-native';
import { BleManager, Device, Characteristic, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; // Use buffer for base64 encoding/decoding

import { COLORS } from '../constants/colors';
import type { SettingsStackScreenProps } from '../navigation/types';
import { useOrientation } from '../hooks/useOrientation';

// --- Bluetooth Configuration (from original UserSignUp.js) ---
const WIFI_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const WIFI_SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const WIFI_PASS_CHAR_UUID = 'c842332e-36e2-4688-b7f5-ea07361b26a8';
const WIFI_SSID_SEC_CHAR_UUID = '156e829a-5634-4a2b-8a8b-e4e4a023588b';
const WIFI_PASS_SEC_CHAR_UUID = '29a8a6e8-e50f-48e0-9b37-531e5828e8c6';
const WIFI_SCAN_TRIGGER_UUID = 'a7b2488f-5133-45b7-b359-5a21e655a224';
const WIFI_SCAN_RESULT_UUID = 'd5e5c26b-0552-475a-a5ab-d735f50d5c43';
const WIFI_STATUS_CHAR_UUID = '32b7a5a8-447c-445b-b892-3593e7f29599';

// --- Reusable UI Components ---

const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.progressContainer}>
    <View style={[styles.progressIconWrapper, currentStep >= 1 && styles.progressIconActive]}>
      {currentStep > 1 ? <Check color={COLORS.text} /> : <User color={COLORS.text} />}
    </View>
    <View style={[styles.progressLine, currentStep > 1 && styles.progressLineActive]} />
    <View style={[styles.progressIconWrapper, currentStep >= 2 && styles.progressIconActive]}>
      {currentStep > 2 ? <Check color={COLORS.text} /> : <Home color={COLORS.text} />}
    </View>
    <View style={[styles.progressLine, currentStep > 2 && styles.progressLineActive]} />
    <View style={[styles.progressIconWrapper, currentStep >= 3 && styles.progressIconActive]}>
      {currentStep > 3 ? <Check color={COLORS.text} /> : <Bluetooth color={COLORS.text} />}
    </View>
  </View>
);

interface InputFieldProps {
  icon: React.ReactElement;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  secureTextEntry?: boolean;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ icon, placeholder, value, onChange, secureTextEntry = false, disabled = false }) => (
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


const UserSignUpScreen: React.FC<SettingsStackScreenProps<'SignUp'>> = ({ route, navigation }) => {
  useOrientation('PORTRAIT');
  
  const bleManager = useRef(new BleManager()).current;
  const jsonBuffer = useRef('');
  const scanTimeout = useRef<NodeJS.Timeout | null>(null);
  const statusTimeout = useRef<NodeJS.Timeout | null>(null);

  const startStep = route.params?.startStep || 1;

  const [step, setStep] = useState(startStep);
  const [formData, setFormData] = useState({
    wifiSSID: '',
    wifiPassword: '',
    wifiSSIDSecondary: '',
    wifiPasswordSecondary: '',
  });

  // BLE State
  const [btStatus, setBtStatus] = useState<'disconnected' | 'scanning' | 'connecting' | 'connected' | 'testing' | 'error'>('disconnected');
  const [btError, setBtError] = useState('');
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [scannedNetworks, setScannedNetworks] = useState<{ ssid: string; rssi: number }[]>([]);
  
  // Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isSecondaryModalOpen, setIsSecondaryModalOpen] = useState(false);

  // --- Lifecycle and Cleanup ---
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

  // --- BLE Logic ---
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
          if (step < 4) {
            setBtError(error ? error.message : "Device disconnected unexpectedly.");
            setBtStatus('disconnected');
          }
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
              if (error) {
                  if (!error.message.includes("cancelled")) {
                      setBtError(`Status listener error: ${error.message}`);
                  }
                  return;
              }

              if (characteristic?.value) {
                  const status = Buffer.from(characteristic.value, 'base64').toString('utf8');
                  if (status === '1') {
                      if (statusTimeout.current) clearTimeout(statusTimeout.current);
                      setStep(4);
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
      if (!connectedDevice) {
          setBtError("Device not connected.");
          setBtStatus('error');
          return;
      }
      setIsScanningWifi(true);
      setIsScanModalOpen(true);
      setScannedNetworks([]);
      jsonBuffer.current = '';

      let subscription: Subscription | null = null;

      const processJson = () => {
          if (subscription) subscription.remove();
          try {
              if (jsonBuffer.current.length === 0) throw new Error("No data received from device.");
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
              if (finalNetworks.length === 0) throw new Error("Parsed networks list is empty.");
              setScannedNetworks(finalNetworks);
          } catch (e: any) {
              setBtError(`Failed to parse scan results: ${e.message}`);
              setScannedNetworks([]);
          } finally {
              setIsScanningWifi(false);
              jsonBuffer.current = '';
          }
      };

      try {
          subscription = connectedDevice.monitorCharacteristicForService(
              WIFI_SERVICE_UUID,
              WIFI_SCAN_RESULT_UUID,
              (error, characteristic) => {
                  if (error) {
                      if (error.message.includes("cancelled")) return;
                      setBtError(`WiFi Scan failed: ${error.message}`);
                      setIsScanningWifi(false);
                      if (subscription) subscription.remove();
                      if (scanTimeout.current) clearTimeout(scanTimeout.current);
                      return;
                  }
                  if (characteristic?.value) {
                      const chunk = Buffer.from(characteristic.value, 'base64').toString('utf8');
                      jsonBuffer.current += chunk;
                      
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

      } catch (error: any) {
          setBtError(`WiFi Scan trigger failed: ${error.message}`);
          setIsScanningWifi(false);
          setIsScanModalOpen(false);
          if (subscription) subscription.remove();
      }
  };

  const handleSendWifiCredentials = async () => {
      if (!connectedDevice || !formData.wifiSSID) {
          setBtError("Device not connected or Primary SSID is empty.");
          setBtStatus('error');
          return;
      }
      setBtStatus('testing');
      setBtError('');
      
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const handleTimeout = () => {
          setBtError("WiFi connection failed. Device did not respond in time.");
          setBtStatus('connected');
      };

      statusTimeout.current = setTimeout(handleTimeout, 20000);

      try {
          const writeCharacteristic = async (uuid: string, value: string) => {
              await connectedDevice.writeCharacteristicWithResponseForService(
                  WIFI_SERVICE_UUID,
                  uuid,
                  Buffer.from(value).toString('base64')
              );
          };

          await writeCharacteristic(WIFI_SSID_CHAR_UUID, formData.wifiSSID);
          await delay(200);
          await writeCharacteristic(WIFI_PASS_CHAR_UUID, formData.wifiPassword);
          await delay(200);

          if (formData.wifiSSIDSecondary && formData.wifiPasswordSecondary) {
              await writeCharacteristic(WIFI_SSID_SEC_CHAR_UUID, formData.wifiSSIDSecondary);
              await delay(200);
              await writeCharacteristic(WIFI_PASS_SEC_CHAR_UUID, formData.wifiPasswordSecondary);
          }
          
          await delay(1000); 
          await writeCharacteristic(WIFI_STATUS_CHAR_UUID, '1');

      } catch (error: any) {
          if (statusTimeout.current) clearTimeout(statusTimeout.current);
          setBtError(`Send credentials failed: ${error.message}`);
          setBtStatus('error');
      }
  };

  // --- UI and Navigation ---
  const handleBack = () => {
    if (step === 3 && startStep === 3) {
      navigation.goBack();
    } else {
      setStep(s => s - 1);
    }
  };
  const handleExit = () => navigation.navigate('SettingsStack', { screen: 'SettingsList' });

  const renderStep = () => {
    switch (step) {
        case 1:
        case 2:
            return (
                <View style={styles.placeholderContainer}>
                    <Text style={styles.title}>User & Property Setup</Text>
                    <Text style={styles.text}>This section would contain the forms for user and property details.</Text>
                    <TouchableOpacity style={styles.buttonPrimary} onPress={() => setStep(s => s + 1)}>
                        <View style={styles.buttonContent}>
                            <Text style={styles.buttonText}>Next</Text>
                            <ArrowRight color={COLORS.text} style={{ marginLeft: 8 }} />
                        </View>
                    </TouchableOpacity>
                </View>
            );
      case 3:
        const isSending = btStatus === 'testing';
        return (
          <ScrollView contentContainerStyle={styles.stepContainer}>
            <Text style={styles.title}>Hardware Setup</Text>
            <Text style={styles.subtitle}>Connect your controller to WiFi.</Text>
            
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
                <Text style={styles.loaderText}>{btStatus === 'testing' ? 'Testing Connection...' : (btStatus.charAt(0).toUpperCase() + btStatus.slice(1) + '...')}</Text>
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

            <TouchableOpacity style={styles.buttonSecondary} onPress={handleBack}>
                <View style={styles.buttonContent}>
                    <ArrowLeft color={COLORS.text} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Back</Text>
                </View>
            </TouchableOpacity>
          </ScrollView>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.successCircle}>
              <Check size={64} color={COLORS.text} />
            </View>
            <Text style={styles.title}>Setup Complete!</Text>
            <Text style={styles.subtitle}>Your hardware is connected and you're all set.</Text>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.navigate(startStep === 3 ? 'SettingsList' : 'Dashboard')}>
                <View style={styles.buttonContent}>
                    {startStep === 3 ? <Settings color={COLORS.text} style={{ marginRight: 8 }} /> : null}
                    <Text style={styles.buttonText}>{startStep === 3 ? 'Back to Settings' : 'Go to Dashboard'}</Text>
                    {startStep !== 3 ? <ArrowRight color={COLORS.text} style={{ marginLeft: 8 }} /> : null}
                </View>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.mainContent}>
            <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
                <X color={COLORS.textSecondary} size={24} />
            </TouchableOpacity>
            <ProgressIndicator currentStep={step} />
            {renderStep()}
        </View>

        {/* WiFi Scan Modal */}
        <Modal
            transparent
            visible={isScanModalOpen}
            animationType="fade"
            onRequestClose={() => setIsScanModalOpen(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Available Networks</Text>
                    <TouchableOpacity onPress={() => setIsScanModalOpen(false)} style={styles.modalCloseButton}>
                        <X color={COLORS.textSecondary} size={24} />
                    </TouchableOpacity>
                    {isScanningWifi ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={COLORS.cyan} />
                            <Text style={styles.loaderText}>Scanning...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={scannedNetworks}
                            keyExtractor={(item) => item.ssid}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.networkRow} onPress={() => {
                                    setFormData(p => ({...p, wifiSSID: item.ssid}));
                                    setIsScanModalOpen(false);
                                }}>
                                    <Text style={styles.networkSsid}>{item.ssid}</Text>
                                    <View style={styles.networkRssiContainer}>
                                        <Signal size={16} color={COLORS.textSecondary} />
                                        <Text style={styles.networkRssiText}>{item.rssi} dBm</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyListText}>No networks found.</Text>}
                        />
                    )}
                </View>
            </View>
        </Modal>

        {/* Secondary WiFi Modal */}
        <Modal
            transparent
            visible={isSecondaryModalOpen}
            animationType="fade"
            onRequestClose={() => setIsSecondaryModalOpen(false)}
        >
            <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Secondary WiFi</Text>
                     <TouchableOpacity onPress={() => setIsSecondaryModalOpen(false)} style={styles.modalCloseButton}>
                        <X color={COLORS.textSecondary} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.subtitle}>Enter details for your backup network.</Text>
                    <InputField 
                        icon={<Wifi color={COLORS.textSecondary} />}
                        placeholder="Secondary WiFi SSID"
                        value={formData.wifiSSIDSecondary}
                        onChange={(text) => setFormData(p => ({...p, wifiSSIDSecondary: text}))}
                    />
                    <InputField 
                        icon={<Wifi color={COLORS.textSecondary} />}
                        placeholder="Secondary WiFi Password"
                        value={formData.wifiPasswordSecondary}
                        onChange={(text) => setFormData(p => ({...p, wifiPasswordSecondary: text}))}
                        secureTextEntry
                    />
                    <View style={styles.modalButtonContainer}>
                        <TouchableOpacity style={[styles.buttonSecondary, {flex: 1}]} onPress={() => setIsSecondaryModalOpen(false)}>
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonPrimary, {flex: 1}]} onPress={() => setIsSecondaryModalOpen(false)}>
                             <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>Save</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContent: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  exitButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  progressIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressIconActive: {
    backgroundColor: COLORS.cyan,
  },
  progressLine: {
    height: 4,
    width: 32,
    backgroundColor: COLORS.card,
  },
  progressLineActive: {
    backgroundColor: COLORS.cyan,
  },
  stepContainer: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
  },
  fullWidth: {
      width: '100%',
      alignItems: 'center',
      gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  text: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  // FIX: Create a dedicated style for the button's inner content
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: COLORS.cyan,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginTop: 10,
  },
  buttonBluetooth: {
    backgroundColor: '#3b82f6', // blue-600
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  buttonScanWifi: {
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
  },
  buttonSecondaryWifi: {
    paddingVertical: 12,
    width: '100%',
  },
  buttonSecondaryWifiText: {
      color: COLORS.cyan,
      fontWeight: 'bold',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
  loaderContainer: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.text,
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: COLORS.red,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  errorTitle: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  tryAgainText: {
      color: COLORS.cyan,
      textDecorationLine: 'underline',
      marginTop: 8,
  },
  inlineErrorText: {
      color: COLORS.red,
      textAlign: 'center',
      marginTop: 8,
  },
  successContainer: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderColor: COLORS.green,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  successTitle: {
    color: COLORS.green,
    fontWeight: 'bold',
  },
  successText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      width: '100%',
  },
  textInput: {
      flex: 1,
      height: 50,
      color: COLORS.text,
      marginLeft: 12,
      fontSize: 16,
  },
  divider: {
      height: 1,
      backgroundColor: COLORS.border,
      width: '100%',
      marginVertical: 8,
  },
  successCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: COLORS.green,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
  },
  // Modal Styles
  modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  modalContainer: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: COLORS.background,
      borderRadius: 16,
      padding: 24,
      borderColor: COLORS.cyan,
      borderWidth: 1,
      gap: 16,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  modalCloseButton: {
      position: 'absolute',
      top: 16,
      right: 16,
  },
  networkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
  },
  networkSsid: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '600',
  },
  networkRssiContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  networkRssiText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      marginLeft: 4,
  },
  emptyListText: {
      textAlign: 'center',
      color: COLORS.textSecondary,
      paddingVertical: 32,
  },
  modalButtonContainer: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
  }
});

export default UserSignUpScreen;
