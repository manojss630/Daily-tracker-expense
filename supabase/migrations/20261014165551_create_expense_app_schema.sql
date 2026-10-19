/*
# Create ExpenseBook schema (profiles, expense_records, expense_items)

1. New Tables
- `profiles`: Stores user profile info (full_name, username, email, phone, avatar_url). One row per auth user.
- `expense_records`: Stores expense records for a person (person_name, person_phone, description, location, record_date, total_amount). Owned by a user.
- `expense_items`: Individual line items within an expense record (expense_name, category, amount, note). Belongs to a record.

2. Relationships
- profiles.user_id → auth.users(id) ON DELETE CASCADE
- expense_records.user_id → auth.users(id) ON DELETE CASCADE
- expense_items.record_id → expense_records(id) ON DELETE CASCADE

3. Security
- RLS enabled on all tables.
- Owner-scoped CRUD: authenticated users can only access rows they own.
- expense_items scoped through parent expense_records via EXISTS check.

4. Indexes
- expense_records(user_id) — filter records by owner
- expense_records(record_date) — sort/filter by date
- expense_records(person_name) — filter by person
- expense_items(record_id) — fetch items for a record
- profiles(user_id) — lookup profile by auth user
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  avatar_url text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Expense records table
CREATE TABLE IF NOT EXISTS expense_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  person_phone text DEFAULT '',
  description text DEFAULT '',
  location text DEFAULT '',
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expense_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_records" ON expense_records;
CREATE POLICY "select_own_records" ON expense_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_records" ON expense_records;
CREATE POLICY "insert_own_records" ON expense_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_records" ON expense_records;
CREATE POLICY "update_own_records" ON expense_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_records" ON expense_records;
CREATE POLICY "delete_own_records" ON expense_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Expense items table
CREATE TABLE IF NOT EXISTS expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES expense_records(id) ON DELETE CASCADE,
  expense_name text NOT NULL,
  category text DEFAULT 'Other',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_items" ON expense_items;
CREATE POLICY "select_own_items" ON expense_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM expense_records WHERE expense_records.id = expense_items.record_id AND expense_records.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_items" ON expense_items;
CREATE POLICY "insert_own_items" ON expense_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM expense_records WHERE expense_records.id = expense_items.record_id AND expense_records.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_items" ON expense_items;
CREATE POLICY "update_own_items" ON expense_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM expense_records WHERE expense_records.id = expense_items.record_id AND expense_records.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM expense_records WHERE expense_records.id = expense_items.record_id AND expense_records.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_items" ON expense_items;
CREATE POLICY "delete_own_items" ON expense_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM expense_records WHERE expense_records.id = expense_items.record_id AND expense_records.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_records_user_id ON expense_records(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_records_record_date ON expense_records(record_date);
CREATE INDEX IF NOT EXISTS idx_expense_records_person_name ON expense_records(person_name);
CREATE INDEX IF NOT EXISTS idx_expense_items_record_id ON expense_items(record_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_expense_records_updated_at ON expense_records;
CREATE TRIGGER trigger_expense_records_updated_at BEFORE UPDATE ON expense_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_expense_items_updated_at ON expense_items;
CREATE TRIGGER trigger_expense_items_updated_at BEFORE UPDATE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
