import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ExpenseRecord } from '@/types';
import { fetchRecordsByPerson } from '@/services/expenseService';
import { RecordCard } from '@/components/RecordCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { formatCurrency, safeNumber } from '@/utils/format';
import { getFriendlyError } from '@/utils/errors';
import { ChevronLeft, User } from 'lucide-react-native';

export default function PersonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string }>();
  const personName = decodeURIComponent(params.name || '');
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const data = await fetchRecordsByPerson(personName);
      setRecords(data);
      setError(null);
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [personName]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords();
  }, [loadRecords]);

  const total = records.reduce((sum, r) => sum + safeNumber(r.total_amount), 0);

  if (loading) return <LoadingState label="Loading records..." fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>{personName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <User size={28} color={Colors.primary[600]} />
        </View>
        <Text style={styles.summaryName}>{personName}</Text>
        <Text style={styles.summaryTotal}>{formatCurrency(total)}</Text>
        <Text style={styles.summaryCount}>
          {records.length} {records.length === 1 ? 'record' : 'records'}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Records</Text>
        <Button
          label="+ Add"
          onPress={() => router.push('/record-form')}
          size="sm"
        />
      </View>

      {error && <ErrorState message={error} onRetry={loadRecords} />}

      {!error && records.length === 0 ? (
        <EmptyState
          icon={<User size={36} color={Colors.neutral[300]} />}
          title={`No records for ${personName}`}
          subtitle="Add an expense record for this person."
        />
      ) : (
        !error && (
          records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onPress={() =>
                router.push({ pathname: '/record-detail', params: { id: record.id } })
              }
            />
          ))
        )
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg + 8,
    paddingBottom: Spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[800],
    fontFamily: 'Inter-SemiBold',
  },
  summaryCard: {
    backgroundColor: Colors.primary[800],
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.primary[700],
  },
  summaryIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  summaryName: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter-ExtraBold',
  },
  summaryTotal: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: '#fff',
    marginTop: Spacing.sm,
  },
  summaryCount: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[800],
    fontFamily: 'Inter-SemiBold',
  },
});
