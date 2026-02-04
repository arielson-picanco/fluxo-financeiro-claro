-- =============================================
-- SISTEMA FINANCEIRO INTERNO - MIGRAÇÃO INICIAL
-- =============================================

-- 1. ENUM PARA ROLES DE USUÁRIO
CREATE TYPE public.app_role AS ENUM ('admin', 'financeiro', 'visualizacao');

-- 2. ENUM PARA STATUS DE CONTAS
CREATE TYPE public.account_status AS ENUM ('a_vencer', 'vencida', 'paga', 'renegociada');

-- 3. TABELA DE PERFIS DE USUÁRIO
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE ROLES (SEPARADA DOS PERFIS - CRÍTICO PARA SEGURANÇA)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- 5. TABELA DE FORNECEDORES
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    document TEXT, -- CPF ou CNPJ
    document_type TEXT CHECK (document_type IN ('cpf', 'cnpj')),
    category TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. TABELA DE CONTAS A PAGAR
CREATE TABLE public.accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    payment_date DATE,
    status account_status NOT NULL DEFAULT 'a_vencer',
    category TEXT,
    installment_number INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    parent_id UUID REFERENCES public.accounts_payable(id), -- Para parcelas
    interest_rate DECIMAL(5, 4) DEFAULT 0,
    fine_rate DECIMAL(5, 4) DEFAULT 0,
    interest_amount DECIMAL(15, 2) DEFAULT 0,
    fine_amount DECIMAL(15, 2) DEFAULT 0,
    paid_amount DECIMAL(15, 2),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    original_due_date DATE, -- Para renegociações
    renegotiated_at TIMESTAMPTZ,
    renegotiated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 7. TABELA DE CONTAS A RECEBER
CREATE TABLE public.accounts_receivable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_document TEXT,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    payment_date DATE,
    status account_status NOT NULL DEFAULT 'a_vencer',
    category TEXT,
    installment_number INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    parent_id UUID REFERENCES public.accounts_receivable(id),
    interest_rate DECIMAL(5, 4) DEFAULT 0,
    fine_rate DECIMAL(5, 4) DEFAULT 0,
    interest_amount DECIMAL(15, 2) DEFAULT 0,
    fine_amount DECIMAL(15, 2) DEFAULT 0,
    received_amount DECIMAL(15, 2),
    notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    original_due_date DATE,
    renegotiated_at TIMESTAMPTZ,
    renegotiated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 8. TABELA DE ANEXOS/COMPROVANTES
CREATE TABLE public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN ('payable', 'receivable')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABELA DE AUDITORIA (IMUTÁVEL)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- =============================================

-- Função para verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Função para verificar se é financeiro
CREATE OR REPLACE FUNCTION public.is_financeiro(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'financeiro')
$$;

-- Função para verificar se é visualização
CREATE OR REPLACE FUNCTION public.is_viewer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'visualizacao')
$$;

-- Função para verificar qualquer acesso financeiro
CREATE OR REPLACE FUNCTION public.has_financial_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin(_user_id) OR public.is_financeiro(_user_id) OR public.is_viewer(_user_id)
$$;

-- Função para verificar acesso de escrita financeira
CREATE OR REPLACE FUNCTION public.has_financial_write_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin(_user_id) OR public.is_financeiro(_user_id)
$$;

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
    BEFORE UPDATE ON public.accounts_payable
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
    BEFORE UPDATE ON public.accounts_receivable
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
    
    -- Primeiro usuário vira admin
    IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'visualizacao');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- USER ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles visible to admins and financeiros"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Only admins can manage roles"
    ON public.user_roles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
    ON public.user_roles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
    ON public.user_roles FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- SUPPLIERS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers visible to financial users"
    ON public.suppliers FOR SELECT
    TO authenticated
    USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create suppliers"
    ON public.suppliers FOR INSERT
    TO authenticated
    WITH CHECK (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Financial users can update suppliers"
    ON public.suppliers FOR UPDATE
    TO authenticated
    USING (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Only admins can delete suppliers"
    ON public.suppliers FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- ACCOUNTS PAYABLE
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payables visible to financial users"
    ON public.accounts_payable FOR SELECT
    TO authenticated
    USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create payables"
    ON public.accounts_payable FOR INSERT
    TO authenticated
    WITH CHECK (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Financial users can update payables"
    ON public.accounts_payable FOR UPDATE
    TO authenticated
    USING (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Only admins can delete payables"
    ON public.accounts_payable FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- ACCOUNTS RECEIVABLE
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receivables visible to financial users"
    ON public.accounts_receivable FOR SELECT
    TO authenticated
    USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create receivables"
    ON public.accounts_receivable FOR INSERT
    TO authenticated
    WITH CHECK (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Financial users can update receivables"
    ON public.accounts_receivable FOR UPDATE
    TO authenticated
    USING (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Only admins can delete receivables"
    ON public.accounts_receivable FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- ATTACHMENTS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments visible to financial users"
    ON public.attachments FOR SELECT
    TO authenticated
    USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create attachments"
    ON public.attachments FOR INSERT
    TO authenticated
    WITH CHECK (public.has_financial_write_access(auth.uid()));

CREATE POLICY "Financial users can delete attachments"
    ON public.attachments FOR DELETE
    TO authenticated
    USING (public.has_financial_write_access(auth.uid()));

-- AUDIT LOGS (SOMENTE LEITURA PARA ADMINS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_accounts_payable_status ON public.accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON public.accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_supplier ON public.accounts_payable(supplier_id);
CREATE INDEX idx_accounts_receivable_status ON public.accounts_receivable(status);
CREATE INDEX idx_accounts_receivable_due_date ON public.accounts_receivable(due_date);
CREATE INDEX idx_attachments_record ON public.attachments(record_id, record_type);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

-- =============================================
-- STORAGE BUCKET PARA COMPROVANTES
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false);

CREATE POLICY "Financial users can upload attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'attachments' AND public.has_financial_write_access(auth.uid()));

CREATE POLICY "Financial users can view attachments"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'attachments' AND public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can delete attachments"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'attachments' AND public.has_financial_write_access(auth.uid()));