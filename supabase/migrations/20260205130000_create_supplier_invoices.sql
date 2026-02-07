-- migration: create_supplier_invoices
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  product_description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  account_payable_id UUID REFERENCES public.accounts_payable(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Política de acesso (ajuste conforme sua lógica de auth)
CREATE POLICY "Users can manage their own supplier invoices" 
ON public.supplier_invoices FOR ALL 
TO authenticated 
USING (true);