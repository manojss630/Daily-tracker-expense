import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { ExpenseItemDraft } from '@/types';
import { formatCurrency, safeNumber } from '@/utils/format';
import { CATEGORY_ICONS } from '@/constants/theme';
import { Trash2 } from 'lucide-react-native';

interface ExpenseItemRowProps {
  item: ExpenseItemDraft;
  index: number;
  onDelete: () => void;
}

export function ExpenseItemRow({ item, index, onDelete }: ExpenseItemRowProps) {
  const iconChar = CATEGORY_ICONS[item.category as string] || '📦';
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{iconChar}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.expense_name || `Expense ${index + 1}`}
        </Text>
        {item.category && item.category !== 'Other' && (
          <Text style={styles.category}>{item.category}</Text>
        )}
      </View>
      <Text style={styles.amount}>{formatCurrency(safeNumber(item.amount))}</Text>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} activeOpacity={0.6}>
        <Trash2 size={18} color={Colors.error[400]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  category: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[500],
    marginTop: 1,
  },
  amount: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary[600],
    marginRight: Spacing.sm,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
