import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { ExpenseRecord } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { ChevronRight, FileText } from 'lucide-react-native';

interface RecordCardProps {
  record: ExpenseRecord;
  itemSummary?: string;
  itemCount?: number;
  onPress: () => void;
  onPdfPress?: () => void;
}

export function RecordCard({
  record,
  itemSummary,
  itemCount,
  onPress,
  onPdfPress,
}: RecordCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.personName} numberOfLines={1}>
            {record.person_name}
          </Text>
          <Text style={styles.amount}>{formatCurrency(record.total_amount)}</Text>
        </View>
        {itemSummary && (
          <Text style={styles.summary} numberOfLines={1}>
            {itemSummary}
          </Text>
        )}
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(record.record_date)}</Text>
          {itemCount !== undefined && (
            <Text style={styles.items}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>
      </View>
      {onPdfPress && (
        <TouchableOpacity onPress={onPdfPress} style={styles.pdfBtn} activeOpacity={0.6}>
          <FileText size={18} color={Colors.primary[600]} />
        </TouchableOpacity>
      )}
      <View style={styles.chevron}>
        <ChevronRight size={18} color={Colors.neutral[300]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.045,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  leftAccent: {
    width: 4,
    height: '100%',
    backgroundColor: Colors.primary[400],
    minHeight: 80,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  personName: {
    fontSize: FontSizes.md + 1,
    fontWeight: '700',
    color: Colors.neutral[800],
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    fontSize: FontSizes.md + 1,
    fontWeight: '800',
    color: Colors.primary[600],
  },
  summary: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  date: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[400],
  },
  items: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[400],
  },
  pdfBtn: {
    padding: Spacing.sm,
  },
  chevron: {
    paddingRight: Spacing.sm,
  },
});
