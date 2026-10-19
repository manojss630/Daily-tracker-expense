/*
# Fix security advisor warnings

1. Set search_path on functions to prevent search path injection
2. Revoke EXECUTE on handle_new_user from anon and authenticated roles
   (it's a trigger function, only needs to be called by the trigger, not via REST)
*/

-- Fix search_path on update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix search_path on handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE from anon and authenticated (trigger doesn't need REST access)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
