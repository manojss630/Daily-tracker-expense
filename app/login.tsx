import React, { useState } from 'react';
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
import { getSupabaseAuthRedirectUrl, getSupabaseClient } from '@/lib/supabase';
import { Mail, Lock, BookOpen, HelpCircle } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, authError, passwordRecovery } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (passwordRecovery && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!password.trim()) {
      setError(passwordRecovery ? 'Enter your new password.' : 'Please enter your email and password.');
      return;
    }
    if (!passwordRecovery && !email.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (passwordRecovery) {
        const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
        if (updateError) {
          setError(getFriendlyError(updateError));
        } else {
          setError(null);
          setResetSent(true);
          router.replace('/(tabs)');
        }
      } else {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) {
          setError(getFriendlyError(signInError));
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above first, then tap Forgot Password.');
      return;
    }
    setError(null);
    setResetLoading(true);
    try {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: getSupabaseAuthRedirectUrl() }
      );
      if (resetError) {
        setError(getFriendlyError(resetError));
      } else {
        setResetSent(true);
      }
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to manage your expenses</Text>
        </LinearGradient>

        <View style={styles.form}>
          {resetSent && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Password reset link sent! Check your email.
              </Text>
            </View>
          )}

          {!passwordRecovery && (
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              icon={<Mail size={20} color={Colors.neutral[400]} />}
              returnKeyType="next"
            />
          )}
          <Input
            label={passwordRecovery ? 'New Password' : 'Password'}
            value={password}
            onChangeText={setPassword}
            placeholder={passwordRecovery ? 'Enter your new password' : 'Enter your password'}
            secureTextEntry
            icon={<Lock size={20} color={Colors.neutral[400]} />}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {!passwordRecovery && (
            <TouchableOpacity
              style={styles.forgotPwd}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.6}
            >
              <HelpCircle size={14} color={Colors.primary[600]} />
              <Text style={styles.forgotPwdText}>
                {resetLoading ? 'Sending reset link...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>
          )}

          {(error || authError) && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{getFriendlyError(error || authError)}</Text>
            </View>
          )}

          <Button
            label={passwordRecovery ? 'Update Password' : 'Sign In'}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    paddingTop: Spacing.xxl + 16,
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
  successBox: {
    backgroundColor: Colors.success[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSizes.sm,
    color: Colors.success[700],
    textAlign: 'center',
  },
  forgotPwd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  forgotPwdText: {
    fontSize: FontSizes.sm,
    color: Colors.primary[600],
    fontWeight: '600',
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
    marginTop: Spacing.xl,
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
