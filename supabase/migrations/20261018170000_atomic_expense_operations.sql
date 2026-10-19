-- Keep profile creation idempotent and include every registration field.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

INSERT INTO public.profiles (user_id, full_name, username, email, phone)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'username', ''),
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'phone', '')
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.expense_records
SET person_phone = COALESCE(person_phone, ''),
    description = COALESCE(description, ''),
    location = COALESCE(location, '')
WHERE person_phone IS NULL OR description IS NULL OR location IS NULL;
ALTER TABLE public.expense_records
  ALTER COLUMN person_phone SET DEFAULT '',
  ALTER COLUMN person_phone SET NOT NULL,
  ALTER COLUMN description SET DEFAULT '',
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN location SET DEFAULT '',
  ALTER COLUMN location SET NOT NULL;

UPDATE public.expense_items
SET category = COALESCE(category, 'Other'),
    note = COALESCE(note, '')
WHERE category IS NULL OR note IS NULL;
ALTER TABLE public.expense_items
  ALTER COLUMN category SET DEFAULT 'Other',
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN note SET DEFAULT '',
  ALTER COLUMN note SET NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Profile identity fields cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_identity ON public.profiles;
CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();

CREATE OR REPLACE FUNCTION public.sync_expense_record_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.expense_records
    SET total_amount = total_amount + NEW.amount
    WHERE id = NEW.record_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.expense_records
    SET total_amount = total_amount - OLD.amount
    WHERE id = OLD.record_id;
    RETURN OLD;
  ELSIF OLD.record_id = NEW.record_id THEN
    UPDATE public.expense_records
    SET total_amount = total_amount + NEW.amount - OLD.amount
    WHERE id = NEW.record_id;
    RETURN NEW;
  ELSE
    UPDATE public.expense_records
    SET total_amount = total_amount - OLD.amount
    WHERE id = OLD.record_id;
    UPDATE public.expense_records
    SET total_amount = total_amount + NEW.amount
    WHERE id = NEW.record_id;
    RETURN NEW;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_expense_record_total() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_expense_record_total ON public.expense_items;
CREATE TRIGGER sync_expense_record_total
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_expense_record_total();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_records_total_nonnegative'
      AND conrelid = 'public.expense_records'::regclass
  ) THEN
    ALTER TABLE public.expense_records
      ADD CONSTRAINT expense_records_total_nonnegative
      CHECK (total_amount >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_records_person_name_not_blank'
      AND conrelid = 'public.expense_records'::regclass
  ) THEN
    ALTER TABLE public.expense_records
      ADD CONSTRAINT expense_records_person_name_not_blank
      CHECK (length(trim(person_name)) > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'expense_items_amount_nonnegative'
      AND conrelid = 'public.expense_items'::regclass
  ) THEN
    ALTER TABLE public.expense_items
      ADD CONSTRAINT expense_items_amount_nonnegative
      CHECK (amount >= 0) NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_expense_records_user_date
  ON public.expense_records (user_id, record_date DESC);

CREATE OR REPLACE FUNCTION public.create_expense_record_with_items(
  record_payload jsonb,
  items_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_record_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF jsonb_typeof(items_payload) IS DISTINCT FROM 'array'
     OR jsonb_array_length(items_payload) = 0 THEN
    RAISE EXCEPTION 'At least one expense item is required';
  END IF;

  INSERT INTO public.expense_records (
    person_name, person_phone, description, location, record_date
  )
  VALUES (
    NULLIF(trim(record_payload->>'person_name'), ''),
    COALESCE(record_payload->>'person_phone', ''),
    COALESCE(record_payload->>'description', ''),
    COALESCE(record_payload->>'location', ''),
    COALESCE((record_payload->>'record_date')::date, CURRENT_DATE)
  )
  RETURNING id INTO new_record_id;

  INSERT INTO public.expense_items (record_id, expense_name, category, amount, note)
  SELECT new_record_id, item.expense_name, COALESCE(NULLIF(item.category, ''), 'Other'),
         item.amount, COALESCE(item.note, '')
  FROM jsonb_to_recordset(items_payload) AS item(
    expense_name text, category text, amount numeric, note text
  );

  RETURN new_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_expense_record_with_items(
  target_record_id uuid,
  record_payload jsonb,
  items_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF jsonb_typeof(items_payload) IS DISTINCT FROM 'array'
     OR jsonb_array_length(items_payload) = 0 THEN
    RAISE EXCEPTION 'At least one expense item is required';
  END IF;

  UPDATE public.expense_records
  SET person_name = NULLIF(trim(record_payload->>'person_name'), ''),
      person_phone = COALESCE(record_payload->>'person_phone', ''),
      description = COALESCE(record_payload->>'description', ''),
      location = COALESCE(record_payload->>'location', ''),
      record_date = COALESCE((record_payload->>'record_date')::date, CURRENT_DATE)
  WHERE id = target_record_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'Expense record was not found or access was denied';
  END IF;

  DELETE FROM public.expense_items WHERE record_id = target_record_id;

  INSERT INTO public.expense_items (record_id, expense_name, category, amount, note)
  SELECT target_record_id, item.expense_name, COALESCE(NULLIF(item.category, ''), 'Other'),
         item.amount, COALESCE(item.note, '')
  FROM jsonb_to_recordset(items_payload) AS item(
    expense_name text, category text, amount numeric, note text
  );

  RETURN target_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  local_today date,
  local_month_start date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  summary jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;

  SELECT jsonb_build_object(
    'totalExpenses', COALESCE(sum(r.total_amount), 0),
    'thisMonth', COALESCE(sum(r.total_amount) FILTER (
      WHERE r.record_date >= local_month_start
        AND r.record_date < (local_month_start + interval '1 month')::date
    ), 0),
    'today', COALESCE(sum(r.total_amount) FILTER (WHERE r.record_date = local_today), 0),
    'recordCount', count(*),
    'peopleCount', count(DISTINCT r.person_name),
    'topCategory', (
      SELECT COALESCE(i.category, 'Other')
      FROM public.expense_items AS i
      JOIN public.expense_records AS item_record ON item_record.id = i.record_id
      WHERE item_record.user_id = auth.uid()
      GROUP BY COALESCE(i.category, 'Other')
      ORDER BY sum(i.amount) DESC
      LIMIT 1
    ),
    'topPerson', (
      SELECT person_name
      FROM public.expense_records
      WHERE user_id = auth.uid()
      GROUP BY person_name
      ORDER BY sum(total_amount) DESC
      LIMIT 1
    )
  )
  INTO summary
  FROM public.expense_records AS r
  WHERE r.user_id = auth.uid();

  RETURN summary;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_expense_record_with_items(jsonb, jsonb)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_expense_record_with_items(uuid, jsonb, jsonb)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_expense_record_with_items(jsonb, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_expense_record_with_items(uuid, jsonb, jsonb)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(date, date) TO authenticated;

-- Restrict writes to client-editable fields; ownership and totals stay server-controlled.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, username, phone, avatar_url)
  ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.expense_records FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.expense_records TO authenticated;
GRANT INSERT (person_name, person_phone, description, location, record_date)
  ON TABLE public.expense_records TO authenticated;
GRANT UPDATE (person_name, person_phone, description, location, record_date)
  ON TABLE public.expense_records TO authenticated;

REVOKE ALL ON TABLE public.expense_items FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.expense_items TO authenticated;
GRANT INSERT (record_id, expense_name, category, amount, note)
  ON TABLE public.expense_items TO authenticated;
GRANT UPDATE (record_id, expense_name, category, amount, note)
  ON TABLE public.expense_items TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
