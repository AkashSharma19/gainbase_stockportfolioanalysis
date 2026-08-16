-- SQL Schema for Gainbase Table-Level Cloud Sync
-- Run this in the Supabase SQL Editor

-- 1. PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    user_mobile TEXT,
    user_image TEXT,
    primary_device_id TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    institution TEXT,
    account_number TEXT,
    credit_limit NUMERIC,
    interest_rate NUMERIC,
    include_in_assets BOOLEAN NOT NULL DEFAULT true,
    linked_broker TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. MONEY TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.money_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    account_id TEXT REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    date TIMESTAMPTZ NOT NULL,
    note TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurring_frequency TEXT,
    attachment_uri TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LOANS TABLE
CREATE TABLE IF NOT EXISTS public.loans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lender_name TEXT NOT NULL,
    principal_amount NUMERIC NOT NULL,
    outstanding_amount NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,
    emi_amount NUMERIC NOT NULL,
    tenure_months INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    linked_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. EMI PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.emi_payments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id TEXT REFERENCES public.loans(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    principal_portion NUMERIC NOT NULL,
    interest_portion NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    transaction_id TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_limit NUMERIC NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. BUDGET CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_id TEXT REFERENCES public.budgets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    limit_amount NUMERIC NOT NULL, -- renamed from "limit" because limit is a SQL reserved keyword
    spent NUMERIC NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_payment_date TIMESTAMPTZ NOT NULL,
    linked_account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    logo TEXT,
    color TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SUBSCRIPTION PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    transaction_id TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. PORTFOLIO TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.portfolio_transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    currency TEXT NOT NULL,
    broker TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. WATCHLIST TABLE
CREATE TABLE IF NOT EXISTS public.watchlist (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. ENABLE ROW-LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- 13. DEFINE SECURITY POLICIES FOR EACH TABLE

-- Profiles Policies
CREATE POLICY "Users can manage their own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Accounts Policies
CREATE POLICY "Users can manage their own accounts"
    ON public.accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Money Transactions Policies
CREATE POLICY "Users can manage their own transactions"
    ON public.money_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Loans Policies
CREATE POLICY "Users can manage their own loans"
    ON public.loans FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- EMI Payments Policies
CREATE POLICY "Users can manage their own emi payments"
    ON public.emi_payments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can manage their own budgets"
    ON public.budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Budget Categories Policies
CREATE POLICY "Users can manage their own budget categories"
    ON public.budget_categories FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Subscriptions Policies
CREATE POLICY "Users can manage their own subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Subscription Payments Policies
CREATE POLICY "Users can manage their own subscription payments"
    ON public.subscription_payments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Portfolio Transactions Policies
CREATE POLICY "Users can manage their own portfolio transactions"
    ON public.portfolio_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Watchlist Policies
CREATE POLICY "Users can manage their own watchlist"
    ON public.watchlist FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 14. HELPER TRIGGER FOR UPDATED_AT MUTATION TIMES
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.money_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.emi_payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscription_payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.portfolio_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.watchlist FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
