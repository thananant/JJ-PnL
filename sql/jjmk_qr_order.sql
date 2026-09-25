-- ============================================================
-- JJ สั่งอาหารผ่าน QR (25 ก.ย. 2569) — รันซ้ำได้
--   ฝั่งพนักงาน jjmk-order.html : สร้าง QR รายโต๊ะ (เลือกแพ็กเกจ · จับเวลา 110 นาที) · รับออเดอร์ · จัดการเมนู
--   ฝั่งลูกค้า  jjmk-menu.html  : สแกน QR → เลือกเมนูตามแพ็กเกจ → ส่งออเดอร์ (ผ่านฟังก์ชัน ตรวจเวลา/แพ็กเกจฝั่งฐานข้อมูล)
--   ตาราง: qr_settings · qr_menu_items · qr_sessions · qr_orders   ฟังก์ชัน: qr_session_info · qr_place_order
-- ============================================================

-- ① ตั้งค่า (key/value เก็บเป็นข้อความ/JSON)
create table if not exists qr_settings(key text primary key, value text not null default '', updated_at timestamptz not null default now());
insert into qr_settings(key,value) values
  ('pin','1234'),
  ('tables','{"JJRD":44,"JJLP":38}'),
  ('minutes','110'),
  ('packages','[{"code":"standard","name":"Standard","color":"#5B7FA6"},{"code":"premium","name":"Premium","color":"#E5B03C"}]')
on conflict (key) do nothing;

-- ② เมนูฝั่งลูกค้า (เจ้าของเพิ่มเองในแอพ)
create table if not exists qr_menu_items(
  id          bigint generated always as identity primary key,
  name        text not null,
  category    text not null default 'อื่น ๆ',
  packages    text[] not null default '{standard,premium}',   -- แพ็กเกจที่สั่งเมนูนี้ได้
  unit_label  text not null default 'จาน',
  max_per_order int,                                            -- จำกัดต่อออเดอร์ (ว่าง = ไม่จำกัด)
  image_url   text,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- ③ รอบโต๊ะ (1 แถว = 1 QR ที่สร้าง)
create table if not exists qr_sessions(
  id          bigint generated always as identity primary key,
  token       text not null unique,
  branch      text not null,           -- JJRD / JJLP
  table_no    int  not null,
  package     text not null,           -- standard / premium
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  status      text not null default 'open',   -- open / closed
  closed_at   timestamptz,
  created_by  text
);
create index if not exists qr_sessions_open_idx on qr_sessions(branch,status,expires_at);

-- ④ ออเดอร์
create table if not exists qr_orders(
  id          bigint generated always as identity primary key,
  session_id  bigint not null references qr_sessions(id) on delete cascade,
  branch      text not null,
  table_no    int  not null,
  items       jsonb not null default '[]',   -- [{id,name,qty,unit}]
  note        text,
  kind        text not null default 'order', -- order / call (เรียกพนักงาน)
  status      text not null default 'new',   -- new / cooking / served / cancelled
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists qr_orders_feed_idx on qr_orders(branch,status,created_at desc);

-- ⑤ RLS + policy + grant (แบบเดียวกับตารางอื่นของโปรเจกต์: แอพใช้ publishable key = role anon)
do $$ declare t text; begin
  foreach t in array array['qr_settings','qr_menu_items','qr_sessions','qr_orders'] loop
    execute format('alter table %I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='jjqr_allow') then
      execute format('create policy jjqr_allow on %I for all using (true) with check (true)', t);
    end if;
    execute format('grant select, insert, update, delete on %I to anon, authenticated', t);
  end loop;
end $$;

-- ⑥ ฟังก์ชันฝั่งลูกค้า (security definer: ลูกค้ารู้แค่ token ของโต๊ะตัวเอง)
create or replace function qr_session_info(p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s qr_sessions; m jsonb; o jsonb; p jsonb;
begin
  select * into s from qr_sessions where token = p_token;
  if not found then return jsonb_build_object('ok',false,'error','ไม่พบ QR นี้'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'category',category,'unit',unit_label,'max',max_per_order,'image',image_url) order by sort,name),'[]')
    into m from qr_menu_items where active and s.package = any(packages);
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'items',items,'note',note,'kind',kind,'status',status,'at',created_at) order by created_at desc),'[]')
    into o from qr_orders where session_id = s.id;
  select value::jsonb into p from qr_settings where key='packages';
  return jsonb_build_object('ok',true,'now',now(),
    'session',jsonb_build_object('id',s.id,'branch',s.branch,'table_no',s.table_no,'package',s.package,
      'started_at',s.started_at,'expires_at',s.expires_at,'status',s.status,
      'open', (s.status='open' and s.expires_at > now())),
    'packages',coalesce(p,'[]'::jsonb),'menu',m,'orders',o);
end $$;

create or replace function qr_place_order(p_token text, p_items jsonb, p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s qr_sessions; it jsonb; mi qr_menu_items; clean jsonb := '[]'; q int; oid bigint; kind text := 'order';
begin
  select * into s from qr_sessions where token = p_token;
  if not found then return jsonb_build_object('ok',false,'error','ไม่พบ QR นี้'); end if;
  if s.status <> 'open' then return jsonb_build_object('ok',false,'error','โต๊ะนี้ปิดแล้ว'); end if;
  if s.expires_at <= now() then return jsonb_build_object('ok',false,'error','หมดเวลาสั่งแล้ว'); end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    if coalesce(btrim(p_note),'') = '' then return jsonb_build_object('ok',false,'error','ยังไม่ได้เลือกเมนู'); end if;
    kind := 'call';   -- เรียกพนักงาน (ไม่มีรายการ)
  else
    for it in select * from jsonb_array_elements(p_items) loop
      q := coalesce((it->>'qty')::int, 0);
      if q <= 0 then continue; end if;
      select * into mi from qr_menu_items where id = (it->>'id')::bigint and active and s.package = any(packages);
      if not found then return jsonb_build_object('ok',false,'error','เมนู "'||coalesce(it->>'name','?')||'" สั่งไม่ได้ในแพ็กเกจนี้'); end if;
      if mi.max_per_order is not null and q > mi.max_per_order then q := mi.max_per_order; end if;
      clean := clean || jsonb_build_object('id',mi.id,'name',mi.name,'qty',q,'unit',mi.unit_label);
    end loop;
    if jsonb_array_length(clean) = 0 then return jsonb_build_object('ok',false,'error','ยังไม่ได้เลือกเมนู'); end if;
  end if;
  insert into qr_orders(session_id,branch,table_no,items,note,kind) values (s.id,s.branch,s.table_no,clean,nullif(btrim(p_note),''),kind) returning id into oid;
  return jsonb_build_object('ok',true,'order_id',oid,'items',clean,'kind',kind);
end $$;

grant execute on function qr_session_info(text) to anon, authenticated;
grant execute on function qr_place_order(text, jsonb, text) to anon, authenticated;

-- ---------- ตรวจผล ----------
select key, left(value,60) as value from qr_settings order by key;
select 'เมนู' as ตาราง, count(*) as แถว from qr_menu_items
union all select 'รอบโต๊ะ', count(*) from qr_sessions
union all select 'ออเดอร์', count(*) from qr_orders;
select proname as ฟังก์ชัน from pg_proc where proname in ('qr_session_info','qr_place_order') order by 1;
-- คาด: settings 4 แถว (pin/tables/minutes/packages) · ฟังก์ชัน 2 ตัว · เมนู 0 แถว (ไปเพิ่มในแอพ jjmk-order.html › 🍽 เมนู)
