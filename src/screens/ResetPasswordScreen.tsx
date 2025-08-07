/**
 * src/screens/ResetPasswordScreen.tsx
 *
 * A new screen to handle the multi-step password reset process.
 * It now accepts an optional email parameter to pre-fill the form.
 */
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { Mail, Lock, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import type { AuthStackScreenProps } from '../navigation/types';

const ResetPasswordScreen: React.FC<AuthStackScreenProps<'ResetPassword'>> = ({ route, navigation }) => {
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter code and new password
  const [email, setEmail] = useState(route.params?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      await resetPassword({ username: email });
      setStep(2); // Move to the next step on success
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!code || !newPassword) {
      Alert.alert('Missing Information', 'Please enter the code and your new password.');
      return;
    }
    setIsLoading(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      Alert.alert(
        'Success',
        'Your password has been reset. Please sign in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>

        {step === 1 ? (
          <>
            <Text style={styles.subtitle}>Enter your email to receive a reset code.</Text>
            <View style={styles.inputContainer}>
              <Mail color={COLORS.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="Email Address"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSendCode} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Send Code</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the code and your new password.</Text>
            <View style={styles.inputContainer}>
              <KeyRound color={COLORS.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="Verification Code"
                placeholderTextColor={COLORS.textSecondary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <Lock color={COLORS.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="New Password"
                placeholderTextColor={COLORS.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                {isPasswordVisible ? <EyeOff color={COLORS.textSecondary} /> : <Eye color={COLORS.textSecondary} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleConfirmReset} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  backButton: { position: 'absolute', top: 24, left: 24, zIndex: 1 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16 },
  textInput: { flex: 1, height: 50, color: COLORS.text, marginLeft: 12, fontSize: 16 },
  buttonPrimary: { backgroundColor: COLORS.cyan, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});

export default ResetPasswordScreen;
