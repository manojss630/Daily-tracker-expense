import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardSummary, ExpenseRecord } from '@/types';
import { fetchDashboardSummary, fetchRecentRecords } from '@/services/expenseService';
import { SummaryCard } from '@/components/SummaryCard';
import { RecordCard } from '@/components/RecordCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { formatCurrency } from '@/utils/format';
import { getFriendlyError } from '@/utils/errors';
import {
  Wallet,
  Calendar,
  FileText,
  Users,
  Plus,
  TrendingUp,
  Award,
  ClipboardList,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentRecords, setRecentRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, records] = await Promise.all([
        fetchDashboardSummary(),
        fetchRecentRecords(5),
      ]);
      setSummary(s);
      setRecentRecords(records);
      setError(null);
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const firstName = profile?.full_name?.split(' ')[0] || 'User';
  const initials = (profile?.full_name || 'U')
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (loading) return <LoadingState label="Loading dashboard..." fullScreen />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[500], Colors.primary[400]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {firstName}</Text>
            <Text style={styles.subGreeting}>Here&apos;s your expense overview</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.avatar}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>Total Expenses</Text>
            <Text style={styles.heroAmount}>{formatCurrency(summary?.totalExpenses || 0)}</Text>
          </View>
          <View style={styles.heroRight}>
            <View style={styles.heroBadge}>
              <Wallet size={24} color="#fff" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        {error && <ErrorState message={error} onRetry={loadData} />}

        {!error && (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="This Month"
                value={formatCurrency(summary?.thisMonth || 0)}
                icon={<Calendar size={18} color={Colors.secondary[600]} />}
                color={Colors.secondary[50]}
              />
              <View style={{ width: Spacing.sm }} />
              <SummaryCard
                label="Today"
                value={formatCurrency(summary?.today || 0)}
                icon={<TrendingUp size={18} color={Colors.accent[600]} />}
                color={Colors.accent[50]}
              />
            </View>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Records"
                value={String(summary?.recordCount || 0)}
                icon={<FileText size={18} color={Colors.primary[600]} />}
                color={Colors.primary[50]}
              />
              <View style={{ width: Spacing.sm }} />
              <SummaryCard
                label="People"
                value={String(summary?.peopleCount || 0)}
                icon={<Users size={18} color={Colors.success[600]} />}
                color={Colors.success[50]}
              />
            </View>

            <View style={styles.quickActions}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={() => router.push('/record-form')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: Colors.primary[50] }]}>
                    <Plus size={22} color={Colors.primary[600]} />
                  </View>
                  <Text style={styles.quickActionText}>Add Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={() => router.push('/(tabs)/records')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: Colors.secondary[50] }]}>
                    <ClipboardList size={22} color={Colors.secondary[600]} />
                  </View>
                  <Text style={styles.quickActionText}>Records</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={() => router.push('/(tabs)/people')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: Colors.success[50] }]}>
                    <Users size={22} color={Colors.success[600]} />
                  </View>
                  <Text style={styles.quickActionText}>People</Text>
                </TouchableOpacity>
              </View>
            </View>

            {(summary?.topCategory || summary?.topPerson) && (
              <View style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>Insights</Text>
                {summary?.topCategory && (
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIcon, { backgroundColor: Colors.primary[50] }]}>
                      <TrendingUp size={15} color={Colors.primary[600]} />
                    </View>
                    <Text style={styles.insightText}>
                      Top category: <Text style={styles.insightBold}>{summary.topCategory}</Text>
                    </Text>
                  </View>
                )}
                {summary?.topPerson && (
                  <View style={styles.insightRow}>
                    <View style={[styles.insightIcon, { backgroundColor: Colors.accent[50] }]}>
                      <Award size={15} color={Colors.accent[600]} />
                    </View>
                    <Text style={styles.insightText}>
                      Top person: <Text style={styles.insightBold}>{summary.topPerson}</Text>
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Records</Text>
              {recentRecords.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/records')}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentRecords.length === 0 ? (
              <View style={styles.emptyWrapper}>
                <EmptyState
                  icon={<FileText size={36} color={Colors.neutral[300]} />}
                  title="No expense records yet"
                  subtitle="Create your first expense record to start tracking."
                  action={
                    <Button
                      label="+ Add Expense"
                      onPress={() => router.push('/record-form')}
                    />
                  }
                />
              </View>
            ) : (
              recentRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onPress={() =>
                    router.push({ pathname: '/record-detail', params: { id: record.id } })
                  }
                />
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 12,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter-ExtraBold',
  },
  subGreeting: {
    fontSize: FontSizes.md,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: '#fff',
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: '#fff',
    marginTop: Spacing.xs,
    fontFamily: 'Inter-ExtraBold',
  },
  heroRight: {},
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: Spacing.sm + 2,
  },
  quickActions: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quickActionsTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm + 2,
    fontFamily: 'Inter-SemiBold',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  insightsCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md + 2,
    marginBottom: Spacing.lg,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.neutral[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm + 2,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  insightText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[600],
  },
  insightBold: {
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.neutral[800],
    fontFamily: 'Inter-SemiBold',
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  emptyWrapper: {
    marginTop: Spacing.xl,
  },
});
