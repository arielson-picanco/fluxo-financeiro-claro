-- Add default boleto URL to suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS default_boleto_url TEXT;

-- Add tags columns (JSON array of tag names)
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE public.accounts_receivable 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create a tags table for managing available tags with colors
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    entity_type TEXT NOT NULL DEFAULT 'all', -- 'supplier', 'payable', 'receivable', 'all'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags policies - visible to all financial users, manageable by admins
CREATE POLICY "Tags visible to financial users" 
ON public.tags 
FOR SELECT 
USING (has_financial_access(auth.uid()));

CREATE POLICY "Admins can manage tags" 
ON public.tags 
FOR ALL 
USING (is_admin(auth.uid()));

-- Insert default category tags
INSERT INTO public.tags (name, color, entity_type) VALUES
('Aluguel', '#ef4444', 'payable'),
('Energia', '#f97316', 'payable'),
('Água', '#3b82f6', 'payable'),
('Internet', '#8b5cf6', 'payable'),
('Fornecedor', '#10b981', 'payable'),
('Impostos', '#dc2626', 'payable'),
('Salários', '#059669', 'payable'),
('Venda', '#22c55e', 'receivable'),
('Serviço', '#6366f1', 'receivable'),
('Financiamento', '#f59e0b', 'receivable'),
('Comissão', '#14b8a6', 'receivable'),
('Móveis', '#a855f7', 'supplier'),
('Transporte', '#ec4899', 'supplier'),
('Manutenção', '#64748b', 'supplier'),
('Marketing', '#0ea5e9', 'supplier')
ON CONFLICT (name) DO NOTHING;