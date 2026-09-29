-- ============================================================
-- JJ P&L · ย้ายสิทธิ์รายเมนูชุดเก่า (pnl_users.perms) ไปเป็นสิทธิ์ JJ Access (pnl_users.apps.pnl) — 29 ก.ย. 2569
--   รันครั้งเดียว รันซ้ำได้ (idempotent)
--   ทำไม: P&L รุ่นใหม่อ่านสิทธิ์จาก apps.pnl (ที่ตั้งในหน้า JJ Access) เป็นหลัก
--         ถ้าบัญชีไหนยังไม่มี apps.pnl จะถอยไปใช้ perms ชุดเก่า → กด "ปิดแอพนี้" ใน JJ Access
--         (ซึ่งลบคีย์ pnl ทิ้ง) แล้วบัญชีที่มีแอพเดียวจะยังเข้า P&L ได้จาก perms เก่า
--   ทำอะไร: 1) บัญชีที่ยังไม่มี apps.pnl แต่มี perms → คัดลอก perms เป็น apps.pnl (edit→'vaed', view→'v', none→ไม่ใส่)
--           2) ล้าง perms ของทุกบัญชีเป็น {} → สิทธิ์ P&L อยู่ที่ JJ Access แหล่งเดียว
--   ผลกับผู้ใช้: สิทธิ์เท่าเดิมทุกคน (แค่ย้ายที่เก็บ) · ผู้ดูแล/เจ้าของไม่กระทบ (มีทุกสิทธิ์อยู่แล้ว)
-- ============================================================
alter table pnl_users add column if not exists apps jsonb not null default '{}'::jsonb;
alter table pnl_users add column if not exists perms jsonb not null default '{}'::jsonb;

-- สำรองก่อนย้าย (ตารางสำรองเก็บได้ เผื่อย้อน)
create table if not exists pnl_users_perms_backup (
  id bigint primary key, username text, perms jsonb, apps jsonb, backed_up_at timestamptz not null default now());
insert into pnl_users_perms_backup (id, username, perms, apps)
select id, username, perms, apps from pnl_users u
where not exists (select 1 from pnl_users_perms_backup b where b.id=u.id);

-- 1) คัดลอก perms → apps.pnl เฉพาะบัญชีที่ยังไม่มี apps.pnl และ perms มีเมนูที่ไม่ใช่ none
update pnl_users u
set apps = coalesce(u.apps,'{}'::jsonb) || jsonb_build_object('pnl',
      (select coalesce(jsonb_object_agg(k, case v when 'edit' then 'vaed' when 'view' then 'v' end),'{}'::jsonb)
         from jsonb_each_text(coalesce(u.perms,'{}'::jsonb)) as t(k,v)
        where v in ('edit','view')))
where not (coalesce(u.apps,'{}'::jsonb) ? 'pnl')
  and exists (select 1 from jsonb_each_text(coalesce(u.perms,'{}'::jsonb)) as t(k,v) where v in ('edit','view'));

-- 2) ล้าง perms เก่าทุกบัญชี (P&L รุ่นใหม่ไม่เขียนคอลัมน์นี้อีก)
update pnl_users set perms='{}'::jsonb where perms is null or perms <> '{}'::jsonb;

-- ============================================================
-- ตรวจผล — perms_left ต้องเป็น 0 · ทุกบัญชีพนักงานที่เคยมีสิทธิ์ P&L ต้องมี has_pnl = true
-- ============================================================
select 'perms_left' as what, count(*) as n from pnl_users where perms <> '{}'::jsonb
union all select 'backup_rows', count(*) from pnl_users_perms_backup;
select u.username, u.role, (u.apps ? 'pnl') as has_pnl, u.apps->'pnl' as pnl_flags, b.perms as old_perms
from pnl_users u left join pnl_users_perms_backup b on b.id=u.id
order by u.role desc, u.username;
