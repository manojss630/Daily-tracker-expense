import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '@/constants/theme';
import { PersonSummary } from '@/types';
import { formatCurrency } from '@/utils/format';
import { User, ChevronRight } from 'lucide-react-native';

interface PersonCardProps {
  person: PersonSummary;
  onPress: () => void;
}

export function PersonCard({ person, onPress }: PersonCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.card}>
      <View style={styles.avatar}>
        <User size={20} color={Colors.primary[600]} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {person.person_name}
        </Text>
        <Text style={styles.stats}>
          {person.recordCount} {person.recordCount === 1 ? 'record' : 'records'} ·{' '}
          {person.itemCount} {person.itemCount === 1 ? 'item' : 'items'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.total}>{formatCurrency(person.total)}</Text>
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
    padding: Spacing.md,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Spacing.sm + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md + 1,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  stats: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  total: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary[600],
  },
});
