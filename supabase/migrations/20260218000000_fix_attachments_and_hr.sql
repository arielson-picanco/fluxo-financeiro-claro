-- Fix attachments record_type check constraint
ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_record_type_check;

ALTER TABLE public.attachments ADD CONSTRAINT attachments_record_type_check
CHECK (record_type = ANY (ARRAY['payable'::text, 'receivable'::text, 'supplier'::text, 'employee_photos'::text, 'employee_documents'::text]));

-- Ensure employees table has RLS and policies
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Employees visible to financial users') THEN
        CREATE POLICY "Employees visible to financial users" ON public.employees
        FOR SELECT TO authenticated USING (public.has_financial_access(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Financial users can manage employees') THEN
        CREATE POLICY "Financial users can manage employees" ON public.employees
        FOR ALL TO authenticated USING (public.has_financial_write_access(auth.uid())) WITH CHECK (public.has_financial_write_access(auth.uid()));
    END IF;
END $$;

-- Ensure employee_absences table has RLS and policies
ALTER TABLE IF EXISTS public.employee_absences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_absences' AND policyname = 'Absences visible to financial users') THEN
        CREATE POLICY "Absences visible to financial users" ON public.employee_absences
        FOR SELECT TO authenticated USING (public.has_financial_access(auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employee_absences' AND policyname = 'Financial users can manage absences') THEN
        CREATE POLICY "Financial users can manage absences" ON public.employee_absences
        FOR ALL TO authenticated USING (public.has_financial_write_access(auth.uid())) WITH CHECK (public.has_financial_write_access(auth.uid()));
    END IF;
END $$;
