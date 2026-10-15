-- jjmk-branches.sql — ทะเบียนสาขากลาง + ปุ่ม "🏪 เปิดสาขาใหม่" (JJ Access)
-- เจ้าของถาม 2026-10-15: "ถ้ามีการเพิ่มสาขาใหม่ อยากให้เพิ่มไปในทุกระบบเลย แบบปุ่มเดียว"
--
-- รันครั้งเดียวใน Supabase → SQL Editor · รันซ้ำได้ · ไม่ลบ/ไม่แก้ข้อมูลเดิม (เพิ่มคอลัมน์ + เติมค่าที่ยังว่าง + คลายกติกาที่ล็อกชื่อสาขาไว้ตายตัว)
--
-- ทำอะไรบ้าง
--   1) pnl_branches = ทะเบียนสาขากลางของทุกแอพ: เพิ่มช่อง ประเภท/ชื่อสั้น/รหัสในระบบนับสต๊อก/สี/สาขาภาษี/ที่อยู่/วันเปิด
--   2) branches (ระบบนับสต๊อก + ซ่อมบำรุง) เพิ่มช่อง code ผูกกับรหัสสาขา
--   3) pnl_users.unit (ประจำที่) + cal_special_days.order_branches (วันขายดี) รับรหัสสาขาใหม่ได้ ไม่ต้องรัน SQL ทุกครั้งที่เปิดสาขา
--   4) ฟังก์ชัน jj_branch_open = ปุ่มเปิดสาขา (สร้างสาขาทุกระบบ + คัดลอกสินค้าที่เลือก/งานซ่อมบำรุง/อุปกรณ์/Fix cost จากสาขาต้นแบบ ในครั้งเดียว)
--      + jj_branch_undo = ยกเลิกสาขาที่เพิ่งเปิดผิด (ได้เฉพาะตอนยังไม่มีข้อมูลการขาย/นับ/บิล/สแกน)
--   5) KPI: ชื่อสาขาในสรุปไลน์อ่านจากทะเบียน · ซิงก์พนักงานไม่ปิดพนักงานสาขาใหม่ · เพิ่มกลุ่มไลน์สาขาใหม่ไม่ย้อนส่งของเก่า

-- ============================================================
-- 1) ทะเบียนสาขากลาง (pnl_branches) — แอพ P&L/Owner/ปฏิทิน/Social/ครัวกลาง/ออฟฟิศ อ่านตารางนี้อยู่แล้ว
-- ============================================================
alter table public.pnl_branches add column if not exists is_central boolean default false;
alter table public.pnl_branches add column if not exists kind       text;          -- store หน้าร้าน · office ออฟฟิศ · kitchen ครัวกลาง
alter table public.pnl_branches add column if not exists short      text;          -- ชื่อสั้นบนปุ่ม เช่น รัชดา
alter table public.pnl_branches add column if not exists stk_id     text;          -- branches.id ของระบบนับสต๊อก
alter table public.pnl_branches add column if not exists color      text;          -- สีประจำสาขา (#RRGGBB) ไม่ใส่ = แอพเลือกให้
alter table public.pnl_branches add column if not exists active     boolean default true;
alter table public.pnl_branches add column if not exists opened_on  date;          -- วันเปิดสาขา
alter table public.pnl_branches add column if not exists tax_branch text;          -- ใบกำกับภาษี: null = สำนักงานใหญ่ · '00001' = สาขาที่ 00001
alter table public.pnl_branches add column if not exists addr       text;          -- ที่อยู่สาขาบนใบกำกับภาษี (เฉพาะสาขาที่จดภาษีแยก)
alter table public.pnl_branches add column if not exists created_at timestamptz default now();

update public.pnl_branches
   set kind = case when code in ('JJOF','OFFICE') or coalesce(is_central, false) then 'office'
                   when code = 'JJCK' then 'kitchen'
                   else 'store' end
 where kind is null;
alter table public.pnl_branches alter column kind set default 'store';
update public.pnl_branches set active = true where active is null;
update public.pnl_branches set stk_id = 'b19f0a17b4472'   where code = 'JJRD' and stk_id is null;
update public.pnl_branches set stk_id = 'b19f0a17b448212' where code = 'JJLP' and stk_id is null;

do $$ begin
  alter table public.pnl_branches drop constraint if exists pnl_branches_kind_ck;
  alter table public.pnl_branches add  constraint pnl_branches_kind_ck check (kind in ('store','office','kitchen'));
  alter table public.pnl_branches drop constraint if exists pnl_branches_color_ck;
  alter table public.pnl_branches add  constraint pnl_branches_color_ck check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  alter table public.pnl_branches drop constraint if exists pnl_branches_tax_ck;
  alter table public.pnl_branches add  constraint pnl_branches_tax_ck check (tax_branch is null or tax_branch ~ '^[0-9]{5}$');
end $$;
do $$ begin
  create unique index if not exists pnl_branches_code_uq on public.pnl_branches (code);
exception when others then
  raise notice 'pnl_branches มีรหัสสาขาซ้ำกันอยู่ — ข้ามการสร้าง unique index (%)', sqlerrm;
end $$;
grant select on public.pnl_branches to anon, authenticated;

-- ============================================================
-- 2) ตาราง branches ของระบบนับสต๊อก/ซ่อมบำรุง: เพิ่มรหัสสาขา (เดิมจับคู่จากชื่อ)
-- ============================================================
do $$ begin
  if to_regclass('public.branches') is not null then
    alter table public.branches add column if not exists code text;
    -- ① รหัสร้านเดิมจาก id ตรงตัว ② ครัวกลาง/ออฟฟิศจากชื่อ (ก่อนชื่อสาขา — ชื่ออาจมีทำเลต่อท้าย เช่น "ครัวกลาง รัชดา")
    -- ③ รัชดา/ลาดพร้าวจากชื่อ เฉพาะเมื่อยังไม่มีแถวไหนได้รหัสนั้น และชื่อตรงแถวเดียว (กันรหัสซ้ำ)
    update public.branches set code = 'JJRD' where code is null and id = 'b19f0a17b4472'   and not exists (select 1 from public.branches z where z.code = 'JJRD');
    update public.branches set code = 'JJLP' where code is null and id = 'b19f0a17b448212' and not exists (select 1 from public.branches z where z.code = 'JJLP');
    update public.branches set code = 'JJCK'   where code is null and name ~* 'ครัวกลาง|central ?kitchen'
      and not exists (select 1 from public.branches z where z.code = 'JJCK')
      and (select count(*) from public.branches z where z.code is null and z.name ~* 'ครัวกลาง|central ?kitchen') = 1;
    update public.branches set code = 'OFFICE' where code is null and name ~* 'ออฟฟิศ|สำนักงาน|office'
      and not exists (select 1 from public.branches z where z.code = 'OFFICE')
      and (select count(*) from public.branches z where z.code is null and z.name ~* 'ออฟฟิศ|สำนักงาน|office') = 1;
    update public.branches set code = 'JJRD'   where code is null and name ~* 'รัชดา|ratchada'
      and not exists (select 1 from public.branches z where z.code = 'JJRD')
      and (select count(*) from public.branches z where z.code is null and z.name ~* 'รัชดา|ratchada') = 1;
    update public.branches set code = 'JJLP'   where code is null and name ~* 'ลาดพร้าว|lad ?prao|lat ?phrao'
      and not exists (select 1 from public.branches z where z.code = 'JJLP')
      and (select count(*) from public.branches z where z.code is null and z.name ~* 'ลาดพร้าว|lad ?prao|lat ?phrao') = 1;
    begin
      create unique index if not exists branches_code_uq on public.branches (code) where code is not null;
    exception when others then raise notice 'branches: รหัสซ้ำ — ข้าม unique index (%)', sqlerrm; end;
  end if;
end $$;

-- ============================================================
-- 3) คลายกติกาที่ล็อกรหัสสาขาไว้ตายตัว (ต่อไปเปิดสาขาใหม่ไม่ต้องรัน SQL อีก)
-- ============================================================
-- ประจำที่ของพนักงาน: ALL หรือรหัสสาขา (ตัวพิมพ์ใหญ่/ตัวเลข 2–10 ตัว ขึ้นต้นด้วยตัวอักษร)
alter table public.pnl_users drop constraint if exists pnl_users_unit_ck;
alter table public.pnl_users add  constraint pnl_users_unit_ck
  check (unit = 'ALL' or unit ~ '^[A-Z][A-Z0-9]{1,9}$');

-- วันขายดี (📦 ปฏิทิน): เลือกสาขาไหนก็ได้ที่เป็นรหัสสาขา
do $$ begin
  if to_regclass('public.cal_special_days') is not null then
    alter table public.cal_special_days drop constraint if exists cal_sd_br;
    alter table public.cal_special_days add  constraint cal_sd_br check (order_branches is null or
      (cardinality(order_branches) between 1 and 30
       and array_to_string(order_branches, ',') ~ '^[A-Z][A-Z0-9]{1,9}(,[A-Z][A-Z0-9]{1,9})*$'));
  end if;
end $$;

-- ============================================================
-- 4) ปุ่มเปิดสาขา (jj_branch_open) + ยกเลิกสาขาที่เปิดผิด (jj_branch_undo)
-- ============================================================
-- ตัวช่วยภายใน (ไม่เปิดให้แอพเรียกตรง): เพิ่ม 1 แถวเฉพาะช่องที่มีจริงในตาราง
create or replace function public.jj__ins(p_tbl text, p_row jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cols text; vals text;
begin
  select string_agg(quote_ident(a.attname), ',' order by a.attnum),
         string_agg(format('($1->>%L)::%s', a.attname, format_type(a.atttypid, a.atttypmod)), ',' order by a.attnum)
    into cols, vals
    from pg_attribute a
   where a.attrelid = ('public.' || quote_ident(p_tbl))::regclass and a.attnum > 0 and not a.attisdropped
     and p_row ? a.attname;
  if cols is null then raise exception 'jj__ins: ไม่มีช่องที่ตรงกับตาราง %', p_tbl; end if;
  execute format('insert into public.%I (%s) values (%s)', p_tbl, cols, vals) using p_row;
end $$;

-- ตัวช่วยภายใน: คัดลอกแถว (ทุกช่อง) จากเงื่อนไข p_where · p_set = ค่าตายตัวที่ทับ · p_expr = นิพจน์ SQL ที่ทับ (อ้างแถวต้นทางด้วย t)
-- id ของตารางที่มีค่าอัตโนมัติ (identity/serial) ปล่อยให้ฐานข้อมูลออกเอง
create or replace function public.jj__copy(p_tbl text, p_where text, p_set jsonb, p_expr jsonb default '{}'::jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare cols text; vals text; n int;
begin
  select string_agg(quote_ident(a.attname), ',' order by a.attnum),
         string_agg(case when p_expr ? a.attname then '(' || (p_expr->>a.attname) || ')::' || format_type(a.atttypid, a.atttypmod)
                         when p_set  ? a.attname then format('($1->>%L)::%s', a.attname, format_type(a.atttypid, a.atttypmod))
                         else 't.' || quote_ident(a.attname) end, ',' order by a.attnum)
    into cols, vals
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where a.attrelid = ('public.' || quote_ident(p_tbl))::regclass and a.attnum > 0 and not a.attisdropped
     and not (a.attname = 'id' and (a.attidentity <> '' or d.adbin is not null) and not (p_expr ? 'id') and not (p_set ? 'id'));
  execute format('insert into public.%I (%s) select %s from public.%I t where %s', p_tbl, cols, vals, p_tbl, p_where) using p_set;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.jj__ins(text, jsonb)                from public, anon, authenticated;
revoke all on function public.jj__copy(text, text, jsonb, jsonb)  from public, anon, authenticated;

-- ตรวจว่าเป็นผู้ดูแลระบบ/เจ้าของจริง (u + แฮชรหัสผ่าน แบบเดียวกับ social-brain bossCheck)
create or replace function public.jj__boss(p_u text, p_h text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pnl_users
                  where username = p_u and pass_hash = p_h and coalesce(p_h, '') <> ''
                    and role in ('admin', 'owner') and active is not false);
$$;
revoke all on function public.jj__boss(text, text) from public, anon, authenticated;

-- เปิดสาขาใหม่ — แอพ JJ Access เรียก (เฉพาะผู้ดูแลระบบ/เจ้าของ)
-- p = {u, h, code, name, short, color, src, products:[id…] | null(=ทุกตัว), copy_rates, copy_maint, copy_fixed, copy_supply,
--      inv_start, tax_branch, addr, opened_on}
-- ขั้นหลัก (ทะเบียนสาขา) พลาด = ไม่เกิดอะไรเลย · ขั้นอื่นพลาด = ข้ามขั้นนั้น บอกเหตุผลใน steps (กดเปิดซ้ำทำต่อได้)
create or replace function public.jj_branch_open(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code  text := upper(btrim(coalesce(p->>'code', '')));
  v_name  text := btrim(coalesce(p->>'name', ''));
  v_short text := nullif(btrim(coalesce(p->>'short', '')), '');
  v_src   text := upper(btrim(coalesce(p->>'src', '')));
  v_color text := nullif(btrim(coalesce(p->>'color', '')), '');
  v_tax   text := nullif(btrim(coalesce(p->>'tax_branch', '')), '');
  v_addr  text := nullif(btrim(coalesce(p->>'addr', '')), '');
  v_open  date;
  v_start int  := coalesce(nullif(p->>'inv_start', '')::int, 1);
  v_ids   text[];
  v_srcstk text; v_stk text; v_sort int; v_new boolean := false;
  v_steps jsonb := '{}'::jsonb; n int; x text;
begin
  if not jj__boss(p->>'u', p->>'h') then
    return jsonb_build_object('ok', false, 'reason', 'เฉพาะผู้ดูแลระบบ/เจ้าของ — ออกจากระบบแล้วล็อกอินใหม่');
  end if;
  if v_code !~ '^[A-Z]{2,8}$' then
    return jsonb_build_object('ok', false, 'reason', 'รหัสสาขาใช้ตัวอักษรอังกฤษพิมพ์ใหญ่ล้วน 2–8 ตัว เช่น JJBN (ใช้เป็นตัวหน้าเลขใบกำกับภาษีด้วย)');
  end if;
  if v_code in ('ALL','OFFICE','JJOF','JJCK','STORE','NONE') then
    return jsonb_build_object('ok', false, 'reason', 'รหัส ' || v_code || ' ใช้กับส่วนอื่นของระบบอยู่แล้ว เลือกรหัสอื่น');
  end if;
  if length(v_name) < 2 or length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'ชื่อสาขายาว 2–40 ตัวอักษร');
  end if;
  if v_color is not null and v_color !~ '^#[0-9A-Fa-f]{6}$' then v_color := null; end if;
  if v_tax is not null and v_tax !~ '^[0-9]{5}$' then
    return jsonb_build_object('ok', false, 'reason', 'เลขที่สาขาภาษีต้องเป็นตัวเลข 5 หลัก เช่น 00001 (สำนักงานใหญ่ = เว้นว่าง)');
  end if;
  begin v_open := nullif(p->>'opened_on', '')::date; exception when others then v_open := null; end;
  if v_start < 1 or v_start > 999999 then v_start := 1; end if;

  -- รหัสชนกับของเดิม (รวมเลขบิลใบกำกับภาษีที่ใช้ตัวอักษรหน้าเลขแยกสาขา: JJR ↔ JJRD ห้ามอยู่คู่กัน)
  select code into x from pnl_branches
   where upper(code) <> v_code and (upper(code) like v_code || '%' or v_code like upper(code) || '%') limit 1;
  if x is not null then
    return jsonb_build_object('ok', false, 'reason', 'รหัส ' || v_code || ' ขึ้นต้นเหมือนสาขา ' || x || ' — เลขใบกำกับภาษีจะปนกัน เลือกรหัสอื่น');
  end if;
  if to_regclass('public.inv_counters') is not null then
    execute 'select prefix from inv_counters where upper(prefix) <> $1 and (upper(prefix) like $1 || ''%'' or $1 like upper(prefix) || ''%'') limit 1'
      into x using v_code;
    if x is not null then
      return jsonb_build_object('ok', false, 'reason', 'รหัส ' || v_code || ' ขึ้นต้นเหมือนเลขใบกำกับภาษี ' || x || ' — เลือกรหัสอื่น');
    end if;
  end if;
  if exists (select 1 from pnl_branches where upper(code) <> v_code and (name = v_name or short = coalesce(v_short, v_name))) then
    return jsonb_build_object('ok', false, 'reason', 'ชื่อ "' || v_name || '" ซ้ำกับสาขาที่มีอยู่');
  end if;

  -- สาขาต้นแบบ (คัดลอกรายการสินค้า/งาน/อุปกรณ์/Fix cost)
  if v_src <> '' then
    select coalesce(stk_id, case code when 'JJRD' then 'b19f0a17b4472' when 'JJLP' then 'b19f0a17b448212' end)
      into v_srcstk from pnl_branches where code = v_src and coalesce(kind, 'store') = 'store';
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'ไม่พบสาขาต้นแบบ ' || v_src);
    end if;
  end if;

  -- ① ทะเบียนสาขากลาง (ขั้นหลัก)
  if exists (select 1 from pnl_branches where code = v_code) then
    if exists (select 1 from pnl_branches where code = v_code and coalesce(kind, 'store') <> 'store') then
      return jsonb_build_object('ok', false, 'reason', 'รหัส ' || v_code || ' เป็นหน่วยงานที่ไม่ใช่หน้าร้าน');
    end if;
    update pnl_branches set active = true where code = v_code;     -- กดซ้ำ = ทำขั้นที่เหลือต่อ
    v_steps := v_steps || jsonb_build_object('registry', 'มีอยู่แล้ว');
  else
    select coalesce(max(sort), 0) + 1 into v_sort from pnl_branches where coalesce(kind, 'store') = 'store';
    insert into pnl_branches (code, name, short, sort, is_central, kind, color, active, opened_on, tax_branch, addr)
    values (v_code, v_name, v_short, v_sort, false, 'store', v_color, true, v_open, v_tax, v_addr);
    v_new := true;
    v_steps := v_steps || jsonb_build_object('registry', 'ok');
  end if;

  -- ② ระบบนับสต๊อก/ซ่อมบำรุง: แถวใน branches (id = รหัสสาขา)
  begin
    if to_regclass('public.branches') is null then
      v_steps := v_steps || jsonb_build_object('stock', 'ข้าม — ไม่มีตาราง branches');
    else
      select stk_id into v_stk from pnl_branches where code = v_code;
      if v_stk is null or not exists (select 1 from branches where id = v_stk) then
        select id into v_stk from branches where code = v_code limit 1;
      end if;
      if v_stk is null then
        v_stk := v_code;
        begin
          execute 'select coalesce(max(sort), 0) + 1 from public.branches' into v_sort;
        exception when others then v_sort := null; end;
        perform jj__ins('branches', jsonb_build_object('id', v_stk, 'name', v_name, 'code', v_code, 'sort', v_sort));
      end if;
      update pnl_branches set stk_id = v_stk where code = v_code;
      v_steps := v_steps || jsonb_build_object('stock', 'ok');
    end if;
  exception when others then
    v_stk := null;
    v_steps := v_steps || jsonb_build_object('stock', 'ผิดพลาด: ' || sqlerrm);
  end;

  -- ③ สินค้าที่เลือก (คัดลอกจากสาขาต้นแบบ · ชื่อซ้ำในสาขาใหม่ = ข้าม)
  --    products = [id…] เฉพาะที่ติ๊ก · ไม่ส่ง/null = ทุกตัวของสาขาต้นแบบ · [] = ไม่คัดลอกสินค้า
  if jsonb_typeof(p->'products') = 'array' then
    select coalesce(array_agg(e), '{}'::text[]) into v_ids from jsonb_array_elements_text(p->'products') e;
  end if;
  if v_stk is not null and v_srcstk is not null and to_regclass('public.products') is not null
     and (v_ids is null or cardinality(v_ids) > 0) then
    begin
      n := jj__copy('products',
        format('t.branch_id = %L and t.deleted_at is null and (%L::text[] is null or t.id::text = any(%L::text[]))
                and not exists (select 1 from products z where z.branch_id = %L and z.name = t.name and z.deleted_at is null)',
               v_srcstk, v_ids, v_ids, v_stk),
        jsonb_build_object('branch_id', v_stk)
          || case when coalesce((p->>'copy_rates')::boolean, false) then '{}'::jsonb
                  else jsonb_build_object('rate_wk', null, 'rate_fri', null, 'rate_we', null, 'safety', null, 'max', null) end,
        case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products'
                            and column_name = 'id' and data_type in ('text', 'character varying'))
             then jsonb_build_object('id', format('''it'' || substr(md5(%L || '':'' || t.id::text), 1, 14)', v_code))
             else '{}'::jsonb end);
      v_steps := v_steps || jsonb_build_object('products', n);
    exception when others then
      v_steps := v_steps || jsonb_build_object('products', 'ผิดพลาด: ' || sqlerrm);
    end;
    -- แผนก/โซนของสาขาต้นแบบ
    if to_regclass('public.sc_depts') is not null then
      begin
        n := jj__copy('sc_depts', format('t.branch_id = %L and not exists (select 1 from sc_depts z where z.branch_id = %L and z.name = t.name)', v_srcstk, v_stk),
                      jsonb_build_object('branch_id', v_stk),
                      case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sc_depts'
                                          and column_name = 'id' and data_type in ('text', 'character varying'))
                           then jsonb_build_object('id', format('''dp'' || substr(md5(%L || '':'' || t.id::text), 1, 14)', v_code))
                           else '{}'::jsonb end);
        v_steps := v_steps || jsonb_build_object('depts', n);
      exception when others then v_steps := v_steps || jsonb_build_object('depts', 'ผิดพลาด: ' || sqlerrm); end;
    end if;
    -- ชื่อตามบิลใน P&L ที่ผูกกับสินค้า (จับคู่สินค้าใหม่ด้วยชื่อ+หน่วยเดียวกัน — สูตรเดียวกับ stkCopyFromOther ของ P&L)
    if to_regclass('public.pnl_stock_map') is not null then
      begin
        create temp table if not exists jj_pmap (old_id text, new_id text) on commit drop;
        delete from jj_pmap;
        insert into jj_pmap
        select o.id::text, (select n.id::text from products n
                             where n.branch_id = v_stk and n.deleted_at is null and n.name = o.name
                               and coalesce(n.unit, '') = coalesce(o.unit, '') limit 1)
          from products o
         where o.branch_id = v_srcstk and o.deleted_at is null and (v_ids is null or o.id::text = any(v_ids));
        delete from jj_pmap where new_id is null;
        n := jj__copy('pnl_stock_map',
          format('t.branch = %L and t.product_id in (select old_id from jj_pmap)
                  and not exists (select 1 from pnl_stock_map z where z.branch = %L and z.pnl_item is not distinct from t.pnl_item
                                    and z.product_id = (select new_id from jj_pmap m where m.old_id = t.product_id))',
                 v_src, v_code),
          jsonb_build_object('branch', v_code),
          jsonb_build_object('product_id', '(select new_id from jj_pmap m where m.old_id = t.product_id)'));
        v_steps := v_steps || jsonb_build_object('stock_map', n);
      exception when others then v_steps := v_steps || jsonb_build_object('stock_map', 'ผิดพลาด: ' || sqlerrm); end;
    end if;
  elsif v_stk is not null then
    v_steps := v_steps || jsonb_build_object('products', case when v_srcstk is null then 'ไม่มีสาขาต้นแบบ — เพิ่มสินค้าเองในระบบนับสต๊อก' else 'ไม่ได้เลือกสินค้า' end);
  end if;

  -- ④ ซ่อมบำรุง: งานประจำ + อุปกรณ์ที่ต้องนับ จากสาขาต้นแบบ
  if coalesce((p->>'copy_maint')::boolean, true) and v_stk is not null and v_srcstk is not null then
    if to_regclass('public.maint_tasks') is not null then
      begin
        n := jj__copy('maint_tasks', format('t.branch_id = %L and t.deleted_at is null and not exists (select 1 from maint_tasks z where z.branch_id = %L and z.name = t.name and z.deleted_at is null)', v_srcstk, v_stk),
                      jsonb_build_object('branch_id', v_stk, 'created_at', now()),
                      jsonb_build_object('id', format('''mt-'' || %L || ''-'' || substr(md5(t.id), 1, 10)', v_stk)));
        v_steps := v_steps || jsonb_build_object('maint_tasks', n);
      exception when others then v_steps := v_steps || jsonb_build_object('maint_tasks', 'ผิดพลาด: ' || sqlerrm); end;
    end if;
    if to_regclass('public.maint_assets') is not null then
      begin
        n := jj__copy('maint_assets', format('t.branch_id = %L and t.deleted_at is null and not exists (select 1 from maint_assets z where z.branch_id = %L and z.name = t.name and z.deleted_at is null)', v_srcstk, v_stk),
                      jsonb_build_object('branch_id', v_stk, 'created_at', now()),
                      jsonb_build_object('id', format('''ma-'' || %L || ''-'' || substr(md5(t.id), 1, 10)', v_stk)));
        v_steps := v_steps || jsonb_build_object('maint_assets', n);
      exception when others then v_steps := v_steps || jsonb_build_object('maint_assets', 'ผิดพลาด: ' || sqlerrm); end;
    end if;
  end if;

  -- ⑤ P&L: รายการ Fix cost (ชื่อ/หมวด ไม่คัดลอกยอดเงิน — ค่าเช่า/เงินเดือนของแต่ละสาขาต่างกัน) + ของใช้/อุปกรณ์
  if coalesce((p->>'copy_fixed')::boolean, true) and v_src <> '' and to_regclass('public.pnl_fixed_items') is not null then
    begin
      n := jj__copy('pnl_fixed_items', format('t.branch = %L and not exists (select 1 from pnl_fixed_items z where z.branch = %L and z.name = t.name)', v_src, v_code),
                    jsonb_build_object('branch', v_code, 'default_amount', null));
      v_steps := v_steps || jsonb_build_object('fixed', n);
    exception when others then v_steps := v_steps || jsonb_build_object('fixed', 'ผิดพลาด: ' || sqlerrm); end;
  end if;
  if coalesce((p->>'copy_supply')::boolean, true) and v_src <> '' and to_regclass('public.pnl_supply_items') is not null then
    begin
      n := jj__copy('pnl_supply_items', format('t.branch = %L and t.deleted_at is null and not exists (select 1 from pnl_supply_items z where z.branch = %L and z.name = t.name)', v_src, v_code),
                    jsonb_build_object('branch', v_code));
      v_steps := v_steps || jsonb_build_object('supply', n);
    exception when others then v_steps := v_steps || jsonb_build_object('supply', 'ผิดพลาด: ' || sqlerrm); end;
  end if;

  -- ⑥ ใบกำกับภาษี: ตัวนับเลขบิล (ใบแรก = inv_start · มีอยู่แล้ว = ไม่แตะ)
  if to_regclass('public.inv_counters') is not null then
    begin
      execute 'insert into inv_counters (prefix, last_no) values ($1, $2) on conflict (prefix) do nothing' using v_code, v_start - 1;
      v_steps := v_steps || jsonb_build_object('invoice', 'ok');
    exception when others then v_steps := v_steps || jsonb_build_object('invoice', 'ผิดพลาด: ' || sqlerrm); end;
  end if;

  -- ⑦ ประวัติ (JJ Access → 📜)
  begin
    perform jj__ins('pnl_access_log', jsonb_build_object('actor', p->>'u', 'target_user', v_code,
      'action', case when v_new then 'เปิดสาขาใหม่' else 'เปิดสาขา (ทำต่อ)' end,
      'detail', v_name || ' (' || v_code || ')' || case when v_src <> '' then ' · ต้นแบบ ' || v_src else '' end || ' · ' || v_steps::text));
  exception when others then null; end;

  return jsonb_build_object('ok', true, 'code', v_code, 'stk_id', v_stk, 'new', v_new, 'steps', v_steps);
end $$;
grant execute on function public.jj_branch_open(jsonb) to anon, authenticated;

-- ยกเลิกสาขาที่เพิ่งเปิดผิด — ได้เฉพาะตอนยังไม่มีข้อมูลจริงของสาขานั้นเลย (ยอดขาย/บิล/ใบกำกับ/นับสต๊อก/สแกน/คะแนน/งานซ่อม)
create or replace function public.jj_branch_undo(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(btrim(coalesce(p->>'code', '')));
  v_stk  text; v_used text := ''; t text; c text; q text; n int;
  checks text[][] := array[
    ['pnl_income_daily','branch','ยอดขาย P&L'], ['pnl_expense_daily','branch','บิลรายจ่าย P&L'], ['pnl_cash_expenses','branch','เงินสดจ่าย'],
    ['pnl_pv','branch','ใบสำคัญจ่าย'], ['inv_invoices','branch_prefix','ใบกำกับภาษี'], ['kpi_responses','branch','คะแนนลูกค้า'],
    ['employees','branch','พนักงานในระบบเงินเดือน'], ['devices','branch','เครื่องสแกน'], ['ck_orders','branch','ออเดอร์ครัวกลาง'],
    ['social_mentions','branch','รีวิว/คอมเมนต์'], ['cal_events','branch','นัดในปฏิทิน'], ['qr_sessions','branch','โต๊ะสั่งอาหาร']];
  i int;
begin
  if not jj__boss(p->>'u', p->>'h') then
    return jsonb_build_object('ok', false, 'reason', 'เฉพาะผู้ดูแลระบบ/เจ้าของ');
  end if;
  if not exists (select 1 from pnl_branches where code = v_code and coalesce(kind, 'store') = 'store') then
    return jsonb_build_object('ok', false, 'reason', 'ไม่พบสาขา ' || v_code);
  end if;
  select stk_id into v_stk from pnl_branches where code = v_code;
  for i in 1 .. array_length(checks, 1) loop
    t := checks[i][1]; c := checks[i][2];
    if to_regclass('public.' || t) is not null then
      begin
        execute format('select count(*) from (select 1 from public.%I where %I = $1 limit 1) s', t, c) into n using v_code;
        if n > 0 then v_used := v_used || ' · ' || checks[i][3]; end if;
      exception when others then null; end;
    end if;
  end loop;
  if v_stk is not null then
    if to_regclass('public.stock_counts') is not null and exists (select 1 from stock_counts where branch_id = v_stk) then v_used := v_used || ' · นับสต๊อก'; end if;
    if to_regclass('public.maint_logs') is not null and exists (select 1 from maint_logs where branch_id = v_stk) then v_used := v_used || ' · บันทึกงานซ่อม'; end if;
  end if;
  if v_used <> '' then
    return jsonb_build_object('ok', false, 'reason', 'สาขา ' || v_code || ' มีข้อมูลจริงแล้ว ยกเลิกไม่ได้ (กันข้อมูลหาย):' || v_used);
  end if;

  if v_stk is not null then
    if to_regclass('public.pnl_stock_map') is not null then delete from pnl_stock_map where branch = v_code; end if;
    if to_regclass('public.stock_current') is not null then delete from stock_current where branch_id = v_stk; end if;
    if to_regclass('public.stock_receipts') is not null then delete from stock_receipts where branch_id = v_stk; end if;
    if to_regclass('public.products') is not null then delete from products where branch_id = v_stk; end if;
    if to_regclass('public.sc_depts') is not null then delete from sc_depts where branch_id = v_stk; end if;
    if to_regclass('public.maint_tasks') is not null then delete from maint_tasks where branch_id = v_stk; end if;
    if to_regclass('public.maint_counts') is not null then delete from maint_counts where branch_id = v_stk; end if;
    if to_regclass('public.maint_assets') is not null then delete from maint_assets where branch_id = v_stk; end if;
    if to_regclass('public.branches') is not null then delete from branches where id = v_stk and (code = v_code or id = v_code); end if;
  end if;
  if to_regclass('public.pnl_fixed_items') is not null then delete from pnl_fixed_items where branch = v_code; end if;
  if to_regclass('public.pnl_supply_items') is not null then delete from pnl_supply_items where branch = v_code; end if;
  if to_regclass('public.inv_counters') is not null then delete from inv_counters where prefix = v_code; end if;
  delete from pnl_branches where code = v_code;
  begin
    perform jj__ins('pnl_access_log', jsonb_build_object('actor', p->>'u', 'target_user', v_code, 'action', 'ยกเลิกสาขาที่เปิดผิด', 'detail', v_code));
  exception when others then null; end;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;
grant execute on function public.jj_branch_undo(jsonb) to anon, authenticated;
-- ============================================================
-- 5) KPI — ทำเฉพาะเมื่อระบบ KPI ติดตั้งแล้ว (ไม่มีตาราง = ข้าม ไม่ error)
--    · สรุปไลน์: ชื่อสาขาใหม่อ่านจากทะเบียน (สาขาเดิมชื่อเดิมทุกตัวอักษร)
--    · กลุ่มไลน์ที่เพิ่งตั้งให้สาขาใหม่ (line_cfg.since_br) ไม่ย้อนส่งสรุปวันเก่า
--    · ซิงก์พนักงาน: รวมสาขาหน้าร้านจากทะเบียนเสมอ กันแท็บเล็ตรุ่นเก่าปิดพนักงานสาขาใหม่
-- ============================================================
do $g$ begin
  if to_regclass('public.kpi_responses') is not null then
    execute $f1$
create or replace function public.kpi_line_text(p_branch text, p_from date, p_to date)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  c_target  constant numeric := 4.5;   -- ต้องตรงกับ CONFIG.TARGET ในแอป
  c_url     constant text    := 'https://thananant.github.io/JJ-PnL/jjmk-kpi.html';
  c_max     constant int     := 30;    -- รายชื่อพนักงานยาวสุดกี่บรรทัด (กันข้อความยาวเกินของ LINE)
  v_bname   text;
  v_head    text;
  v_n       int;      -- จำนวนครั้งที่ลูกค้ากด
  v_days    int;      -- จำนวนวันที่มีข้อมูลในช่วง
  v_tot     int;      -- จำนวนคะแนนทั้งหมด (ทุกแผนกรวมกัน)
  v_avg     numeric;
  v_pos     int;      -- คะแนน 4–5
  v_neg     int;      -- คะแนน 1–2
  v_praise  int;      -- จำนวนครั้งที่ลูกค้าเลือกชมพนักงาน
  v_more    int;
  v_txt     text;
  r         record;
  i         int := 0;
begin
  -- ชื่อสาขา — ต้องตรงกับ CONFIG.BRANCHES ในแอป
  -- สาขาเดิมใช้ชื่อเดิม · สาขาใหม่อ่านจากทะเบียนสาขากลาง (pnl_branches) — เปิดสาขาใหม่ไม่ต้องแก้ SQL
  v_bname := case p_branch when 'JJRD' then 'รัชดา' when 'JJLP' then 'ลาดพร้าว-วังหิน'
               else coalesce((select coalesce(nullif(btrim(b.short), ''), nullif(regexp_replace(btrim(b.name), '^สาขา\s*', ''), ''))
                                from pnl_branches b where b.code = p_branch limit 1), p_branch) end;

  v_head := '📊 สรุปความพึงพอใจลูกค้า · ' || p_branch || ' ' || v_bname || chr(10)
         || case when p_from = p_to then kpi_th_date(p_from, true)
                 else 'รอบ ' || extract(day from p_from)::int || '–' || kpi_th_date(p_to) end;

  select count(*)::int, count(distinct biz_date)::int
    into v_n, v_days
    from kpi_responses
   where branch = p_branch and biz_date between p_from and p_to;

  if coalesce(v_n, 0) = 0 then
    return v_head || chr(10) || chr(10)
      || 'ไม่มีลูกค้ากดให้คะแนนเลยในช่วงนี้' || chr(10)
      || 'ลองเช็กว่าแท็บเล็ตหน้าร้านเปิดอยู่ ต่อเน็ตได้ และอยู่หน้าให้ลูกค้ากด' || chr(10) || chr(10)
      || c_url;
  end if;

  select count(*)::int,
         round(avg(s.score)::numeric, 2),
         count(*) filter (where s.score >= 4)::int,
         count(*) filter (where s.score <= 2)::int
    into v_tot, v_avg, v_pos, v_neg
    from kpi_scores s
    join kpi_responses r2 on r2.id = s.response_id
   where r2.branch = p_branch and r2.biz_date between p_from and p_to;

  v_txt := v_head || chr(10) || chr(10)
    || '⭐ คะแนนเฉลี่ย ' || coalesce(to_char(v_avg, 'FM9.00'), '—') || ' / 5'
    || case when v_avg is null then '' when v_avg >= c_target then ' ✅' when v_avg >= c_target - 0.5 then ' ⚠️' else ' 🔴' end
    || ' (เป้า ' || to_char(c_target, 'FM9.00') || ')' || chr(10)
    || '🙋 ลูกค้ากดให้คะแนน ' || v_n || ' ครั้ง'
    || case when p_from <> p_to then ' · ' || v_days || ' วัน (เฉลี่ยวันละ ' || to_char(v_n::numeric / greatest(v_days, 1), 'FM9.0') || ')' else '' end
    || case when v_tot > 0 then chr(10) || '😊 พอใจ–ประทับใจ (4–5) ' || round(v_pos * 100.0 / v_tot)::int || '%' else '' end
    || case when v_neg > 0 then chr(10) || '😠 ไม่พอใจ (1–2) ' || v_neg || ' คะแนน — ควรดูด่วน' else '' end;

  -- แยกตามหัวข้อ (แผนก)
  v_txt := v_txt || chr(10) || chr(10) || 'แยกตามหัวข้อ';
  for r in
    select d.icon, d.name, count(*)::int as n, round(avg(s.score)::numeric, 2) as avg_score
      from kpi_scores s
      join kpi_responses r2 on r2.id = s.response_id
      join kpi_departments d on d.id = s.department_id
     where r2.branch = p_branch and r2.biz_date between p_from and p_to
     group by d.id, d.icon, d.name, d.sort_order
     order by d.sort_order, d.id
  loop
    v_txt := v_txt || chr(10) || r.icon || ' ' || r.name || ' ' || to_char(r.avg_score, 'FM9.00') || ' (' || r.n || ' คะแนน)';
  end loop;

  -- ชมพนักงานรายคน — ใครไม่ได้ชมเลย ไม่ขึ้นในรายการ (เจ้าของสั่ง)
  select count(*)::int into v_praise
    from kpi_responses
   where branch = p_branch and biz_date between p_from and p_to and staff_id is not null;

  v_txt := v_txt || chr(10) || chr(10) || '💖 ลูกค้าชมพนักงาน ' || v_praise || ' ครั้ง';
  if v_praise = 0 then
    v_txt := v_txt || chr(10) || '(ยังไม่มีใครถูกชมในช่วงนี้)';
  else
    for r in
      select coalesce(nullif(btrim(st.nickname), ''), nullif(btrim(st.name), ''), 'ไม่ทราบชื่อ') as nm,
             count(*)::int as votes
        from kpi_responses r2
        left join kpi_staff st on st.id = r2.staff_id
       where r2.branch = p_branch and r2.biz_date between p_from and p_to and r2.staff_id is not null
       group by st.id, 1
       order by 2 desc, 1
    loop
      i := i + 1;
      exit when i > c_max;
      v_txt := v_txt || chr(10)
        || case i when 1 then '🥇' when 2 then '🥈' when 3 then '🥉' else '•' end
        || ' ' || r.nm || ' ' || r.votes || ' ครั้ง';
    end loop;
    if i > c_max then
      select count(*)::int into v_more
        from (select st.id
                from kpi_responses r2
                left join kpi_staff st on st.id = r2.staff_id
               where r2.branch = p_branch and r2.biz_date between p_from and p_to and r2.staff_id is not null
               group by st.id) q;
      v_txt := v_txt || chr(10) || '…และอีก ' || greatest(v_more - c_max, 0) || ' คน (ดูครบในแอป)';
    end if;
  end if;

  return v_txt || chr(10) || chr(10) || 'ดูรายละเอียด ' || c_url;
end
$$;
$f1$;
  end if;
end $g$;
do $g$ begin
  if to_regclass('public.kpi_line_log') is not null and to_regclass('public.kpi_settings') is not null then
    execute $f2$
create or replace function public.kpi_line_due(p_now timestamptz default now())
returns table (kind text, branch text, group_id text, period_key text, d_from date, d_to date, due_at timestamptz)
language sql
stable
set search_path = public
as $$
  with cfg as (
    select coalesce((select value from kpi_settings where key = 'line_cfg'), '{}'::jsonb) as v
  ), s as (
    select coalesce((v->>'daily')::boolean, true)                     as daily_on,
           coalesce((v->>'period')::boolean, true)                    as period_on,
           coalesce(nullif(v->>'daily_at', '')::time, time '09:00')   as daily_at,
           coalesce(nullif(v->>'period_at', '')::time, time '09:10')  as period_at,
           coalesce(nullif(v->>'since', '')::timestamptz, p_now - interval '20 hours') as since,
           coalesce(v->'groups', '{}'::jsonb)                         as groups,
           coalesce(v->'since_br', '{}'::jsonb)                       as since_br
      from cfg
  ), br as (
    select g.key as branch, btrim(g.value) as group_id
      from s, jsonb_each_text(s.groups) g
     where btrim(coalesce(g.value, '')) <> ''
  ), dt as (
    select d::date as d
      from generate_series((p_now at time zone 'Asia/Bangkok')::date - 3,
                           (p_now at time zone 'Asia/Bangkok')::date,
                           interval '1 day') d
  ), cand as (
    select 'daily'::text as kind, (dt.d - 1) as d_from, (dt.d - 1) as d_to,
           ((dt.d + s.daily_at) at time zone 'Asia/Bangkok') as due_at
      from dt, s where s.daily_on
    union all
    select 'period'::text, date_trunc('month', dt.d)::date, date_trunc('month', dt.d)::date + 14,
           ((dt.d + s.period_at) at time zone 'Asia/Bangkok')
      from dt, s where s.period_on and extract(day from dt.d) = 16
    union all
    select 'period'::text, (date_trunc('month', dt.d) - interval '1 month')::date + 15, date_trunc('month', dt.d)::date - 1,
           ((dt.d + s.period_at) at time zone 'Asia/Bangkok')
      from dt, s where s.period_on and extract(day from dt.d) = 1
  ), k as (
    select c.*, case when c.kind = 'daily' then 'D' || to_char(c.d_to, 'YYYY-MM-DD')
                     else 'P' || to_char(c.d_from, 'YYYY-MM-DD') || '_' || to_char(c.d_to, 'YYYY-MM-DD') end as period_key
      from cand c
  )
  select k.kind, br.branch, br.group_id, k.period_key, k.d_from, k.d_to, k.due_at
    from k cross join br cross join s
   where k.due_at <= p_now
     and k.due_at >= greatest(s.since, coalesce(nullif(s.since_br->>br.branch, '')::timestamptz, s.since))  -- กลุ่มที่เพิ่งตั้ง (สาขาใหม่) ไม่ย้อนส่งของเก่า
     and not exists (
       select 1 from kpi_line_log l
        where l.kind = k.kind and l.branch = br.branch and l.period_key = k.period_key
          and (l.ok is not false or l.tries >= 3))
   order by k.due_at, br.branch, k.kind;
$$;
$f2$;
  end if;
end $g$;
do $g$ begin
  if to_regclass('public.kpi_staff') is not null and to_regclass('public.employees') is not null then
    execute $f3$
create or replace function public.kpi_sync_staff(p_branches text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_linked  int;
  n_added   int;
  n_updated int;
  n_hidden  int;
begin
  -- 0) รวมสาขาหน้าร้านจากทะเบียนสาขากลางเสมอ — แท็บเล็ต/แอปรุ่นเก่าที่ยังไม่รู้จักสาขาใหม่ จะได้ไม่ไปปิดพนักงานสาขาใหม่
  --    (เพิ่มได้อย่างเดียว ไม่ตัดสาขาที่แอปส่งมา)
  begin
    p_branches := array(select distinct x from unnest(coalesce(p_branches, '{}'::text[])
                     || array(select code from pnl_branches where kind = 'store' and active is not false)) x where x is not null);
  exception when others then null;
  end;

  -- 1) ผูกแถวที่เคยกรอกมือเข้ากับพนักงาน payroll (ชื่อ/ชื่อเล่นตรงกัน สาขาเดียวกัน) กันได้แถวซ้ำ
  update kpi_staff k
     set employee_id = m.emp_id
    from (
      select distinct on (e.id) e.id as emp_id, k2.id as row_id
        from employees e
        join kpi_staff k2
          on k2.employee_id is null
         and k2.branch = e.branch
         and (k2.name = e.full_name or k2.name = e.nick or k2.nickname = e.nick)
       where e.active
         and e.branch = any(p_branches)
         and not exists (select 1 from kpi_staff kx where kx.employee_id = e.id)
       order by e.id, k2.id
    ) m
   where k.id = m.row_id
     and k.employee_id is null;
  get diagnostics n_linked = row_count;

  -- 2) เพิ่มพนักงานที่ยังไม่มีในรายชื่อ
  insert into kpi_staff (branch, name, nickname, position, sort_order, active, employee_id)
  select e.branch,
         coalesce(nullif(e.full_name, ''), e.nick),
         nullif(e.nick, ''),
         nullif(e.position, ''),
         0, true, e.id
    from employees e
   where e.active
     and e.branch = any(p_branches)
     and coalesce(nullif(e.full_name, ''), nullif(e.nick, '')) is not null
     and not exists (select 1 from kpi_staff k where k.employee_id = e.id)
  on conflict (employee_id) where employee_id is not null do nothing;  -- กัน kiosk หลายเครื่องซิงก์พร้อมกัน
  get diagnostics n_added = row_count;

  -- 3) อัพเดตชื่อ/ชื่อเล่น/ตำแหน่ง/สาขาตาม payroll (เฉพาะแถวที่ค่าเปลี่ยนจริง)
  update kpi_staff k
     set branch   = e.branch,
         name     = coalesce(nullif(e.full_name, ''), e.nick),
         nickname = nullif(e.nick, ''),
         position = nullif(e.position, '')
    from employees e
   where k.employee_id = e.id
     and e.active
     and e.branch = any(p_branches)
     and coalesce(nullif(e.full_name, ''), nullif(e.nick, '')) is not null
     and (k.branch   is distinct from e.branch
       or k.name     is distinct from coalesce(nullif(e.full_name, ''), e.nick)
       or k.nickname is distinct from nullif(e.nick, '')
       or k.position is distinct from nullif(e.position, ''));
  get diagnostics n_updated = row_count;

  -- 4) พ้นสภาพ / ย้ายออกนอกสาขา kiosk → ปิดใช้ (ไม่ลบ เพราะ kpi_responses อ้างถึง)
  update kpi_staff k
     set active = false
   where k.employee_id is not null
     and k.active
     and not exists (
       select 1
         from employees e
        where e.id = k.employee_id
          and e.active
          and e.branch = any(p_branches));
  get diagnostics n_hidden = row_count;

  return jsonb_build_object('linked', n_linked, 'added', n_added,
                            'updated', n_updated, 'hidden', n_hidden);
end
$$;
$f3$;
  end if;
end $g$;
notify pgrst, 'reload schema';
