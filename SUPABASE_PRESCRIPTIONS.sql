-- ============================================================
-- Supabase SQL Script: Create Medical Records & Prescriptions Table
-- ============================================================
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/shpxidfmcnyfwumxnreq/sql/new

-- 1. Create public.medical_records table
CREATE TABLE IF NOT EXISTS public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Prescription', -- 'Prescription', 'Lab Report', 'Scan / Imaging', 'Other'
  doctor_notes TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT,
  ocr_text TEXT, -- Transcribed text extracted via OCR.space API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Allow patients to view, insert, and delete ONLY their own records
CREATE POLICY "Patients can view own medical records"
  ON public.medical_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can upload own medical records"
  ON public.medical_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Patients can delete own medical records"
  ON public.medical_records FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create Storage Bucket for Prescriptions & Medical Reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS Policies: Allow authenticated users to manage files in 'prescriptions' bucket
CREATE POLICY "Public Read Access for Prescriptions Bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prescriptions');

CREATE POLICY "Authenticated Upload Access for Prescriptions Bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

CREATE POLICY "Owner Delete Access for Prescriptions Bucket"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'prescriptions' AND auth.uid() = owner);
