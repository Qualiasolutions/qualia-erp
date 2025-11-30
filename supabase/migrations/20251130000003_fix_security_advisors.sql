-- Fix documents table RLS - add basic policies
CREATE POLICY "Authenticated users can view documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents" ON public.documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete documents" ON public.documents
  FOR DELETE TO authenticated USING (true);

-- Fix handle_new_user function search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
