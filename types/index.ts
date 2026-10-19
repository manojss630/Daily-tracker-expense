export type ExpenseCategory =
  | 'Petrol/Fuel'
  | 'Vehicle'
  | 'Food'
  | 'Shopping'
  | 'Travel'
  | 'Medical'
  | 'Bills'
  | 'Repair'
  | 'Education'
  | 'Personal'
  | 'Other';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  record_id: string;
  expense_name: string;
  category: ExpenseCategory | string;
  amount: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  person_name: string;
  person_phone: string;
  description: string;
  location: string;
  record_date: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  expense_items?: ExpenseItem[];
  expense_item_names?: string[];
}

export interface ExpenseItemDraft {
  id?: string;
  expense_name: string;
  category: ExpenseCategory | string;
  amount: number;
  note: string;
}

export interface ExpenseRecordDraft {
  person_name: string;
  person_phone: string;
  description: string;
  location: string;
  record_date: Date;
  items: ExpenseItemDraft[];
}

export interface DashboardSummary {
  totalExpenses: number;
  thisMonth: number;
  today: number;
  recordCount: number;
  peopleCount: number;
  topCategory: string | null;
  topPerson: string | null;
}

export interface PersonSummary {
  person_name: string;
  total: number;
  recordCount: number;
  itemCount: number;
}

export interface AuthUser {
  id: string;
  email: string;
}
