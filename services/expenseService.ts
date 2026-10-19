import { getSupabaseClient } from '@/lib/supabase';
import {
  ExpenseRecord,
  ExpenseItemDraft,
  ExpenseRecordDraft,
  DashboardSummary,
  PersonSummary,
} from '@/types';
import { safeNumber } from '@/utils/format';

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toRecordPayload(draft: ExpenseRecordDraft) {
  return {
    person_name: draft.person_name.trim(),
    person_phone: draft.person_phone || '',
    description: draft.description || '',
    location: draft.location || '',
    record_date: toLocalDateString(draft.record_date),
  };
}

function toItemPayload(items: ExpenseItemDraft[]) {
  return items
    .filter((item) => item.expense_name.trim() || safeNumber(item.amount) > 0)
    .map((item) => ({
      expense_name: item.expense_name.trim(),
      category: item.category || 'Other',
      amount: safeNumber(item.amount),
      note: item.note || '',
    }));
}

export async function createExpenseRecord(
  draft: ExpenseRecordDraft
): Promise<ExpenseRecord> {
  const { data: recordId, error } = await getSupabaseClient().rpc(
    'create_expense_record_with_items',
    {
      record_payload: toRecordPayload(draft),
      items_payload: toItemPayload(draft.items),
    }
  );

  if (error) throw new Error(error.message);
  if (!recordId) throw new Error('Failed to create expense record.');
  const record = await fetchExpenseRecordById(recordId);
  if (!record) throw new Error('The expense was saved but could not be loaded.');
  return record;
}

export async function updateExpenseRecord(
  recordId: string,
  draft: ExpenseRecordDraft
): Promise<ExpenseRecord> {
  const { data: updatedRecordId, error } = await getSupabaseClient().rpc(
    'update_expense_record_with_items',
    {
      target_record_id: recordId,
      record_payload: toRecordPayload(draft),
      items_payload: toItemPayload(draft.items),
    }
  );

  if (error) throw new Error(error.message);
  if (!updatedRecordId) throw new Error('Failed to update expense record.');
  const record = await fetchExpenseRecordById(updatedRecordId);
  if (!record) throw new Error('The expense was updated but could not be loaded.');
  return record;
}

export async function deleteExpenseRecord(recordId: string): Promise<void> {
  const { error } = await getSupabaseClient().from('expense_records').delete().eq('id', recordId);
  if (error) throw new Error(error.message);
}

export async function fetchExpenseRecords(): Promise<ExpenseRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('expense_records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const records = data || [];
  if (records.length === 0) return [];

  const { data: items, error: itemsError } = await getSupabaseClient()
    .from('expense_items')
    .select('record_id, expense_name')
    .in('record_id', records.map((record) => record.id));
  if (itemsError) throw new Error(itemsError.message);

  const itemNames = new Map<string, string[]>();
  for (const item of items || []) {
    const names = itemNames.get(item.record_id) || [];
    names.push(item.expense_name);
    itemNames.set(item.record_id, names);
  }

  return records.map((record) => ({
    ...record,
    expense_item_names: itemNames.get(record.id) || [],
  }));
}

export async function fetchExpenseRecordById(id: string): Promise<ExpenseRecord | null> {
  const { data: record, error } = await getSupabaseClient()
    .from('expense_records')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!record) return null;

  const { data: items, error: itemsError } = await getSupabaseClient()
    .from('expense_items')
    .select('*')
    .eq('record_id', id)
    .order('created_at', { ascending: true });

  if (itemsError) throw new Error(itemsError.message);

  return { ...record, expense_items: items || [] };
}

export async function fetchRecentRecords(limit: number = 5): Promise<ExpenseRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('expense_records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as ExpenseRecord[];
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();
  const currentDate = toLocalDateString(today);
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const { data, error } = await getSupabaseClient().rpc('get_dashboard_summary', {
    local_today: currentDate,
    local_month_start: monthStart,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('The dashboard summary response was invalid.');
  }

  const result: Record<string, unknown> = data;
  const getNumber = (
    field: 'totalExpenses' | 'thisMonth' | 'today' | 'recordCount' | 'peopleCount'
  ): number => {
    if (typeof result[field] !== 'number' || !Number.isFinite(result[field])) {
      throw new Error(`The dashboard summary field "${field}" was invalid.`);
    }
    return result[field];
  };

  if (
    (result.topCategory !== null && typeof result.topCategory !== 'string') ||
    (result.topPerson !== null && typeof result.topPerson !== 'string')
  ) {
    throw new Error('The dashboard summary names were invalid.');
  }

  const topCategory = result.topCategory;
  const topPerson = result.topPerson;
  return {
    totalExpenses: getNumber('totalExpenses'),
    thisMonth: getNumber('thisMonth'),
    today: getNumber('today'),
    recordCount: getNumber('recordCount'),
    peopleCount: getNumber('peopleCount'),
    topCategory: typeof topCategory === 'string' ? topCategory : null,
    topPerson: typeof topPerson === 'string' ? topPerson : null,
  };
}

export async function fetchPeopleSummaries(): Promise<PersonSummary[]> {
  const { data: records, error } = await getSupabaseClient()
    .from('expense_records')
    .select('id, person_name, total_amount');

  if (error) throw new Error(error.message);
  if (!records || records.length === 0) return [];

  const personMap: Record<string, { total: number; recordCount: number; recordIds: Set<string> }> = {};

  for (const r of records) {
    if (!personMap[r.person_name]) {
      personMap[r.person_name] = { total: 0, recordCount: 0, recordIds: new Set() };
    }
    personMap[r.person_name].total += safeNumber(r.total_amount);
    personMap[r.person_name].recordCount += 1;
    personMap[r.person_name].recordIds.add(r.id);
  }

  const allRecordIds = records.map((r) => r.id);
  const { data: items, error: itemsError } = await getSupabaseClient()
    .from('expense_items')
    .select('record_id')
    .in('record_id', allRecordIds);
  if (itemsError) throw new Error(itemsError.message);

  const itemCountMap: Record<string, number> = {};
  if (items) {
    for (const item of items) {
      itemCountMap[item.record_id] = (itemCountMap[item.record_id] || 0) + 1;
    }
  }

  return Object.entries(personMap)
    .map(([name, data]) => {
      let itemCount = 0;
      for (const rid of data.recordIds) {
        itemCount += itemCountMap[rid] || 0;
      }
      return {
        person_name: name,
        total: data.total,
        recordCount: data.recordCount,
        itemCount,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export async function fetchRecordsByPerson(personName: string): Promise<ExpenseRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from('expense_records')
    .select('*')
    .eq('person_name', personName)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function duplicateRecord(recordId: string): Promise<ExpenseRecord | null> {
  const original = await fetchExpenseRecordById(recordId);
  if (!original) return null;

  const draft: ExpenseRecordDraft = {
    person_name: original.person_name,
    person_phone: original.person_phone,
    description: original.description,
    location: original.location,
    record_date: new Date(),
    items: (original.expense_items || []).map((item) => ({
      expense_name: item.expense_name,
      category: item.category,
      amount: item.amount,
      note: item.note,
    })),
  };

  return createExpenseRecord(draft);
}
