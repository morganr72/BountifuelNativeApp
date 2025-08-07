/**
 * src/screens/ConfirmSignUpScreen.tsx
 *
 * --- UPDATED to handle navigation correctly after confirmation ---
 * Instead of an alert, the screen now updates to show a success message
 * and a button to proceed to the sign-in screen.
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
} from 'react-native';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { KeyRound, MailCheck, CheckCircle, ArrowRight } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import type { AuthStackScreenProps } from '../navigation/types';

const ConfirmSignUpScreen: React.FC<AuthStackScreenProps<'ConfirmSignUp'>> = ({ route, navigation }) => {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false); // New state to control the UI

  const handleConfirmSignUp = async () => {
    if (!code) {
      Alert.alert('Missing Code', 'Please enter the verification code.');
      return;
    }
    setIsLoading(true);
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      if (isSignUpComplete) {
        // Instead of an alert, we now update the state
        setIsConfirmed(true);
      }
    } catch (error: any) {
      Alert.alert('Confirmation Error', error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCode({ username: email });
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (error: any) {
      Alert.alert('Error Resending Code', error.message || 'An unknown error occurred.');
    }
  };

  // If the account is confirmed, show the success view
  if (isConfirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successCircle}>
            <CheckCircle size={64} color={COLORS.background} />
          </View>
          <Text style={styles.title}>Account Confirmed!</Text>
          <Text style={styles.subtitle}>You can now sign in to continue.</Text>
          <TouchableOpacity
            style={styles.buttonPrimary}
            onPress={() => navigation.navigate('SignIn')}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>Proceed to Sign In</Text>
              <ArrowRight color={COLORS.text} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Otherwise, show the code entry form
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the verification code sent to {email}
        </Text>

        <View style={styles.inputContainer}>
          <KeyRound color={COLORS.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Verification Code"
            placeholderTextColor={COLORS.textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleConfirmSignUp} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <View style={styles.buttonContent}>
              <MailCheck color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Confirm Account</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive a code? </Text>
          <TouchableOpacity onPress={handleResendCode}>
            <Text style={styles.linkText}>Resend</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16 },
  textInput: { flex: 1, height: 50, color: COLORS.text, marginLeft: 12, fontSize: 16 },
  buttonPrimary: { backgroundColor: COLORS.cyan, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  linkText: { color: COLORS.cyan, fontSize: 14, fontWeight: 'bold' },
  successCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: COLORS.green,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 24,
  },
});

export default ConfirmSignUpScreen;
