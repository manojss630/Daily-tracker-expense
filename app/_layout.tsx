import { useEffect } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabaseConfigurationError } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-ExtraBold': Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.configurationError}>
        <Text style={styles.configurationTitle}>Supabase setup required</Text>
        <Text style={styles.configurationMessage}>{supabaseConfigurationError}</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { session, loading, passwordRecovery } = useAuth();
  const firstSegment = segments[0];
  const isPublicRoute =
    firstSegment === undefined ||
    firstSegment === 'splash' ||
    firstSegment === 'login' ||
    firstSegment === 'register';
  const canChangePassword = passwordRecovery && firstSegment === 'login';
  const needsRedirect =
    !loading &&
    !canChangePassword &&
    ((session !== null && isPublicRoute) || (session === null && !isPublicRoute));

  useEffect(() => {
    if (loading || canChangePassword) return;
    if (session && isPublicRoute) {
      router.replace('/(tabs)');
    } else if (!session && !isPublicRoute) {
      router.replace('/login');
    }
  }, [canChangePassword, isPublicRoute, loading, router, session]);

  if (loading || needsRedirect) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.loadingText}>Checking your session...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="record-detail" />
      <Stack.Screen name="record-form" />
      <Stack.Screen name="person-detail" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
  loadingText: {
    marginTop: 12,
    color: Colors.neutral[600],
    fontSize: 14,
  },
  configurationError: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  configurationTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  configurationMessage: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
