-- ============================================================
-- JJ เช็คสต๊อก · เงื่อนไขซัพเพิ่มเติม (19 ก.ย. 2569) — รันซ้ำได้
--   ① order_ahead = สั่งล่วงหน้ากี่วัน  (เช่น รอบสั่งจริงวันพุธ ตั้ง 1 = ขึ้นให้สั่งตั้งแต่วันอังคาร
--      จะได้ไม่ต้องลุ้นว่าจะทันเวลาตัดรอบของซัพไหม · วันส่งยังเป็นรอบเดิมของซัพ)
--   ② prepay    = ต้องจ่ายก่อนของออก  (พอส่งใบสั่งเข้าไลน์ซัพแล้ว ระบบจะยิงเตือนเข้า "กลุ่มแอดมิน" ให้ด้วย)
--   ③ config.remind_line_group = กลุ่มไลน์แอดมิน (ใช้ร่วมกับบอทเตือนรอบสั่งของระบบเดิม)
--   *** ทั้ง 2 คอลัมน์เป็นของตาราง suppliers ที่ใช้ร่วมกับแอพนับเดิม — เพิ่มเฉย ๆ ของเดิมไม่กระทบ ***
-- ============================================================
alter table suppliers add column if not exists order_ahead int not null default 0;
alter table suppliers add column if not exists prepay boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='suppliers_order_ahead_chk') then
    alter table suppliers add constraint suppliers_order_ahead_chk check (order_ahead between 0 and 6);
  end if;
end $$;

grant select, insert, update, delete on suppliers to anon, authenticated;

-- ตั้งกลุ่มแอดมินจากในแอพได้ (ตาราง config ของระบบเดิม · key/value)
do $$ begin
  if to_regclass('public.config') is not null then
    execute 'grant select, insert, update on public.config to anon, authenticated';
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname='config' and c.relrowsecurity)
       and not exists (select 1 from pg_policies where schemaname='public' and tablename='config' and policyname='jjsc_allow')
    then execute 'create policy jjsc_allow on public.config for all using (true) with check (true)'; end if;
  else
    raise notice 'ไม่มีตาราง config — ตั้งกลุ่มแอดมินในแอพจะยังไม่ได้';
  end if;
end $$;

-- ---------- ตรวจผล ----------
select name as ซัพ,
       case when coalesce(order_mode,'any')='fixed' then 'วันสั่งตายตัว' else 'สั่งได้ทุกวัน' end as โหมด,
       coalesce(order_ahead,0) as สั่งล่วงหน้า_วัน,
       case when prepay then '💸 ต้องจ่ายก่อนส่ง' else '-' end as เงื่อนไขจ่าย,
       case when line_group_id is null or line_group_id='' then '⚠ ยังไม่ผูกกลุ่มไลน์' else 'ผูกแล้ว' end as กลุ่มไลน์
  from suppliers
 order by prepay desc, coalesce(order_ahead,0) desc, name;

select coalesce((select value from config where key='remind_line_group'),'(ยังไม่ตั้ง)') as กลุ่มแจ้งเตือนแอดมิน;
-- คาด: ทุกซัพขึ้น สั่งล่วงหน้า 0 วัน / เงื่อนไขจ่าย "-" (ค่าตั้งต้น) แล้วไปตั้งเองในแอพที่ 🚚 รอบสั่งซัพ
