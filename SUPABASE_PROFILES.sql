-- ============================================================
-- Supabase SQL Script: Create & Setup Patients / Profiles Table
-- ============================================================
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/shpxidfmcnyfwumxnreq/sql/new

-- 1. Create public.profiles table with 2-digit patient_no (< 3 digits)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_no INT UNIQUE, -- 2-digit unique patient number (10-99) for voice calls & n8n workflows
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  role TEXT DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases: Ensure patient_no column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS patient_no INT UNIQUE;

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Allow users to view & update their own profile data
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy for Public / Voice Agent / n8n workflow lookup by patient_no
DROP POLICY IF EXISTS "Allow select by patient_no for voice agent and n8n" ON public.profiles;
CREATE POLICY "Allow select by patient_no for voice agent and n8n"
  ON public.profiles FOR SELECT
  USING (true);

-- 4. Trigger: Automatically insert profile and generate unique 2-digit patient_no (10-99)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_patient_no INT;
BEGIN
  -- Extract patient_no from metadata or generate a random 2-digit number (10-99)
  generated_patient_no := COALESCE(
    (NEW.raw_user_meta_data->>'patient_no')::INT,
    floor(random() * 90 + 10)::INT
  );

  INSERT INTO public.profiles (id, patient_no, full_name, phone_number, email)
  VALUES (
    NEW.id,
    generated_patient_no,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Valued Patient'),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.phone, ''),
    CASE 
      WHEN NEW.email LIKE '%@apexclinic.com' THEN NULL
      WHEN NEW.email LIKE '%@apexclinic.app' THEN NULL
      ELSE NEW.email 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    patient_no = COALESCE(public.profiles.patient_no, EXCLUDED.patient_no),
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- N8N AI AGENT & VOICE CALL QUERY EXAMPLES:
-- ============================================================
-- 1. Fetch patient profile by 2-digit Patient Number:
--    SELECT * FROM public.profiles WHERE patient_no = 14;
--
-- 2. Fetch past medical records / prescriptions by Patient Number:
--    SELECT m.* 
--    FROM public.medical_records m 
--    JOIN public.profiles p ON m.user_id = p.id 
--    WHERE p.patient_no = 14 
--    ORDER BY m.created_at DESC;
-- ============================================================

