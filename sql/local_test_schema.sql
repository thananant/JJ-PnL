--
-- PostgreSQL database dump
--

\restrict E70Fz86BBau96XTk5mKOQVFzQN9OeSvUhbzNGJP37M94o1GQbtfuTq8kscQ1uUr

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id text,
    name text
);


--
-- Name: pnl_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_benchmarks (
    bkey text NOT NULL,
    period text NOT NULL,
    pct numeric NOT NULL
);


--
-- Name: pnl_bill_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_bill_items (
    id bigint NOT NULL,
    branch text NOT NULL,
    d date NOT NULL,
    supplier_id bigint NOT NULL,
    item text NOT NULL,
    qty numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'ชิ้น'::text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    vat_mode text DEFAULT 'none'::text NOT NULL,
    bill_no integer DEFAULT 1 NOT NULL,
    discount numeric DEFAULT 0 NOT NULL,
    bill_discount numeric DEFAULT 0 NOT NULL,
    ship_fee numeric DEFAULT 0 NOT NULL,
    other_fee numeric DEFAULT 0 NOT NULL
);


--
-- Name: pnl_bill_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_bill_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_bill_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_branches (
    code text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort integer DEFAULT 100 NOT NULL
);


--
-- Name: pnl_cash_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_cash_expenses (
    id bigint NOT NULL,
    branch text NOT NULL,
    d date NOT NULL,
    shift text DEFAULT 'เช้า'::text NOT NULL,
    descr text DEFAULT ''::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL
);


--
-- Name: pnl_cash_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_cash_expenses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_cash_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_expense_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_expense_daily (
    branch text NOT NULL,
    d date NOT NULL,
    supplier_id bigint NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    note text
);


--
-- Name: pnl_extra_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_extra_expenses (
    id bigint NOT NULL,
    branch text NOT NULL,
    d date NOT NULL,
    descr text DEFAULT ''::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    requester text
);


--
-- Name: pnl_extra_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_extra_expenses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_extra_expenses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_fix_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_fix_groups (
    name text NOT NULL,
    sort integer DEFAULT 100 NOT NULL
);


--
-- Name: pnl_fixed_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_fixed_items (
    id bigint NOT NULL,
    branch text NOT NULL,
    grp text NOT NULL,
    name text NOT NULL,
    default_amount numeric,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: pnl_fixed_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_fixed_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_fixed_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_fixed_monthly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_fixed_monthly (
    branch text NOT NULL,
    month text NOT NULL,
    item_id bigint NOT NULL,
    amount numeric DEFAULT 0 NOT NULL
);


--
-- Name: pnl_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_history (
    branch text NOT NULL,
    month text NOT NULL,
    revenue numeric DEFAULT 0 NOT NULL,
    note text
);


--
-- Name: pnl_history_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_history_items (
    branch text NOT NULL,
    month text NOT NULL,
    name text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL
);


--
-- Name: pnl_income_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_income_daily (
    branch text NOT NULL,
    d date NOT NULL,
    sales_pos_am numeric DEFAULT 0 NOT NULL,
    sales_pos_pm numeric DEFAULT 0 NOT NULL,
    deposit_am numeric DEFAULT 0 NOT NULL,
    deposit_pm numeric DEFAULT 0 NOT NULL,
    cash_drawer_am numeric DEFAULT 0 NOT NULL,
    cash_drawer_pm numeric DEFAULT 0 NOT NULL,
    transfer_total_am numeric DEFAULT 0 NOT NULL,
    transfer_total_pm numeric DEFAULT 0 NOT NULL,
    reserve_acct_am numeric DEFAULT 0 NOT NULL,
    reserve_acct_pm numeric DEFAULT 0 NOT NULL,
    transfer_pending_prev_am numeric DEFAULT 0 NOT NULL,
    transfer_pending_prev_pm numeric DEFAULT 0 NOT NULL,
    drawer_open_am numeric DEFAULT 0 NOT NULL,
    drawer_open_pm numeric DEFAULT 0 NOT NULL,
    note text
);


--
-- Name: pnl_item_alias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_item_alias (
    supplier_id integer,
    alias text,
    item text,
    unit text,
    bill_unit text,
    factor numeric
);


--
-- Name: pnl_meat_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_meat_daily (
    branch text NOT NULL,
    d date NOT NULL,
    meat_id bigint NOT NULL,
    kg numeric DEFAULT 0 NOT NULL
);


--
-- Name: pnl_meat_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_meat_prices (
    id bigint NOT NULL,
    branch text NOT NULL,
    name text NOT NULL,
    price_kg numeric DEFAULT 0 NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: pnl_meat_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_meat_prices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_meat_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_month_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_month_meta (
    branch text NOT NULL,
    month text NOT NULL,
    grab numeric DEFAULT 0 NOT NULL,
    lineman numeric DEFAULT 0 NOT NULL,
    days_divisor integer,
    note text
);


--
-- Name: pnl_pv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_pv (
    id bigint NOT NULL,
    branch text NOT NULL,
    pv_no text NOT NULL,
    pv_date date DEFAULT CURRENT_DATE NOT NULL,
    d_from date NOT NULL,
    d_to date NOT NULL,
    vat_type text DEFAULT 'NON-VAT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pnl_pv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_pv ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_pv_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_pv_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_pv_items (
    id bigint NOT NULL,
    pv_id bigint NOT NULL,
    supplier_id bigint,
    amount numeric DEFAULT 0 NOT NULL,
    vat_amount numeric DEFAULT 0 NOT NULL,
    scheduled boolean DEFAULT false NOT NULL,
    paid boolean DEFAULT false NOT NULL
);


--
-- Name: pnl_pv_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_pv_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_pv_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_shopee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_shopee (
    id bigint NOT NULL,
    branch text NOT NULL,
    d date NOT NULL,
    item text DEFAULT ''::text NOT NULL,
    shop text,
    topup numeric DEFAULT 0 NOT NULL,
    shipping numeric DEFAULT 0 NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    qty numeric DEFAULT 1 NOT NULL
);


--
-- Name: pnl_shopee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_shopee ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_shopee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_stock_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_stock_map (
    id bigint NOT NULL,
    branch text NOT NULL,
    product_id text NOT NULL,
    product_name text DEFAULT ''::text NOT NULL,
    pnl_item text NOT NULL,
    bill_unit text DEFAULT ''::text NOT NULL,
    stock_unit text DEFAULT ''::text NOT NULL,
    factor numeric DEFAULT 1 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pnl_stock_map_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_stock_map ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_stock_map_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_sup_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_sup_items (
    supplier_id integer,
    item text,
    unit text,
    sort integer
);


--
-- Name: pnl_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_suppliers (
    id bigint NOT NULL,
    category text NOT NULL,
    name text NOT NULL,
    payment_term text,
    vat_type text DEFAULT 'NON-VAT'::text NOT NULL,
    bank text,
    account_no text,
    account_name text,
    full_name text,
    sort integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: pnl_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_suppliers ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pnl_unit_conv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pnl_unit_conv (
    id bigint NOT NULL,
    item text NOT NULL,
    from_unit text NOT NULL,
    to_unit text NOT NULL,
    factor numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pnl_unit_conv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.pnl_unit_conv ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.pnl_unit_conv_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id text NOT NULL,
    branch_id text,
    name text,
    safety numeric,
    max numeric,
    unit text,
    sup text,
    deleted_at timestamp with time zone
);


--
-- Name: stock_counts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_counts (
    id bigint,
    branch_id text,
    count_date date,
    product_id text,
    qty numeric
);


--
-- Name: stock_current; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_current (
    branch_id text,
    product_id text,
    qty numeric
);


--
-- Name: pnl_benchmarks pnl_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_benchmarks
    ADD CONSTRAINT pnl_benchmarks_pkey PRIMARY KEY (bkey, period);


--
-- Name: pnl_bill_items pnl_bill_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_bill_items
    ADD CONSTRAINT pnl_bill_items_pkey PRIMARY KEY (id);


--
-- Name: pnl_branches pnl_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_branches
    ADD CONSTRAINT pnl_branches_pkey PRIMARY KEY (code);


--
-- Name: pnl_cash_expenses pnl_cash_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_cash_expenses
    ADD CONSTRAINT pnl_cash_expenses_pkey PRIMARY KEY (id);


--
-- Name: pnl_expense_daily pnl_expense_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_expense_daily
    ADD CONSTRAINT pnl_expense_daily_pkey PRIMARY KEY (branch, d, supplier_id);


--
-- Name: pnl_extra_expenses pnl_extra_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_extra_expenses
    ADD CONSTRAINT pnl_extra_expenses_pkey PRIMARY KEY (id);


--
-- Name: pnl_fix_groups pnl_fix_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fix_groups
    ADD CONSTRAINT pnl_fix_groups_pkey PRIMARY KEY (name);


--
-- Name: pnl_fixed_items pnl_fixed_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fixed_items
    ADD CONSTRAINT pnl_fixed_items_pkey PRIMARY KEY (id);


--
-- Name: pnl_fixed_monthly pnl_fixed_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fixed_monthly
    ADD CONSTRAINT pnl_fixed_monthly_pkey PRIMARY KEY (branch, month, item_id);


--
-- Name: pnl_history_items pnl_history_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_history_items
    ADD CONSTRAINT pnl_history_items_pkey PRIMARY KEY (branch, month, name);


--
-- Name: pnl_history pnl_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_history
    ADD CONSTRAINT pnl_history_pkey PRIMARY KEY (branch, month);


--
-- Name: pnl_income_daily pnl_income_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_income_daily
    ADD CONSTRAINT pnl_income_daily_pkey PRIMARY KEY (branch, d);


--
-- Name: pnl_meat_daily pnl_meat_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_meat_daily
    ADD CONSTRAINT pnl_meat_daily_pkey PRIMARY KEY (branch, d, meat_id);


--
-- Name: pnl_meat_prices pnl_meat_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_meat_prices
    ADD CONSTRAINT pnl_meat_prices_pkey PRIMARY KEY (id);


--
-- Name: pnl_month_meta pnl_month_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_month_meta
    ADD CONSTRAINT pnl_month_meta_pkey PRIMARY KEY (branch, month);


--
-- Name: pnl_pv_items pnl_pv_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_pv_items
    ADD CONSTRAINT pnl_pv_items_pkey PRIMARY KEY (id);


--
-- Name: pnl_pv pnl_pv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_pv
    ADD CONSTRAINT pnl_pv_pkey PRIMARY KEY (id);


--
-- Name: pnl_shopee pnl_shopee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_shopee
    ADD CONSTRAINT pnl_shopee_pkey PRIMARY KEY (id);


--
-- Name: pnl_stock_map pnl_stock_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_stock_map
    ADD CONSTRAINT pnl_stock_map_pkey PRIMARY KEY (id);


--
-- Name: pnl_stock_map pnl_stock_map_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_stock_map
    ADD CONSTRAINT pnl_stock_map_product_id_key UNIQUE (product_id);


--
-- Name: pnl_suppliers pnl_suppliers_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_suppliers
    ADD CONSTRAINT pnl_suppliers_name_key UNIQUE (name);


--
-- Name: pnl_suppliers pnl_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_suppliers
    ADD CONSTRAINT pnl_suppliers_pkey PRIMARY KEY (id);


--
-- Name: pnl_unit_conv pnl_unit_conv_item_from_unit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_unit_conv
    ADD CONSTRAINT pnl_unit_conv_item_from_unit_key UNIQUE (item, from_unit);


--
-- Name: pnl_unit_conv pnl_unit_conv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_unit_conv
    ADD CONSTRAINT pnl_unit_conv_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: idx_cashx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashx ON public.pnl_cash_expenses USING btree (branch, d);


--
-- Name: idx_expd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expd ON public.pnl_expense_daily USING btree (branch, d);


--
-- Name: idx_extra; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extra ON public.pnl_extra_expenses USING btree (branch, d);


--
-- Name: idx_pnlbi_branch_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnlbi_branch_d ON public.pnl_bill_items USING btree (branch, d);


--
-- Name: idx_pnlbi_branch_sup_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnlbi_branch_sup_d ON public.pnl_bill_items USING btree (branch, supplier_id, d);


--
-- Name: idx_pnlexp_branch_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnlexp_branch_d ON public.pnl_expense_daily USING btree (branch, d);


--
-- Name: idx_pnlinc_branch_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pnlinc_branch_d ON public.pnl_income_daily USING btree (branch, d);


--
-- Name: idx_shopee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopee ON public.pnl_shopee USING btree (branch, d);


--
-- Name: idx_stkc_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stkc_branch_date ON public.stock_counts USING btree (branch_id, count_date);


--
-- Name: pnl_bill_items_billno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pnl_bill_items_billno ON public.pnl_bill_items USING btree (branch, d, supplier_id, bill_no);


--
-- Name: pnl_bill_items_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pnl_bill_items_key ON public.pnl_bill_items USING btree (branch, d, supplier_id);


--
-- Name: pnl_bill_items pnl_bill_items_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_bill_items
    ADD CONSTRAINT pnl_bill_items_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_bill_items pnl_bill_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_bill_items
    ADD CONSTRAINT pnl_bill_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.pnl_suppliers(id);


--
-- Name: pnl_cash_expenses pnl_cash_expenses_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_cash_expenses
    ADD CONSTRAINT pnl_cash_expenses_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_expense_daily pnl_expense_daily_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_expense_daily
    ADD CONSTRAINT pnl_expense_daily_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_expense_daily pnl_expense_daily_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_expense_daily
    ADD CONSTRAINT pnl_expense_daily_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.pnl_suppliers(id);


--
-- Name: pnl_extra_expenses pnl_extra_expenses_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_extra_expenses
    ADD CONSTRAINT pnl_extra_expenses_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_fixed_items pnl_fixed_items_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fixed_items
    ADD CONSTRAINT pnl_fixed_items_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_fixed_monthly pnl_fixed_monthly_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fixed_monthly
    ADD CONSTRAINT pnl_fixed_monthly_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_fixed_monthly pnl_fixed_monthly_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_fixed_monthly
    ADD CONSTRAINT pnl_fixed_monthly_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.pnl_fixed_items(id) ON DELETE CASCADE;


--
-- Name: pnl_history pnl_history_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_history
    ADD CONSTRAINT pnl_history_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_history_items pnl_history_items_branch_month_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_history_items
    ADD CONSTRAINT pnl_history_items_branch_month_fkey FOREIGN KEY (branch, month) REFERENCES public.pnl_history(branch, month) ON DELETE CASCADE;


--
-- Name: pnl_income_daily pnl_income_daily_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_income_daily
    ADD CONSTRAINT pnl_income_daily_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_meat_daily pnl_meat_daily_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_meat_daily
    ADD CONSTRAINT pnl_meat_daily_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_meat_daily pnl_meat_daily_meat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_meat_daily
    ADD CONSTRAINT pnl_meat_daily_meat_id_fkey FOREIGN KEY (meat_id) REFERENCES public.pnl_meat_prices(id) ON DELETE CASCADE;


--
-- Name: pnl_meat_prices pnl_meat_prices_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_meat_prices
    ADD CONSTRAINT pnl_meat_prices_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_month_meta pnl_month_meta_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_month_meta
    ADD CONSTRAINT pnl_month_meta_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_pv pnl_pv_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_pv
    ADD CONSTRAINT pnl_pv_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_pv_items pnl_pv_items_pv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_pv_items
    ADD CONSTRAINT pnl_pv_items_pv_id_fkey FOREIGN KEY (pv_id) REFERENCES public.pnl_pv(id) ON DELETE CASCADE;


--
-- Name: pnl_pv_items pnl_pv_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_pv_items
    ADD CONSTRAINT pnl_pv_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.pnl_suppliers(id);


--
-- Name: pnl_shopee pnl_shopee_branch_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pnl_shopee
    ADD CONSTRAINT pnl_shopee_branch_fkey FOREIGN KEY (branch) REFERENCES public.pnl_branches(code);


--
-- Name: pnl_benchmarks allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_benchmarks USING (true) WITH CHECK (true);


--
-- Name: pnl_bill_items allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_bill_items USING (true) WITH CHECK (true);


--
-- Name: pnl_branches allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_branches USING (true) WITH CHECK (true);


--
-- Name: pnl_cash_expenses allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_cash_expenses USING (true) WITH CHECK (true);


--
-- Name: pnl_expense_daily allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_expense_daily USING (true) WITH CHECK (true);


--
-- Name: pnl_extra_expenses allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_extra_expenses USING (true) WITH CHECK (true);


--
-- Name: pnl_fix_groups allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_fix_groups USING (true) WITH CHECK (true);


--
-- Name: pnl_fixed_items allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_fixed_items USING (true) WITH CHECK (true);


--
-- Name: pnl_fixed_monthly allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_fixed_monthly USING (true) WITH CHECK (true);


--
-- Name: pnl_history allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_history USING (true) WITH CHECK (true);


--
-- Name: pnl_history_items allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_history_items USING (true) WITH CHECK (true);


--
-- Name: pnl_income_daily allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_income_daily USING (true) WITH CHECK (true);


--
-- Name: pnl_meat_daily allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_meat_daily USING (true) WITH CHECK (true);


--
-- Name: pnl_meat_prices allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_meat_prices USING (true) WITH CHECK (true);


--
-- Name: pnl_month_meta allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_month_meta USING (true) WITH CHECK (true);


--
-- Name: pnl_pv allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_pv USING (true) WITH CHECK (true);


--
-- Name: pnl_pv_items allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_pv_items USING (true) WITH CHECK (true);


--
-- Name: pnl_shopee allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_shopee USING (true) WITH CHECK (true);


--
-- Name: pnl_stock_map allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_stock_map USING (true) WITH CHECK (true);


--
-- Name: pnl_suppliers allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_suppliers USING (true) WITH CHECK (true);


--
-- Name: pnl_unit_conv allow_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_all ON public.pnl_unit_conv USING (true) WITH CHECK (true);


--
-- Name: products auth_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_only ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: pnl_benchmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_benchmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_bill_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_bill_items ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_branches ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_cash_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_cash_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_expense_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_expense_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_extra_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_extra_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_fix_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_fix_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_fixed_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_fixed_items ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_fixed_monthly; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_fixed_monthly ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_history ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_history_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_history_items ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_income_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_income_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_meat_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_meat_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_meat_prices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_meat_prices ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_month_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_month_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_pv; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_pv ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_pv_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_pv_items ENABLE ROW LEVEL SECURITY;

--
-- Name: products pnl_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pnl_read ON public.products FOR SELECT TO anon, authenticated USING (true);


--
-- Name: stock_counts pnl_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pnl_read ON public.stock_counts FOR SELECT USING (true);


--
-- Name: pnl_shopee; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_shopee ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_stock_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_stock_map ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: pnl_unit_conv; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pnl_unit_conv ENABLE ROW LEVEL SECURITY;

--
-- Name: products pnl_write_safety; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pnl_write_safety ON public.products FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_counts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime pnl_bill_items; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_bill_items;


--
-- Name: supabase_realtime pnl_cash_expenses; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_cash_expenses;


--
-- Name: supabase_realtime pnl_expense_daily; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_expense_daily;


--
-- Name: supabase_realtime pnl_fixed_monthly; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_fixed_monthly;


--
-- Name: supabase_realtime pnl_income_daily; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_income_daily;


--
-- Name: supabase_realtime pnl_month_meta; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_month_meta;


--
-- Name: supabase_realtime pnl_shopee; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_shopee;


--
-- Name: supabase_realtime pnl_stock_map; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.pnl_stock_map;


--
-- PostgreSQL database dump complete
--

\unrestrict E70Fz86BBau96XTk5mKOQVFzQN9OeSvUhbzNGJP37M94o1GQbtfuTq8kscQ1uUr

