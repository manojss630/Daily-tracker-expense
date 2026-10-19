import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getFriendlyError } from '@/utils/errors';
import { User, Mail, Lock, Phone, BookOpen, AtSign } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!username.trim()) return 'Please enter a username.';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{2,29}$/.test(username.trim())) {
      return 'Username must be 3–30 characters and use letters, numbers, dots, underscores, or hyphens.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      return 'Please enter a valid phone number.';
    }
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (!confirmPassword) return 'Please confirm your password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    if (submitting.current) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    submitting.current = true;
    setError(null);
    setLoading(true);
    try {
      const { error: signUpError } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
      });
      if (signUpError) {
        setError(getFriendlyError(signUpError));
      } else {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.primary[600], Colors.primary[500], Colors.primary[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoCircle}>
            <BookOpen size={32} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>SSDM ExpenseBook</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start tracking your expenses today</Text>
        </LinearGradient>

        <View style={styles.form}>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Manoj Kumar"
            icon={<User size={20} color={Colors.neutral[400]} />}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="manoj123"
            icon={<AtSign size={20} color={Colors.neutral[400]} />}
            autoCapitalize="none"
            returnKeyType="next"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            icon={<Mail size={20} color={Colors.neutral[400]} />}
            returnKeyType="next"
          />
          <Input
            label="Mobile Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            icon={<Phone size={20} color={Colors.neutral[400]} />}
            returnKeyType="next"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            icon={<Lock size={20} color={Colors.neutral[400]} />}
            returnKeyType="next"
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            icon={<Lock size={20} color={Colors.neutral[400]} />}
            returnKeyType="go"
            onSubmitEditing={handleRegister}
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter-ExtraBold',
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.xs,
  },
  form: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  errorBox: {
    backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error[700],
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
  },
  footerLink: {
    fontSize: FontSizes.md,
    color: Colors.primary[600],
    fontWeight: '700',
  },
});
