/**
 * src/screens/SignInScreen.tsx
 *
 * A new screen to handle user sign-in. It provides a form for email and
 * password and links to the sign-up flow for new users.
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
import { signIn } from 'aws-amplify/auth';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import type { AuthStackScreenProps } from '../navigation/types';

const SignInScreen: React.FC<AuthStackScreenProps<'SignIn'>> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const { isSignedIn } = await signIn({ username: email, password });
      if (!isSignedIn) {
        // This case is rare but handles scenarios like needing to confirm a new password
        Alert.alert('Sign In Incomplete', 'Please follow the prompts to complete sign in.');
      }
      // On successful sign-in, the AppNavigator will automatically switch to the main app.
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

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

        <View style={styles.inputContainer}>
          <Lock color={COLORS.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSignIn} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <View style={styles.buttonContent}>
              <LogIn color={COLORS.text} style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Sign In</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp', {})}>
            <Text style={styles.linkText}>Sign Up</Text>
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
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 16 },
  textInput: { flex: 1, height: 50, color: COLORS.text, marginLeft: 12, fontSize: 16 },
  buttonPrimary: { backgroundColor: COLORS.cyan, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  linkText: { color: COLORS.cyan, fontSize: 14, fontWeight: 'bold' },
});

export default SignInScreen;
