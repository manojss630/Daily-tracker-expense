import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { formatCurrency, safeNumber } from '@/utils/format';
import { ExpenseItemDraft } from '@/types';

interface TotalCardProps {
  items: ExpenseItemDraft[];
}

export function TotalCard({ items }: TotalCardProps) {
  const total = items.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total Amount</Text>
      <Text style={styles.total}>{formatCurrency(total)}</Text>
      <Text style={styles.count}>
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  total: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: '#fff',
    marginTop: Spacing.xs,
  },
  count: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
});
