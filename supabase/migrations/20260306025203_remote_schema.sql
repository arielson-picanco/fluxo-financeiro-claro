


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status" AS ENUM (
    'a_vencer',
    'vencida',
    'paga',
    'renegociada'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'financeiro',
    'visualizacao'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_financial_access"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.is_admin(_user_id) OR public.is_financeiro(_user_id) OR public.is_viewer(_user_id)
$$;


ALTER FUNCTION "public"."has_financial_access"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_financial_write_access"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.is_admin(_user_id) OR public.is_financeiro(_user_id)
$$;


ALTER FUNCTION "public"."has_financial_write_access"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_system_log"("p_user_id" "uuid", "p_user_name" "text", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb", "p_status" "text" DEFAULT 'success'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.system_logs (user_id, user_name, action, entity_type, entity_id, details, status)
  VALUES (p_user_id, p_user_name, p_action, p_entity_type, p_entity_id, p_details, p_status)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."insert_system_log"("p_user_id" "uuid", "p_user_name" "text", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_details" "jsonb", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;


ALTER FUNCTION "public"."is_admin"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_financeiro"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.has_role(_user_id, 'financeiro')
$$;


ALTER FUNCTION "public"."is_financeiro"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_viewer"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT public.has_role(_user_id, 'visualizacao')
$$;


ALTER FUNCTION "public"."is_viewer"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts_payable" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "description" "text",
    "amount" numeric(15,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "payment_date" "date",
    "status" "public"."account_status" DEFAULT 'a_vencer'::"public"."account_status" NOT NULL,
    "category" "text",
    "installment_number" integer DEFAULT 1,
    "total_installments" integer DEFAULT 1,
    "parent_id" "uuid",
    "interest_rate" numeric(5,4) DEFAULT 0,
    "fine_rate" numeric(5,4) DEFAULT 0,
    "interest_amount" numeric(15,2) DEFAULT 0,
    "fine_amount" numeric(15,2) DEFAULT 0,
    "paid_amount" numeric(15,2),
    "notes" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_type" "text",
    "original_due_date" "date",
    "renegotiated_at" timestamp with time zone,
    "renegotiated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "tags" "text"[],
    CONSTRAINT "accounts_payable_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "accounts_payable_recurrence_type_check" CHECK (("recurrence_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."accounts_payable" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts_receivable" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_document" "text",
    "description" "text" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "due_date" "date" NOT NULL,
    "payment_date" "date",
    "status" "public"."account_status" DEFAULT 'a_vencer'::"public"."account_status" NOT NULL,
    "category" "text",
    "installment_number" integer DEFAULT 1,
    "total_installments" integer DEFAULT 1,
    "parent_id" "uuid",
    "interest_rate" numeric(5,4) DEFAULT 0,
    "fine_rate" numeric(5,4) DEFAULT 0,
    "interest_amount" numeric(15,2) DEFAULT 0,
    "fine_amount" numeric(15,2) DEFAULT 0,
    "received_amount" numeric(15,2),
    "notes" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_type" "text",
    "original_due_date" "date",
    "renegotiated_at" timestamp with time zone,
    "renegotiated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "tags" "text"[],
    CONSTRAINT "accounts_receivable_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "accounts_receivable_recurrence_type_check" CHECK (("recurrence_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."accounts_receivable" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "record_id" "uuid" NOT NULL,
    "record_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "attachments_record_type_check" CHECK (("record_type" = ANY (ARRAY['supplier_invoice'::"text", 'account_payable'::"text", 'account_receivable'::"text", 'employee_photo'::"text", 'employee_document'::"text"])))
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_absences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "date" "date" NOT NULL,
    "reason" "text",
    "justified" boolean DEFAULT false,
    "justification_document_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_absences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."employee_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "document" "text",
    "role" "text",
    "salary" numeric(10,2) NOT NULL,
    "admission_date" "date" NOT NULL,
    "resignation_date" "date",
    "status" "text" DEFAULT 'active'::"text",
    "vt_value" numeric(10,2) DEFAULT 0,
    "vr_value" numeric(10,2) DEFAULT 0,
    "bank_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sector" "text",
    "pix_key" "text",
    "bank_name" "text",
    "notes" "text",
    "photo_url" "text",
    CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'vacation'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "payment_date" "date" NOT NULL,
    "type" "text",
    "base_salary_proportional" numeric(10,2) NOT NULL,
    "vt_total" numeric(10,2) DEFAULT 0,
    "vr_total" numeric(10,2) DEFAULT 0,
    "extra_hours" numeric(10,2) DEFAULT 0,
    "absences_days" integer DEFAULT 0,
    "absences_amount" numeric(10,2) DEFAULT 0,
    "inss_amount" numeric(10,2) DEFAULT 0,
    "fgts_amount" numeric(10,2) DEFAULT 0,
    "other_deductions" numeric(10,2) DEFAULT 0,
    "net_salary" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "payroll_type_check" CHECK (("type" = ANY (ARRAY['1_quinzena'::"text", '2_quinzena'::"text", 'rescisao'::"text"])))
);


ALTER TABLE "public"."payroll" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "theme" "text" DEFAULT 'light'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplier_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "product_description" "text",
    "amount" numeric(12,2) NOT NULL,
    "issue_date" "date" NOT NULL,
    "due_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "account_payable_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "attachment_url" "text",
    "notes" "text",
    CONSTRAINT "supplier_invoices_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."supplier_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "document" "text",
    "document_type" "text",
    "category" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "default_boleto_url" "text",
    "tags" "text"[],
    CONSTRAINT "suppliers_document_type_check" CHECK (("document_type" = ANY (ARRAY['cpf'::"text", 'cnpj'::"text"])))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "status" "text" DEFAULT 'success'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6366f1'::"text" NOT NULL,
    "entity_type" "text" DEFAULT 'all'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts_payable"
    ADD CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts_receivable"
    ADD CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_document_key" UNIQUE ("document");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll"
    ADD CONSTRAINT "payroll_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_accounts_payable_due_date" ON "public"."accounts_payable" USING "btree" ("due_date");



CREATE INDEX "idx_accounts_payable_status" ON "public"."accounts_payable" USING "btree" ("status");



CREATE INDEX "idx_accounts_payable_supplier" ON "public"."accounts_payable" USING "btree" ("supplier_id");



CREATE INDEX "idx_accounts_receivable_due_date" ON "public"."accounts_receivable" USING "btree" ("due_date");



CREATE INDEX "idx_accounts_receivable_status" ON "public"."accounts_receivable" USING "btree" ("status");



CREATE INDEX "idx_attachments_record" ON "public"."attachments" USING "btree" ("record_id", "record_type");



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_system_logs_created_at" ON "public"."system_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_system_logs_entity_type" ON "public"."system_logs" USING "btree" ("entity_type");



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_user" ON "public"."user_roles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_accounts_payable_updated_at" BEFORE UPDATE ON "public"."accounts_payable" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_accounts_receivable_updated_at" BEFORE UPDATE ON "public"."accounts_receivable" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts_payable"
    ADD CONSTRAINT "accounts_payable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."accounts_payable"
    ADD CONSTRAINT "accounts_payable_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts_payable"("id");



ALTER TABLE ONLY "public"."accounts_payable"
    ADD CONSTRAINT "accounts_payable_renegotiated_by_fkey" FOREIGN KEY ("renegotiated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."accounts_payable"
    ADD CONSTRAINT "accounts_payable_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."accounts_receivable"
    ADD CONSTRAINT "accounts_receivable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."accounts_receivable"
    ADD CONSTRAINT "accounts_receivable_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."accounts_receivable"("id");



ALTER TABLE ONLY "public"."accounts_receivable"
    ADD CONSTRAINT "accounts_receivable_renegotiated_by_fkey" FOREIGN KEY ("renegotiated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employee_absences"
    ADD CONSTRAINT "employee_absences_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll"
    ADD CONSTRAINT "payroll_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_account_payable_id_fkey" FOREIGN KEY ("account_payable_id") REFERENCES "public"."accounts_payable"("id");



ALTER TABLE ONLY "public"."supplier_invoices"
    ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage tags" ON "public"."tags" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all logs" ON "public"."system_logs" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Attachments visible to financial users" ON "public"."attachments" FOR SELECT TO "authenticated" USING ("public"."has_financial_access"("auth"."uid"()));



CREATE POLICY "Authenticated users can insert logs" ON "public"."system_logs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable all for authenticated" ON "public"."accounts_payable" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Financial users can create attachments" ON "public"."attachments" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can create payables" ON "public"."accounts_payable" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can create receivables" ON "public"."accounts_receivable" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can create suppliers" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can delete attachments" ON "public"."attachments" FOR DELETE TO "authenticated" USING ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can update payables" ON "public"."accounts_payable" FOR UPDATE TO "authenticated" USING ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can update receivables" ON "public"."accounts_receivable" FOR UPDATE TO "authenticated" USING ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Financial users can update suppliers" ON "public"."suppliers" FOR UPDATE TO "authenticated" USING ("public"."has_financial_write_access"("auth"."uid"()));



CREATE POLICY "Liberar geral accounts_payable" ON "public"."accounts_payable" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Only admins can delete payables" ON "public"."accounts_payable" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can delete receivables" ON "public"."accounts_receivable" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can delete suppliers" ON "public"."suppliers" FOR DELETE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can manage roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can update roles" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Only admins can view audit logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Payables visible to financial users" ON "public"."accounts_payable" FOR SELECT TO "authenticated" USING ("public"."has_financial_access"("auth"."uid"()));



CREATE POLICY "Permitir atualização de faltas para usuários autenticados" ON "public"."employee_absences" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Permitir exclusão de faltas para usuários autenticados" ON "public"."employee_absences" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Permitir inserção de faltas para usuários autenticados" ON "public"."employee_absences" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir leitura de faltas para usuários autenticados" ON "public"."employee_absences" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir tudo para usuários autenticados em employees" ON "public"."employees" TO "authenticated" USING (true);



CREATE POLICY "Permitir tudo para usuários autenticados em payroll" ON "public"."payroll" TO "authenticated" USING (true);



CREATE POLICY "Receivables visible to financial users" ON "public"."accounts_receivable" FOR SELECT TO "authenticated" USING ("public"."has_financial_access"("auth"."uid"()));



CREATE POLICY "Roles visible to admins and financeiros" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("public"."is_admin"("auth"."uid"()) OR "public"."is_financeiro"("auth"."uid"()) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Suppliers visible to financial users" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ("public"."has_financial_access"("auth"."uid"()));



CREATE POLICY "Tags visible to financial users" ON "public"."tags" FOR SELECT USING ("public"."has_financial_access"("auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own supplier invoices" ON "public"."supplier_invoices" TO "authenticated" USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."accounts_payable" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accounts_receivable" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_absences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."supplier_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."accounts_payable";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."accounts_receivable";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."suppliers";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_financial_access"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_financial_access"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_financial_access"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_financial_write_access"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."has_financial_write_access"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_financial_write_access"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_system_log"("p_user_id" "uuid", "p_user_name" "text", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_details" "jsonb", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_system_log"("p_user_id" "uuid", "p_user_name" "text", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_details" "jsonb", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_system_log"("p_user_id" "uuid", "p_user_name" "text", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_details" "jsonb", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_financeiro"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_financeiro"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_financeiro"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_viewer"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_viewer"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_viewer"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts_payable" TO "anon";
GRANT ALL ON TABLE "public"."accounts_payable" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts_payable" TO "service_role";



GRANT ALL ON TABLE "public"."accounts_receivable" TO "anon";
GRANT ALL ON TABLE "public"."accounts_receivable" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts_receivable" TO "service_role";



GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."employee_absences" TO "anon";
GRANT ALL ON TABLE "public"."employee_absences" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_absences" TO "service_role";



GRANT ALL ON TABLE "public"."employee_documents" TO "anon";
GRANT ALL ON TABLE "public"."employee_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_documents" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."payroll" TO "anon";
GRANT ALL ON TABLE "public"."payroll" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_invoices" TO "anon";
GRANT ALL ON TABLE "public"."supplier_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop trigger if exists "update_accounts_payable_updated_at" on "public"."accounts_payable";

drop trigger if exists "update_accounts_receivable_updated_at" on "public"."accounts_receivable";

drop trigger if exists "update_profiles_updated_at" on "public"."profiles";

drop trigger if exists "update_suppliers_updated_at" on "public"."suppliers";

drop policy "Financial users can create payables" on "public"."accounts_payable";

drop policy "Financial users can update payables" on "public"."accounts_payable";

drop policy "Only admins can delete payables" on "public"."accounts_payable";

drop policy "Payables visible to financial users" on "public"."accounts_payable";

drop policy "Financial users can create receivables" on "public"."accounts_receivable";

drop policy "Financial users can update receivables" on "public"."accounts_receivable";

drop policy "Only admins can delete receivables" on "public"."accounts_receivable";

drop policy "Receivables visible to financial users" on "public"."accounts_receivable";

drop policy "Attachments visible to financial users" on "public"."attachments";

drop policy "Financial users can create attachments" on "public"."attachments";

drop policy "Financial users can delete attachments" on "public"."attachments";

drop policy "Only admins can view audit logs" on "public"."audit_logs";

drop policy "Financial users can create suppliers" on "public"."suppliers";

drop policy "Financial users can update suppliers" on "public"."suppliers";

drop policy "Only admins can delete suppliers" on "public"."suppliers";

drop policy "Suppliers visible to financial users" on "public"."suppliers";

drop policy "Admins can view all logs" on "public"."system_logs";

drop policy "Admins can manage tags" on "public"."tags";

drop policy "Tags visible to financial users" on "public"."tags";

drop policy "Only admins can delete roles" on "public"."user_roles";

drop policy "Only admins can manage roles" on "public"."user_roles";

drop policy "Only admins can update roles" on "public"."user_roles";

drop policy "Roles visible to admins and financeiros" on "public"."user_roles";

alter table "public"."accounts_payable" drop constraint "accounts_payable_parent_id_fkey";

alter table "public"."accounts_payable" drop constraint "accounts_payable_supplier_id_fkey";

alter table "public"."accounts_receivable" drop constraint "accounts_receivable_parent_id_fkey";

alter table "public"."employee_absences" drop constraint "employee_absences_employee_id_fkey";

alter table "public"."employee_documents" drop constraint "employee_documents_employee_id_fkey";

alter table "public"."payroll" drop constraint "payroll_employee_id_fkey";

alter table "public"."supplier_invoices" drop constraint "supplier_invoices_account_payable_id_fkey";

alter table "public"."supplier_invoices" drop constraint "supplier_invoices_supplier_id_fkey";

drop function if exists "public"."has_role"(_user_id uuid, _role app_role);

alter table "public"."accounts_payable" alter column "status" set default 'a_vencer'::public.account_status;

alter table "public"."accounts_payable" alter column "status" set data type public.account_status using "status"::text::public.account_status;

alter table "public"."accounts_receivable" alter column "status" set default 'a_vencer'::public.account_status;

alter table "public"."accounts_receivable" alter column "status" set data type public.account_status using "status"::text::public.account_status;

alter table "public"."user_roles" alter column "role" set data type public.app_role using "role"::text::public.app_role;

alter table "public"."accounts_payable" add constraint "accounts_payable_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.accounts_payable(id) not valid;

alter table "public"."accounts_payable" validate constraint "accounts_payable_parent_id_fkey";

alter table "public"."accounts_payable" add constraint "accounts_payable_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) not valid;

alter table "public"."accounts_payable" validate constraint "accounts_payable_supplier_id_fkey";

alter table "public"."accounts_receivable" add constraint "accounts_receivable_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.accounts_receivable(id) not valid;

alter table "public"."accounts_receivable" validate constraint "accounts_receivable_parent_id_fkey";

alter table "public"."employee_absences" add constraint "employee_absences_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_absences" validate constraint "employee_absences_employee_id_fkey";

alter table "public"."employee_documents" add constraint "employee_documents_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."employee_documents" validate constraint "employee_documents_employee_id_fkey";

alter table "public"."payroll" add constraint "payroll_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "public"."payroll" validate constraint "payroll_employee_id_fkey";

alter table "public"."supplier_invoices" add constraint "supplier_invoices_account_payable_id_fkey" FOREIGN KEY (account_payable_id) REFERENCES public.accounts_payable(id) not valid;

alter table "public"."supplier_invoices" validate constraint "supplier_invoices_account_payable_id_fkey";

alter table "public"."supplier_invoices" add constraint "supplier_invoices_supplier_id_fkey" FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE not valid;

alter table "public"."supplier_invoices" validate constraint "supplier_invoices_supplier_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$function$
;


  create policy "Financial users can create payables"
  on "public"."accounts_payable"
  as permissive
  for insert
  to authenticated
with check (public.has_financial_write_access(auth.uid()));



  create policy "Financial users can update payables"
  on "public"."accounts_payable"
  as permissive
  for update
  to authenticated
using (public.has_financial_write_access(auth.uid()));



  create policy "Only admins can delete payables"
  on "public"."accounts_payable"
  as permissive
  for delete
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Payables visible to financial users"
  on "public"."accounts_payable"
  as permissive
  for select
  to authenticated
using (public.has_financial_access(auth.uid()));



  create policy "Financial users can create receivables"
  on "public"."accounts_receivable"
  as permissive
  for insert
  to authenticated
with check (public.has_financial_write_access(auth.uid()));



  create policy "Financial users can update receivables"
  on "public"."accounts_receivable"
  as permissive
  for update
  to authenticated
using (public.has_financial_write_access(auth.uid()));



  create policy "Only admins can delete receivables"
  on "public"."accounts_receivable"
  as permissive
  for delete
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Receivables visible to financial users"
  on "public"."accounts_receivable"
  as permissive
  for select
  to authenticated
using (public.has_financial_access(auth.uid()));



  create policy "Attachments visible to financial users"
  on "public"."attachments"
  as permissive
  for select
  to authenticated
using (public.has_financial_access(auth.uid()));



  create policy "Financial users can create attachments"
  on "public"."attachments"
  as permissive
  for insert
  to authenticated
with check (public.has_financial_write_access(auth.uid()));



  create policy "Financial users can delete attachments"
  on "public"."attachments"
  as permissive
  for delete
  to authenticated
using (public.has_financial_write_access(auth.uid()));



  create policy "Only admins can view audit logs"
  on "public"."audit_logs"
  as permissive
  for select
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Financial users can create suppliers"
  on "public"."suppliers"
  as permissive
  for insert
  to authenticated
with check (public.has_financial_write_access(auth.uid()));



  create policy "Financial users can update suppliers"
  on "public"."suppliers"
  as permissive
  for update
  to authenticated
using (public.has_financial_write_access(auth.uid()));



  create policy "Only admins can delete suppliers"
  on "public"."suppliers"
  as permissive
  for delete
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Suppliers visible to financial users"
  on "public"."suppliers"
  as permissive
  for select
  to authenticated
using (public.has_financial_access(auth.uid()));



  create policy "Admins can view all logs"
  on "public"."system_logs"
  as permissive
  for select
  to public
using (public.is_admin(auth.uid()));



  create policy "Admins can manage tags"
  on "public"."tags"
  as permissive
  for all
  to public
using (public.is_admin(auth.uid()));



  create policy "Tags visible to financial users"
  on "public"."tags"
  as permissive
  for select
  to public
using (public.has_financial_access(auth.uid()));



  create policy "Only admins can delete roles"
  on "public"."user_roles"
  as permissive
  for delete
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Only admins can manage roles"
  on "public"."user_roles"
  as permissive
  for insert
  to authenticated
with check (public.is_admin(auth.uid()));



  create policy "Only admins can update roles"
  on "public"."user_roles"
  as permissive
  for update
  to authenticated
using (public.is_admin(auth.uid()));



  create policy "Roles visible to admins and financeiros"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((public.is_admin(auth.uid()) OR public.is_financeiro(auth.uid()) OR (user_id = auth.uid())));


CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Financial users can delete attachments"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'attachments'::text) AND public.has_financial_write_access(auth.uid())));



  create policy "Financial users can upload attachments"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'attachments'::text) AND public.has_financial_write_access(auth.uid())));



  create policy "Financial users can view attachments"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'attachments'::text) AND public.has_financial_access(auth.uid())));



  create policy "Users can delete own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



