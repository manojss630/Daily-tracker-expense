import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string | null;
  icon?: React.ReactNode;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  returnKeyType?: 'done' | 'next' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  editable?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = null,
  icon,
  multiline = false,
  numberOfLines = 1,
  style,
  returnKeyType,
  onSubmitEditing,
  editable = true,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          error && styles.errorBorder,
          multiline && styles.multiline,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.neutral[400]}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          style={styles.input}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.toggleIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            {showPassword ? (
              <EyeOff size={20} color={Colors.neutral[400]} />
            ) : (
              <Eye size={20} color={Colors.neutral[400]} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: Spacing.xs + 2,
  } as TextStyle,
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbfa',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 54,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  } as ViewStyle,
  focused: {
    borderColor: Colors.primary[400],
    backgroundColor: '#fff',
    shadowOpacity: 0.08,
  } as ViewStyle,
  errorBorder: {
    borderColor: Colors.error[400],
  } as ViewStyle,
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  } as ViewStyle,
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.neutral[800],
    paddingVertical: Spacing.sm + 2,
    textAlignVertical: 'center',
  } as TextStyle,
  toggleIcon: {
    padding: Spacing.xs,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error[500],
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  } as TextStyle,
});
