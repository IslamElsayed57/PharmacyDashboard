-- ==========================================================================
-- الاستشارات الصيدلانية: ربط الاستشارة بالفرع اللي غيّر حالتها وقفلها على باقي الفروع
-- شغّل الملف ده مرة واحدة من SQL Editor في Supabase (آمن تشغيله أكتر من مرة).
--
-- القاعدة:
--   * كل الصيادلة (كل الفروع) يقدروا "يشوفوا" كل الاستشارات، عشان يظهر لهم
--     أي فرع غيّر الحالة.
--   * الصيدلي يقدر يعدّل الاستشارة فقط لو:
--       - لسه ملهاش فرع (branch_id فاضي)  → أول فرع يغيّر الحالة يستلمها، أو
--       - تابعة لفرعه هو.
--   * بعد ما فرع يستلمها، أي فرع تاني تحديثه بيتجاهل (0 صفوف) تلقائي.
--   * الأدمن ليه صلاحية كاملة زي ما هو (سياسة "Admin full access consultations").
-- ==========================================================================

-- 1) القراءة: كل صيدلي نشط يشوف كل الاستشارات
DROP POLICY IF EXISTS "Pharmacist branch consultations read" ON public.consultations;
DROP POLICY IF EXISTS "Pharmacist read all consultations" ON public.consultations;
CREATE POLICY "Pharmacist read all consultations" ON public.consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist' AND is_active = true
        )
    );

-- 2) التعديل: بس لو غير مستلمة أو تابعة لفرعه، والنتيجة لازم تبقى برضه
--    غير مستلمة أو تابعة لفرعه (يعني مينفعش يحوّلها لفرع تاني)
DROP POLICY IF EXISTS "Pharmacist branch consultations update" ON public.consultations;
CREATE POLICY "Pharmacist branch consultations update" ON public.consultations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist' AND is_active = true
            AND (consultations.branch_id IS NULL OR consultations.branch_id = profiles.branch_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'pharmacist' AND is_active = true
            AND (consultations.branch_id IS NULL OR consultations.branch_id = profiles.branch_id)
        )
    );

-- لو عايز ترجع للوضع القديم (الفرع اللي يستلم الاستشارة تختفي من باقي الفروع)
-- شغّل سياستي "read" و "update" الأصليين من ملف consultations_schema.sql بدل اللي فوق.
