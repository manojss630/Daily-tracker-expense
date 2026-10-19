import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { getFriendlyError } from '@/utils/errors';
import {
  Mail,
  Phone,
  AtSign,
  Edit3,
  Lock,
  Bell,
  Palette,
  Coins,
} from 'lucide-react-native';
import { getSupabaseClient } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, updateProfile, loading, profileLoading, profileError } = useAuth();
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pwdModal, setPwdModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (loading || profileLoading) return <LoadingState label="Loading profile..." fullScreen />;

  const handleSaveProfile = async () => {
    setSaving(true);
    setEditError(null);
    try {
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
      });
      if (error) {
        setEditError(getFriendlyError(error));
      } else {
        setEditModal(false);
      }
    } catch (error) {
      setEditError(getFriendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }
    setPwdSaving(true);
    setPwdError(null);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
      if (error) {
        setPwdError(getFriendlyError(error));
      } else {
        setPwdModal(false);
        setNewPassword('');
      }
    } catch (error) {
      setPwdError(getFriendlyError(error));
    } finally {
      setPwdSaving(false);
    }
  };

  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {profileError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{profileError}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email || ''}</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon={<AtSign size={18} color={Colors.neutral[500]} />} label="Username" value={profile?.username || '-'} />
        <InfoRow icon={<Mail size={18} color={Colors.neutral[500]} />} label="Email" value={profile?.email || '-'} />
        <InfoRow icon={<Phone size={18} color={Colors.neutral[500]} />} label="Phone" value={profile?.phone || '-'} />
      </View>

      <View style={styles.actionsCard}>
        <TouchableOpacity style={styles.actionRow} onPress={() => {
          setFullName(profile?.full_name || '');
          setPhone(profile?.phone || '');
          setEditError(null);
          setEditModal(true);
        }}>
          <View style={styles.actionIcon}>
            <Edit3 size={18} color={Colors.primary[600]} />
          </View>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={() => { setPwdError(null); setNewPassword(''); setPwdModal(true); }}>
          <View style={styles.actionIcon}>
            <Lock size={18} color={Colors.primary[600]} />
          </View>
          <Text style={styles.actionText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Settings</Text>
        <SettingRow icon={<Coins size={18} color={Colors.neutral[500]} />} label="Currency" value="INR \u20B9" />
        <SettingRow icon={<Palette size={18} color={Colors.neutral[500]} />} label="Theme" value="System" />
        <SettingRow icon={<Bell size={18} color={Colors.neutral[500]} />} label="Notifications" value="On" />
      </View>

      {signOutError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{signOutError}</Text>
        </View>
      )}
      <Button
        label="Logout"
        onPress={async () => {
          setSignOutError(null);
          try {
            await signOut();
            router.replace('/login');
          } catch (error) {
            setSignOutError(getFriendlyError(error));
          }
        }}
        variant="danger"
        fullWidth
        size="lg"
        style={{ marginTop: Spacing.lg }}
      />

      <Modal visible={editModal} onClose={() => setEditModal(false)} title="Edit Profile">
        <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Your phone" keyboardType="phone-pad" />
        {editError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{editError}</Text>
          </View>
        )}
        <Button label="Save Changes" onPress={handleSaveProfile} loading={saving} fullWidth style={{ marginTop: Spacing.md }} />
      </Modal>

      <Modal visible={pwdModal} onClose={() => setPwdModal(false)} title="Change Password">
        <Input
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
        />
        {pwdError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{pwdError}</Text>
          </View>
        )}
        <Button label="Update Password" onPress={handleChangePassword} loading={pwdSaving} fullWidth style={{ marginTop: Spacing.md }} />
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SettingRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: '#fff',
  },
  name: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.neutral[800],
    fontFamily: 'Inter-ExtraBold',
  },
  email: {
    fontSize: FontSizes.md,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.neutral[100],
  },
  infoContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.neutral[800],
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[800],
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.md,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settingsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.neutral[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  settingLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.neutral[700],
    marginLeft: Spacing.md,
  },
  settingValue: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
  },
  errorBox: {
    backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error[700],
    textAlign: 'center',
  },
});
