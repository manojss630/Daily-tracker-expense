import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle = styles[variant];
  const sizeStyle = sizes[size];

  const isGradientButton = variant === 'primary' || variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        variantStyle,
        sizeStyle,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {isGradientButton ? (
        <LinearGradient
          colors={variant === 'primary' ? [Colors.primary[600], Colors.primary[500]] : [Colors.secondary[600], Colors.secondary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyle]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.content}>
              {icon}
              <Text style={[styles.label, textSizes[size], styles.labelSolid]}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      ) : loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary[600] : '#fff'}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              textSizes[size],
              variant === 'outline' || variant === 'ghost'
                ? styles.labelOutline
                : styles.labelSolid,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
    overflow: 'hidden',
  } as ViewStyle,
  gradient: {
    width: '100%',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    shadowColor: Colors.primary[800],
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  primary: {
    backgroundColor: Colors.primary[600],
  },
  secondary: {
    backgroundColor: Colors.secondary[600],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary[200],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error[500],
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  } as ViewStyle,
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontWeight: '600',
  } as TextStyle,
  labelSolid: {
    color: '#fff',
  } as TextStyle,
  labelOutline: {
    color: Colors.primary[600],
  } as TextStyle,
});

const sizes: Record<Size, ViewStyle> = {
  sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 40 },
  md: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
  lg: { paddingVertical: 18, paddingHorizontal: Spacing.xl, minHeight: 56 },
};

const textSizes: Record<Size, TextStyle> = {
  sm: { fontSize: FontSizes.sm },
  md: { fontSize: FontSizes.md },
  lg: { fontSize: FontSizes.lg },
};
