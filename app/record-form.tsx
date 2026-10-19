import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ExpenseRecordDraft,
  ExpenseItemDraft,
  ExpenseCategory,
} from '@/types';
import {
  createExpenseRecord,
  updateExpenseRecord,
  fetchExpenseRecordById,
} from '@/services/expenseService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TotalCard } from '@/components/TotalCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Colors, Spacing, FontSizes, BorderRadius, EXPENSE_CATEGORIES, CATEGORY_ICONS } from '@/constants/theme';
import { toDateInputValue, parseDateInput, safeNumber } from '@/utils/format';
import { getFriendlyError } from '@/utils/errors';
import { Plus, ChevronLeft, Trash2 } from 'lucide-react-native';

export default function RecordFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [recordDate, setRecordDate] = useState(new Date());

  const [items, setItems] = useState<ExpenseItemDraft[]>([
    { expense_name: '', category: 'Other', amount: 0, note: '' },
  ]);

  const [showCategoryPicker, setShowCategoryPicker] = useState<number | null>(null);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const record = await fetchExpenseRecordById(editId);
        if (record) {
          setPersonName(record.person_name);
          setPersonPhone(record.person_phone);
          setDescription(record.description);
          setLocation(record.location);
          setRecordDate(new Date(record.record_date));
          setItems(
            (record.expense_items || []).map((item) => ({
              id: item.id,
              expense_name: item.expense_name,
              category: item.category,
              amount: item.amount,
              note: item.note,
            }))
          );
        }
      } catch (e) {
        setError(getFriendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [editId]);

  const updateItem = (index: number, updates: Partial<ExpenseItemDraft>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { expense_name: '', category: 'Other', amount: 0, note: '' }]);
  };

  const deleteItem = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [{ expense_name: '', category: 'Other', amount: 0, note: '' }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    if (!personName.trim()) {
      setError('Please enter a person name.');
      return;
    }
    const validItems = items.filter(
      (item) => item.expense_name.trim() || safeNumber(item.amount) > 0
    );
    if (validItems.length === 0) {
      setError('Please add at least one expense item.');
      return;
    }
    if (validItems.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) {
      setError('Expense amounts must be valid, nonnegative numbers.');
      return;
    }
    if (validItems.some((item) => item.amount > 9_999_999_999.99)) {
      setError('Expense amounts cannot exceed ₹9,999,999,999.99.');
      return;
    }
    if (validItems.some((item) => Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 1e-8)) {
      setError('Expense amounts can have no more than two decimal places.');
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const draft: ExpenseRecordDraft = {
        person_name: personName.trim(),
        person_phone: personPhone.trim(),
        description: description.trim(),
        location: location.trim(),
        record_date: recordDate,
        items: validItems,
      };

      if (isEdit && editId) {
        await updateExpenseRecord(editId, draft);
      } else {
        await createExpenseRecord(draft);
      }

      router.back();
    } catch (e) {
      setError(getFriendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading record..." fullScreen />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Record' : 'New Expense Record'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Person Details</Text>
        <Input
          label="Person Name *"
          value={personName}
          onChangeText={setPersonName}
          placeholder="Brother, Friend, Customer..."
          autoCapitalize="words"
          returnKeyType="next"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Phone (optional)"
              value={personPhone}
              onChangeText={setPersonPhone}
              placeholder="98765 43210"
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <Input
          label="Location (optional)"
          value={location}
          onChangeText={setLocation}
          placeholder="City, shop name..."
          autoCapitalize="words"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Notes about this record..."
          multiline
          numberOfLines={2}
        />
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>Date</Text>
          <TextInput
            style={styles.dateInput}
            value={toDateInputValue(recordDate)}
            onChangeText={(text) => {
              const parsed = parseDateInput(text);
              if (!isNaN(parsed.getTime())) {
                setRecordDate(parsed);
              }
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.neutral[400]}
          />
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Expense Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Expense {index + 1}</Text>
                <TouchableOpacity onPress={() => deleteItem(index)}>
                  <Trash2 size={16} color={Colors.error[400]} />
                </TouchableOpacity>
              </View>
              <Input
                label="Expense Name"
                value={item.expense_name}
                onChangeText={(text) => updateItem(index, { expense_name: text })}
                placeholder="Petrol, Oil, Food..."
                autoCapitalize="words"
              />
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Amount"
                    value={String(item.amount || '')}
                    onChangeText={(text) => updateItem(index, { amount: safeNumber(text) })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: Spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.categoryPicker}
                    onPress={() => setShowCategoryPicker(index)}
                  >
                    <Text style={styles.categoryEmoji}>
                      {CATEGORY_ICONS[item.category as string] || '📦'}
                    </Text>
                    <Text style={styles.categoryText} numberOfLines={1}>
                      {item.category || 'Other'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addItem} activeOpacity={0.7}>
            <Plus size={20} color={Colors.primary[600]} />
            <Text style={styles.addBtnText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalSection}>
          <TotalCard items={items} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          label={isEdit ? 'Update Record' : 'Save Record'}
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
        />
      </ScrollView>

      <Modal
        visible={showCategoryPicker !== null}
        onClose={() => setShowCategoryPicker(null)}
        title="Select Category"
      >
        <View style={styles.categoryGrid}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryOption,
                showCategoryPicker !== null &&
                  items[showCategoryPicker]?.category === cat &&
                  styles.categoryOptionActive,
              ]}
              onPress={() => {
                if (showCategoryPicker !== null) {
                  updateItem(showCategoryPicker, { category: cat as ExpenseCategory });
                }
                setShowCategoryPicker(null);
              }}
            >
              <Text style={styles.categoryOptionEmoji}>{CATEGORY_ICONS[cat]}</Text>
              <Text style={styles.categoryOptionText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
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
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm + 2,
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  dateField: {
    marginBottom: Spacing.md,
  },
  dateLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: Spacing.xs + 2,
  },
  dateInput: {
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSizes.md,
    color: Colors.neutral[800],
  },
  itemsSection: {
    marginTop: Spacing.md,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 2,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemNumber: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  itemRow: {
    flexDirection: 'row',
  },
  categoryLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: Spacing.xs + 2,
  },
  categoryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
    gap: Spacing.sm,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: FontSizes.md,
    color: Colors.neutral[700],
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary[300],
    borderStyle: 'dashed',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addBtnText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  totalSection: {
    marginTop: Spacing.lg,
  },
  errorBox: {
    backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.sm,
    color: Colors.error[700],
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryOption: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[400],
  },
  categoryOptionEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  categoryOptionText: {
    fontSize: FontSizes.xs,
    color: Colors.neutral[600],
    textAlign: 'center',
  },
});
