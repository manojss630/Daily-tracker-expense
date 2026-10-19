DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE btrim(username) <> ''
    GROUP BY lower(btrim(username))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate usernames exist. Resolve them before applying the case-insensitive username constraint.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(btrim(username)))
  WHERE btrim(username) <> '';

GRANT INSERT (user_id, full_name, username, email, phone)
  ON TABLE public.profiles TO authenticated;
