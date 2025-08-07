/**
 * src/screens/UserSignUpScreen.tsx
 *
 * --- UPDATED to handle existing user error ---
 */
import React, { useState, useEffect } from 'react';
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
import { signUp } from 'aws-amplify/auth';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import type { AuthStackScreenProps } from '../navigation/types';

// Component to display a single password validation rule
const PasswordRule = ({ isValid, text }: { isValid: boolean; text: string }) => (
  <View style={styles.ruleContainer}>
    {isValid ? (
      <CheckCircle color={COLORS.green} size={16} />
    ) : (
      <XCircle color={COLORS.textSecondary} size={16} />
    )}
    <Text style={[styles.ruleText, isValid && styles.ruleTextValid]}>{text}</Text>
  </View>
);


const UserSignUpScreen: React.FC<AuthStackScreenProps<'SignUp'>> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State for password validation rules
  const [validations, setValidations] = useState({
    minLength: false,
    hasNumber: false,
    hasUppercase: false,
    hasLowercase: false,
  });

  // Effect to validate password as user types
  useEffect(() => {
    setValidations({
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
    });
  }, [password]);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please ensure both passwords are the same.');
      return;
    }
    if (Object.values(validations).some(v => !v)) {
        Alert.alert('Password Not Strong Enough', 'Please ensure your password meets all the required rules.');
        return;
    }
    
    setIsLoading(true);
    try {
      const { nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        navigation.navigate('ConfirmSignUp', { email });
      }
    } catch (error: any) {
      // --- NEW: Handle specific error for existing user ---
      if (error.name === 'UsernameExistsException') {
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. What would you like to do?',
          [
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') },
            { text: 'Forgot Password', onPress: () => navigation.navigate('ResetPassword', { email }) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Sign Up Error', error.message || 'An unknown error occurred.');
      }
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

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Let's get you started.</Text>

        <View style={styles.inputContainer}>
          <User color={COLORS.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Full Name"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

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
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            {isPasswordVisible ? <EyeOff color={COLORS.textSecondary} /> : <Eye color={COLORS.textSecondary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Lock color={COLORS.textSecondary} />
          <TextInput
            style={styles.textInput}
            placeholder="Confirm Password"
            placeholderTextColor={COLORS.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
            {isPasswordVisible ? <EyeOff color={COLORS.textSecondary} /> : <Eye color={COLORS.textSecondary} />}
          </TouchableOpacity>
        </View>

        <View style={styles.rulesDisplayContainer}>
            <PasswordRule isValid={validations.minLength} text="At least 8 characters" />
            <PasswordRule isValid={validations.hasLowercase} text="A lowercase letter" />
            <PasswordRule isValid={validations.hasUppercase} text="An uppercase letter" />
            <PasswordRule isValid={validations.hasNumber} text="A number" />
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSignUp} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
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
  rulesDisplayContainer: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    marginTop: 8,
  },
  ruleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    color: COLORS.textSecondary,
    marginLeft: 8,
    fontSize: 14,
  },
  ruleTextValid: {
    color: COLORS.green,
  },
});

export default UserSignUpScreen;