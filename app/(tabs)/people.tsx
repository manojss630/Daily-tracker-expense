import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PersonSummary } from '@/types';
import { fetchPeopleSummaries } from '@/services/expenseService';
import { PersonCard } from '@/components/PersonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSizes } from '@/constants/theme';
import { getFriendlyError } from '@/utils/errors';
import { Users } from 'lucide-react-native';

export default function PeopleScreen() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useCallback(async () => {
    try {
      const data = await fetchPeopleSummaries();
      setPeople(data);
      setError(null);
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPeople();
  }, [loadPeople]);

  if (loading) return <LoadingState label="Loading people..." fullScreen />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <View style={styles.header}>
        <Text style={styles.title}>People</Text>
        <Text style={styles.subtitle}>A clear view of everyone in your records</Text>
      </View>
      {error && <ErrorState message={error} onRetry={loadPeople} />}

      {!error && people.length === 0 ? (
        <EmptyState
          icon={<Users size={36} color={Colors.neutral[300]} />}
          title="No people yet"
          subtitle="Add an expense record for someone to see them here."
          action={
            <Button
              label="+ Add Expense"
              onPress={() => router.push('/record-form')}
            />
          }
        />
      ) : (
        !error && (
          people.map((person) => (
            <PersonCard
              key={person.person_name}
              person={person}
              onPress={() =>
                router.push({
                  pathname: '/person-detail',
                  params: { name: person.person_name },
                })
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontFamily: 'Inter-ExtraBold',
    fontWeight: '800',
    color: Colors.neutral[900],
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
});
