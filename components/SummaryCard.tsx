import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

export function SummaryCard({ label, value, icon, color }: SummaryCardProps) {
  const bgColor = color || Colors.primary[50];
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    padding: Spacing.md + 2,
    alignItems: 'flex-start',
    flex: 1,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm + 2,
  },
  value: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.neutral[800],
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
});
