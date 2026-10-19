type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: {
    foreignKeyName: string;
    columns: string[];
    isOneToOne?: boolean;
    referencedRelation: string;
    referencedColumns: string[];
  }[];
};

type ProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseRecordRow = {
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
};

type ExpenseItemRow = {
  id: string;
  record_id: string;
  expense_name: string;
  category: string;
  amount: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        ProfileRow,
        { user_id: string; full_name?: string; username?: string; email?: string; phone?: string },
        { full_name?: string; username?: string; phone?: string; avatar_url?: string | null }
      >;
      expense_records: Table<
        ExpenseRecordRow,
        {
          person_name: string;
          person_phone?: string;
          description?: string;
          location?: string;
          record_date?: string;
        },
        {
          person_name?: string;
          person_phone?: string;
          description?: string;
          location?: string;
          record_date?: string;
        }
      >;
      expense_items: Table<
        ExpenseItemRow,
        {
          record_id: string;
          expense_name: string;
          category?: string;
          amount: number;
          note?: string;
        },
        {
          record_id?: string;
          expense_name?: string;
          category?: string;
          amount?: number;
          note?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_expense_record_with_items: {
        Args: {
          record_payload: {
            person_name: string;
            person_phone: string;
            description: string;
            location: string;
            record_date: string;
          };
          items_payload: {
            expense_name: string;
            category: string;
            amount: number;
            note: string;
          }[];
        };
        Returns: string;
      };
      update_expense_record_with_items: {
        Args: {
          target_record_id: string;
          record_payload: {
            person_name: string;
            person_phone: string;
            description: string;
            location: string;
            record_date: string;
          };
          items_payload: {
            expense_name: string;
            category: string;
            amount: number;
            note: string;
          }[];
        };
        Returns: string;
      };
      get_dashboard_summary: {
        Args: {
          local_today: string;
          local_month_start: string;
        };
        Returns: {
          totalExpenses: number;
          thisMonth: number;
          today: number;
          recordCount: number;
          peopleCount: number;
          topCategory: string | null;
          topPerson: string | null;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
