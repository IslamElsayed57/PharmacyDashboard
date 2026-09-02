-- ==========================================================================
-- صيدليات العوضي (Elawadi Pharmacies) - Pharmacy Consultations Schema
-- Run this in your Supabase SQL Editor (adds to the existing schema.sql,
-- does not touch any existing table)
-- ==========================================================================

-- ==========================================================================
-- 1. CONSULTATIONS TABLE
-- ==========================================================================
CREATE TABLE IF NOT EXISTS public.consultations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    consultation_type TEXT NOT NULL,
    preferred_time TEXT,
    contact_method TEXT NOT NULL DEFAULT 'phone' CHECK (contact_method IN ('phone', 'whatsapp')),
    details TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'no_response')),

    -- Follow-up fields, filled in later by staff from "دليل الاستشارات"
    -- so a pharmacist can look back and record whether the patient
    -- actually benefited from the advice given.
    outcome TEXT CHECK (outcome IN ('benefited', 'not_benefited', 'unknown') OR outcome IS NULL),
    outcome_notes TEXT,
    followed_up_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    followed_up_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_phone ON public.consultations(phone);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations(created_at DESC);

-- ==========================================================================
-- 2. ROW LEVEL SECURITY (mirrors the `orders` table policies)
-- ==========================================================================
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

-- Public (anon key, customer website) can submit new consultation requests
DROP POLICY IF EXISTS "Public insert consultations" ON public.consultations;
CREATE POLICY "Public insert consultations" ON public.consultations
    FOR INSERT WITH CHECK (true);

-- Admin: full access
DROP POLICY IF EXISTS "Admin full access consultations" ON public.consultations;
CREATE POLICY "Admin full access consultations" ON public.consultations
    FOR ALL USING (public.is_admin());

-- Pharmacist: read consultations with no branch (shared queue) or their own branch
DROP POLICY IF EXISTS "Pharmacist branch consultations read" ON public.consultations;
CREATE POLICY "Pharmacist branch consultations read" ON public.consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist' AND is_active = true
            AND (consultations.branch_id IS NULL OR consultations.branch_id = profiles.branch_id)
        )
    );

-- Pharmacist: update (status changes, follow-up notes) same scope as read
DROP POLICY IF EXISTS "Pharmacist branch consultations update" ON public.consultations;
CREATE POLICY "Pharmacist branch consultations update" ON public.consultations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist' AND is_active = true
            AND (consultations.branch_id IS NULL OR consultations.branch_id = profiles.branch_id)
        )
    );

-- ==========================================================================
-- 3. REALTIME (so the dashboard gets an instant alert, same as orders)
-- ==========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
