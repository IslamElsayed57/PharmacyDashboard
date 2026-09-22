-- ==========================================================================
-- صيدليات العوضي (Elawadi Pharmacies) - Prescriptions Bucket Hardening
-- --------------------------------------------------------------------------
-- الهدف: قفل bucket الروشتات (prescriptions) على مستوى الخادم عشان أي حد
-- يقدر يرفع ملفات مباشرة ب API من غير تسجيل دخول (RLS على orders كان عام).
--
--  1) allowed_mime_types : الصور و PDF بس.
--  2) file_size_limit   : 5MB كحد أقصى (يمنع استنزاف التخزين بملفات ضخمة).
--  3) تقوية الـ policy   : فحص نوع الملف (mimetype) وحجمه (metadata->size)
--     كطبقة حماية إضافية فوق فحص الـ Storage server.
--
-- آمن لإعادة التشغيل (idempotent). شغّله في Supabase SQL Editor.
-- ==========================================================================

-- 1) Bucket options — يفرضها الـ Storage server قبل أي كتابة
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'prescriptions',
    'prescriptions',
    false,
    5242880,
    array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update
set public             = excluded.public,
    file_size_limit    = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) تقوية سياسة الرفع العام: نفس قيود الحجم والنوع على مستوى RLS
drop policy if exists "Allow public prescription upload" on storage.objects;
create policy "Allow public prescription upload"
    on storage.objects for insert
    with check (
        bucket_id = 'prescriptions'
        and (new.metadata->>'size')::bigint <= 5242880
        and new.metadata->>'mimetype' in (
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'
        )
    );

-- --------------------------------------------------------------------------
-- ملاحظة عن "التكرار":
--   - أسماء الملفات بتبدأ بـ Date.now + قيمة عشوائية، و upsert=false في الكود،
--     فلن يحدث overwrite بين ملفين بأي حال.
--   - الملف المكرر (نفس الروشتة مرفوعة كذا مرة) محتاج dedupe بمحتوى الملف
--     (hash) وهو مش ممكن بـ SQL محض من غير قراءة الملف — لو حبيت نحسب SHA-256
--     من المتصفح ونخزّنه في metadata ونمنع التكرار بيه، قول لي.
-- ==========================================================================