-- Drop the existing constraint and recreate with supplier included
ALTER TABLE public.attachments DROP CONSTRAINT attachments_record_type_check;

ALTER TABLE public.attachments ADD CONSTRAINT attachments_record_type_check 
CHECK (record_type = ANY (ARRAY['payable'::text, 'receivable'::text, 'supplier'::text]));