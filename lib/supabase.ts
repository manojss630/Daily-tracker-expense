import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function getKeyConfigurationError(key: string): string | null {
  if (/service[_-]?role|sb_secret_/i.test(key)) {
    return 'A privileged Supabase key cannot be used in the client. Use a publishable or anon key.';
  }

  if (!key.startsWith('eyJ')) return null;

  const payloadSegment = key.split('.')[1];
  if (!payloadSegment) {
    return 'The Supabase key is malformed. Copy the publishable or anon key from your project settings.';
  }

  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let decoded = '';
    for (let i = 0; i < paddedBase64.length; i += 4) {
      const a = alphabet.indexOf(paddedBase64[i]);
      const b = alphabet.indexOf(paddedBase64[i + 1]);
      const c = paddedBase64[i + 2] === '=' ? 0 : alphabet.indexOf(paddedBase64[i + 2]);
      const d = paddedBase64[i + 3] === '=' ? 0 : alphabet.indexOf(paddedBase64[i + 3]);
      if (a < 0 || b < 0 || c < 0 || d < 0) {
        throw new Error('Invalid key encoding');
      }
      decoded += String.fromCharCode((a << 2) | (b >> 4));
      if (paddedBase64[i + 2] !== '=') {
        decoded += String.fromCharCode(((b & 15) << 4) | (c >> 2));
      }
      if (paddedBase64[i + 3] !== '=') {
        decoded += String.fromCharCode(((c & 3) << 6) | d);
      }
    }
    const payload: unknown = JSON.parse(decoded);
    if (typeof payload !== 'object' || payload === null || !('role' in payload)) {
      return 'The Supabase key is invalid. Copy the publishable or anon key from your project settings.';
    }
    if (payload.role === 'service_role') {
      return 'A privileged Supabase key cannot be used in the client. Use a publishable or anon key.';
    }
  } catch {
    return 'The Supabase key is invalid. Copy the publishable or anon key from your project settings.';
  }

  return null;
}

function validateConfiguration(): string | null {
  if (!supabaseUrl || !supabaseKey) {
    return 'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file, then restart Expo.';
  }

  let url: URL;
  try {
    url = new URL(supabaseUrl);
  } catch {
    return 'The Supabase URL is invalid. Check EXPO_PUBLIC_SUPABASE_URL in your .env file.';
  }

  const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(isLoopback && url.protocol === 'http:')) {
    return 'The Supabase URL must use HTTPS, except for a local development server.';
  }

  return getKeyConfigurationError(supabaseKey);
}

export const supabaseConfigurationError = validateConfiguration();
export const isSupabaseConfigured = supabaseConfigurationError === null;

export function getSupabaseAuthRedirectUrl(): string {
  return Platform.OS === 'web' ? `${window.location.origin}/login` : Linking.createURL('/login');
}

const customSecureStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (supabaseConfigurationError) {
    throw new Error(supabaseConfigurationError);
  }
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing.');
  }

  client ??= createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: customSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return client;
}
