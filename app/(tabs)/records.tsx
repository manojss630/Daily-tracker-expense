import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ExpenseRecord } from '@/types';
import { fetchExpenseRecords } from '@/services/expenseService';
import { RecordCard } from '@/components/RecordCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { getFriendlyError } from '@/utils/errors';
import { Search, SlidersHorizontal, ClipboardList, X, Plus } from 'lucide-react-native';

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest' | 'name';
type DateFilter = 'all' | 'thisMonth' | 'lastMonth' | 'last3Months';

export default function RecordsScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [personFilter, setPersonFilter] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const data = await fetchExpenseRecords();
      setRecords(data);
      setError(null);
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords();
  }, [loadRecords]);

  const people = useMemo(() => {
    const set = new Set(records.map((r) => r.person_name));
    return Array.from(set).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.person_name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.expense_item_names?.some((name) => name.toLowerCase().includes(q))
      );
    }

    if (personFilter) {
      result = result.filter((r) => r.person_name === personFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();

      result = result.filter((r) => {
        const d = new Date(r.record_date);
        if (dateFilter === 'thisMonth') {
          return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }
        if (dateFilter === 'lastMonth') {
          const lm = thisMonth === 0 ? 11 : thisMonth - 1;
          const ly = thisMonth === 0 ? thisYear - 1 : thisYear;
          return d.getMonth() === lm && d.getFullYear() === ly;
        }
        if (dateFilter === 'last3Months') {
          const threeMonthsAgo = new Date(thisYear, thisMonth - 3, 1);
          return new Date(d) >= threeMonthsAgo;
        }
        return true;
      });
    }

    switch (sortMode) {
      case 'newest':
        result.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
        break;
      case 'highest':
        result.sort((a, b) => b.total_amount - a.total_amount);
        break;
      case 'lowest':
        result.sort((a, b) => a.total_amount - b.total_amount);
        break;
      case 'name':
        result.sort((a, b) => a.person_name.localeCompare(b.person_name));
        break;
    }

    return result;
  }, [records, search, personFilter, dateFilter, sortMode]);

  const hasActiveFilters = personFilter || dateFilter !== 'all' || sortMode !== 'newest';

  if (loading) return <LoadingState label="Loading records..." fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Expense records</Text>
          <Text style={styles.pageSubtitle}>Your spending history, all in one place</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/record-form')}
          accessibilityRole="button"
          accessibilityLabel="Add expense record"
        >
          <Plus size={21} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Search size={18} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchText}
            placeholder="Search by person or expense..."
            placeholderTextColor={Colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={Colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={18} color={hasActiveFilters ? Colors.primary[600] : Colors.neutral[500]} />
        </TouchableOpacity>
      </View>

      {hasActiveFilters && (
        <TouchableOpacity
          style={styles.clearFilters}
          onPress={() => {
            setPersonFilter(null);
            setDateFilter('all');
            setSortMode('newest');
          }}
        >
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error && <ErrorState message={error} onRetry={loadRecords} />}

        {!error && filteredRecords.length === 0 && records.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={36} color={Colors.neutral[300]} />}
            title="No expense records yet"
            subtitle="Create your first expense record to start tracking."
            action={
              <Button
                label="+ Add Expense"
                onPress={() => router.push('/record-form')}
              />
            }
          />
        ) : !error && filteredRecords.length === 0 ? (
          <EmptyState
            icon={<Search size={36} color={Colors.neutral[300]} />}
            title="No matching records"
            subtitle="Try adjusting your search or filters."
          />
        ) : (
          !error && (
            <View>
              <Text style={styles.count}>
                {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
              </Text>
              {filteredRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onPress={() =>
                    router.push({ pathname: '/record-detail', params: { id: record.id } })
                  }
                />
              ))}
            </View>
          )
        )}
      </ScrollView>

      <Modal visible={showFilters} onClose={() => setShowFilters(false)} title="Filters & Sort">
        <Text style={styles.filterLabel}>Sort By</Text>
        <View style={styles.filterOptions}>
          {([
            { key: 'newest', label: 'Newest First' },
            { key: 'oldest', label: 'Oldest First' },
            { key: 'highest', label: 'Highest Amount' },
            { key: 'lowest', label: 'Lowest Amount' },
            { key: 'name', label: 'Name A-Z' },
          ] as { key: SortMode; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterOption,
                sortMode === opt.key && styles.filterOptionActive,
              ]}
              onPress={() => setSortMode(opt.key)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  sortMode === opt.key && styles.filterOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Date Range</Text>
        <View style={styles.filterOptions}>
          {([
            { key: 'all', label: 'All Time' },
            { key: 'thisMonth', label: 'This Month' },
            { key: 'lastMonth', label: 'Last Month' },
            { key: 'last3Months', label: 'Last 3 Months' },
          ] as { key: DateFilter; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterOption,
                dateFilter === opt.key && styles.filterOptionActive,
              ]}
              onPress={() => setDateFilter(opt.key)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  dateFilter === opt.key && styles.filterOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {people.length > 0 && (
          <>
            <Text style={styles.filterLabel}>Person</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !personFilter && styles.filterOptionActive,
                ]}
                onPress={() => setPersonFilter(null)}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !personFilter && styles.filterOptionTextActive,
                  ]}
                >
                  All People
                </Text>
              </TouchableOpacity>
              {people.map((person) => (
                <TouchableOpacity
                  key={person}
                  style={[
                    styles.filterOption,
                    personFilter === person && styles.filterOptionActive,
                  ]}
                  onPress={() => setPersonFilter(person)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      personFilter === person && styles.filterOptionTextActive,
                    ]}
                  >
                    {person}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Button
          label="Apply Filters"
          onPress={() => setShowFilters(false)}
          fullWidth
          size="md"
          style={{ marginTop: Spacing.lg }}
        />
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#fff',
  },
  pageHeading: {
    flex: 1,
  },
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.neutral[900],
    fontFamily: 'Inter-ExtraBold',
  },
  pageSubtitle: {
    color: Colors.neutral[500],
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    marginLeft: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[100],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 44,
  },
  searchText: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.neutral[800],
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary[50],
  },
  clearFilters: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  clearFiltersText: {
    fontSize: FontSizes.sm,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  count: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginBottom: Spacing.md,
  },
  filterLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  filterOptionActive: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[400],
  },
  filterOptionText: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[600],
  },
  filterOptionTextActive: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
});
