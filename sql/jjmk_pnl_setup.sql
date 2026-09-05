-- ============================================================
--  JJ P&L : ระบบบัญชีรายรับ-รายจ่ายรายสาขา จริงใจหมูกระทะ
--  รันครั้งเดียวใน Supabase SQL Editor
--  (แนะนำใช้โปรเจกต์เดียวกับ JJ Stock/Payroll: aikyxvluaiubdidqxwnd)
-- ============================================================

-- ---------- 1) ตารางหลัก ----------
create table if not exists pnl_branches (
  code text primary key,
  name text not null,
  active boolean not null default true
);

create table if not exists pnl_suppliers (
  id bigint generated always as identity primary key,
  category text not null,                -- อาหาร / ของใช้ / ของหวาน / น้ำ / ไอศกรีม / Delivery
  name text not null unique,
  payment_term text,                     -- ตัดยอดรายเดือน / 15 วัน จ่าย / จ่ายก่อนส่ง ...
  vat_type text not null default 'NON-VAT',  -- VAT / NON-VAT / VAT / NON-VAT
  bank text, account_no text, account_name text, full_name text,
  sort int not null default 0,
  active boolean not null default true
);

-- % ต้นทุนย้อนหลังต่อรายได้ (จากชีทสรุปเดิม) ใช้เทียบมาตรฐาน
create table if not exists pnl_benchmarks (
  bkey text not null,                    -- ชื่อซัพพลายเออร์ หรือ กะเช้า/กะเย็น/Shopee
  period text not null,                  -- เช่น 1/68
  pct numeric not null,
  primary key (bkey, period)
);

-- รายรับรายวัน (ชีท "รายรับ")
create table if not exists pnl_income_daily (
  branch text not null references pnl_branches(code),
  d date not null,
  -- แยกกะเช้า (_am) / กะเย็น (_pm) ตามชีทรายรับต้นฉบับ (วันละ 2 คอลัมน์)
  sales_pos_am numeric not null default 0,             sales_pos_pm numeric not null default 0,             -- ยอดขาย (POS)
  deposit_am numeric not null default 0,               deposit_pm numeric not null default 0,               -- เงินฝาก
  cash_drawer_am numeric not null default 0,           cash_drawer_pm numeric not null default 0,           -- เงินเก๊ะ
  transfer_total_am numeric not null default 0,        transfer_total_pm numeric not null default 0,        -- ยอดเงินโอน
  reserve_acct_am numeric not null default 0,          reserve_acct_pm numeric not null default 0,          -- ยอดเงินบัญชีสำรอง
  transfer_pending_prev_am numeric not null default 0, transfer_pending_prev_pm numeric not null default 0, -- ยอดโอนคงค้างเมื่อวาน
  drawer_open_am numeric not null default 0,           drawer_open_pm numeric not null default 0,           -- ยอดเก๊ะเปิด (เปิดกะ = เงินเก๊ะกะก่อนหน้า)
  note text,
  primary key (branch, d)
);

-- รายจ่ายเงินสดหน้าร้าน (แถวย่อยใต้ชีทรายรับ)
create table if not exists pnl_cash_expenses (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  d date not null,
  shift text not null default 'เช้า',    -- เช้า / เย็น
  descr text not null default '',
  amount numeric not null default 0
);
create index if not exists idx_cashx on pnl_cash_expenses (branch, d);

-- รายจ่ายซัพพลายเออร์รายวัน (ชีท "รายจ่าย")
create table if not exists pnl_expense_daily (
  branch text not null references pnl_branches(code),
  d date not null,
  supplier_id bigint not null references pnl_suppliers(id),
  amount numeric not null default 0,
  note text,
  primary key (branch, d, supplier_id)
);
create index if not exists idx_expd on pnl_expense_daily (branch, d);

-- รายจ่ายนอกเหนือ
create table if not exists pnl_extra_expenses (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  d date not null,
  descr text not null default '',
  amount numeric not null default 0,
  requester text
);
create index if not exists idx_extra on pnl_extra_expenses (branch, d);

-- Shopee log (ชีต14)
create table if not exists pnl_shopee (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  d date not null,
  item text not null default '',
  shop text,
  topup numeric not null default 0,
  shipping numeric not null default 0,
  price numeric not null default 0,
  qty numeric not null default 1
);
create index if not exists idx_shopee on pnl_shopee (branch, d);

-- ข้อมูลระดับเดือน (Grab/Lineman/จำนวนวันหาร)
create table if not exists pnl_month_meta (
  branch text not null references pnl_branches(code),
  month text not null,                   -- 'YYYY-MM'
  grab numeric not null default 0,
  lineman numeric not null default 0,
  days_divisor int,
  note text,
  primary key (branch, month)
);

-- รายการ Fix cost (โครง) + ยอดจริงรายเดือน
create table if not exists pnl_fixed_items (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  grp text not null,                     -- รายเดือน / สาธารณูปโภค / พนักงาน
  name text not null,
  default_amount numeric,
  sort int not null default 0,
  active boolean not null default true
);
create table if not exists pnl_fixed_monthly (
  branch text not null references pnl_branches(code),
  month text not null,
  item_id bigint not null references pnl_fixed_items(id) on delete cascade,
  amount numeric not null default 0,
  primary key (branch, month, item_id)
);

-- ราคาเนื้อ (Yannah) + น้ำหนักรายวัน
create table if not exists pnl_meat_prices (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  name text not null,
  price_kg numeric not null default 0,
  sort int not null default 0,
  active boolean not null default true
);
create table if not exists pnl_meat_daily (
  branch text not null references pnl_branches(code),
  d date not null,
  meat_id bigint not null references pnl_meat_prices(id) on delete cascade,
  kg numeric not null default 0,
  primary key (branch, d, meat_id)
);

-- ใบสำคัญจ่าย (PV)
create table if not exists pnl_pv (
  id bigint generated always as identity primary key,
  branch text not null references pnl_branches(code),
  pv_no text not null,
  pv_date date not null default current_date,
  d_from date not null,
  d_to date not null,
  vat_type text not null default 'NON-VAT',   -- VAT / NON-VAT
  created_at timestamptz not null default now()
);
create table if not exists pnl_pv_items (
  id bigint generated always as identity primary key,
  pv_id bigint not null references pnl_pv(id) on delete cascade,
  supplier_id bigint references pnl_suppliers(id),
  amount numeric not null default 0,
  vat_amount numeric not null default 0,
  scheduled boolean not null default false,   -- ตั้งจ่ายแล้ว
  paid boolean not null default false         -- จ่ายสำเร็จ
);

-- ---------- 2) RLS (เปิดใช้แบบ internal tool: anon ทำได้ทุกอย่าง) ----------
do $$
declare t text;
begin
  foreach t in array array['pnl_branches','pnl_suppliers','pnl_benchmarks','pnl_income_daily',
    'pnl_cash_expenses','pnl_expense_daily','pnl_extra_expenses','pnl_shopee','pnl_month_meta',
    'pnl_fixed_items','pnl_fixed_monthly','pnl_meat_prices','pnl_meat_daily','pnl_pv','pnl_pv_items']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists allow_all on %I', t);
    execute format('create policy allow_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- 3) Seed: สาขา ----------
insert into pnl_branches (code,name) values
('JJRD','สาขารัชดา'),
('JJLP','สาขาลาดพร้าว')
on conflict (code) do nothing;

-- ---------- 4) Seed: ซัพพลายเออร์ 45 ราย (จากไฟล์จริง 08/2026) ----------
insert into pnl_suppliers (category,name,payment_term,vat_type,bank,account_no,account_name,full_name,sort) values
('อาหาร','FarmFresh','ตัดยอดรายเดือน','NON-VAT','กสิกร','0188647472','บจก. ฟาร์มเฟรช ฟู้ดแอนด์ซัพพลาย',null,10),
('อาหาร','Smilemeat','ตัดยอดรายเดือน','NON-VAT','กสิกร','5181018099','บริษัท สมายมีท จำกัด','บริษัท สมายมีท จำกัด',20),
('อาหาร','Siammitr','ตัดยอดรายเดือน','VAT','กสิกร','5181008581','บจก. สยามมิตร ฟู้ดส์','Siammitr Foods',30),
('อาหาร','Smile heart','15 วัน จ่าย','VAT','กสิกร','0253325852','บจก. สมายล์ ฮาร์ท ฟู้ดส์',null,40),
('อาหาร','Yannah Beef','15 วัน จ่าย','NON-VAT','กสิกร','0518168088','กรกช ทรงศิริ',null,50),
('อาหาร','เสี่ยบิ๊ก','ตัดยอดรายเดือน','NON-VAT','กสิกร','6402281195','ชัยพัฒน์ อุไรวงค์',null,60),
('อาหาร','Jimmy','15 วัน จ่าย','NON-VAT','ไทยพาณิชย์','4066627959','วราวุจ ตันตระกูล','ณชา ซีฟู้ดส์',70),
('อาหาร','ผัก','จ่ายทุกวัน จ่ายก่อนส่ง','NON-VAT',null,null,null,null,80),
('อาหาร','Pure food','ตัดยอดรายเดือน','VAT','ไทยพาณิชย์','4066913758','บจ. เพียวสแควร์','เพียวสแควร์',90),
('อาหาร','PFP','15 วัน จ่าย','VAT','กสิกร','0642598880','พี.เอฟ.พี.เทรดดิ้ง',null,100),
('อาหาร','Makro','จ่ายหลังส่งของ','NON-VAT',null,null,null,null,110),
('อาหาร','ramenology','15 วัน จ่าย','VAT','กสิกร','7452647251','บริษัท ราเมนโนโลยี จำกัด','บริษัท ราเมนโนโลยี จำกัด',120),
('อาหาร','Mix888','ไม่จ่าย ให้ฟรี','NON-VAT','ออมสิน','020442802300','นาย ชญานนท์ จันทรภาสวร',null,130),
('อาหาร','Biz portal (Ajinomoto)','15 วัน จ่าย','VAT','ไทยพาณิชย์','0472533312','บริษัท บิซพอร์ทัล จำกัด','บริษัท บิซพอร์ทัล จำกัด',140),
('อาหาร','AFM ธาริกันฟู้ดส์','15 วัน จ่าย','VAT / NON-VAT','กสิกร','0223986749','บจ. ธาริกัน ฟู้ดส์','บจ. ธาริกัน ฟู้ดส์',150),
('อาหาร','KingChef','จ่ายหลังส่งของ','VAT','ไทยพาณิชย์','5704397071','บริษัท คิงส์ วิช จำกัด','บริษัท คิงส์ วิช จำกัด',160),
('อาหาร','TVI','จ่ายหลังส่งของ','VAT','กสิกร','0812291599','บจก. อุตสาหกรรมทวีวงษ์','Thaveevong industry co.,ltd',170),
('อาหาร','TRR (ม้าบิน)','15 วัน จ่าย','VAT','กสิกร','4641039883','TRR Food Product','TRR Food Product',180),
('อาหาร','SP เบค่อน','จ่ายก่อนส่ง','NON-VAT','กรุงเทพ','9270030928','พันทิพา ทีปประสาน','Sp Bacon',190),
('อาหาร','Betagro','จ่ายหลังส่งของ','VAT',null,null,null,null,200),
('อาหาร','Best Deal','15 วัน จ่าย','NON-VAT','กสิกร','0491615346','บจก. เบสดีล ออนไลน์',null,210),
('อาหาร','KCG','15 วัน จ่าย','VAT / NON-VAT','ไทยพาณิชย์','0154513387','เคซีจี คอร์ปอเรชั่น',null,220),
('อาหาร','KCG Indoguna เนื้อ','15 วัน จ่าย','NON-VAT','กสิกร','7892356836','บจก.อินโดกูนา (ประเทศไทย)',null,230),
('อาหาร','RISEPLUS',null,'NON-VAT','กรุงศรี','0019647682','บริษัท ไรส์ พลัส จำกัด','บริษัท ไรส์ พลัส จำกัด',240),
('อาหาร','ชีส (PSK นม)','จ่ายก่อนส่ง','VAT','กรุงศรี','6811125692','บจก. พีเอสเค ผลิตภัณฑ์นม','บริษัท พีเอสเค ผลิตภัณฑ์นม จำกัด',250),
('อาหาร','Dalee','7 วัน จ่าย','NON-VAT','กสิกร','3401018025','บริษัท บางกอกแร้นซ์ จำกัด (มหาชน)','บริษัท บางกอกแร้นซ์ จำกัด (มหาชน)',260),
('อาหาร','Maruha','จ่ายก่อนส่ง','VAT / NON-VAT','กรุงเทพ','8577075941','บจ.อูมิออส (ไทยแลนด์)','บริษัท อูมิออส (ไทยแลนด์) จำกัด',270),
('อาหาร','อัญญพัชร์ (แมงกะพรุน)',null,'NON-VAT','กสิกร','1901826974','อัญญพัชร์ อันดามัน','บริษัท อัญญพัชร์ อันดามัน จำกัด',280),
('อาหาร','สุรพลไฟน์เนสท์',null,'VAT','กสิกร','0038239139','บจก.สุรพลไฟน์เนสท์','บริษัท สุรพลไฟน์เนสท์ จำกัด',290),
('อาหาร','CPF',null,'VAT',null,null,null,null,300),
('อาหาร','SEACOURT',null,'VAT','กสิกร','0468028182',null,'บริษัท ซีคอร์ท ฟู้ด เซอร์วิส จำกัด',310),
('อาหาร','JD FOOD',null,'VAT',null,null,null,'บริษัท เจดี ฟู้ด จำกัด (มหาชน) สำนักงานใหญ่',320),
('ของใช้','Knock Knock','ตัดยอดรายเดือน','VAT','กสิกร','0612938555','Knockstore Co.,LTD.',null,330),
('ของใช้','Topthai (ช้อนไอติม)',null,'NON-VAT',null,null,null,null,340),
('ของหวาน','Jack','จ่ายหลังส่งของ','NON-VAT','กรุงศรี','3320010148','หจก. แกรนนารี่','ห้างหุ้นส่วนจำกัด แกรนนารี่',350),
('ของหวาน','SD Bakery','จ่ายก่อนส่ง','NON-VAT',null,null,null,'บริษัท ส.แสงดี กรุ๊ป จำกัด',360),
('ของหวาน','Freshy Syrup (TRR Food product)','จ่ายสด','VAT',null,null,null,null,370),
('ของหวาน','Queen','พี่คิมทำจ่าย','VAT','กสิกร','0991084185','บจก. ควีนโปรดักส์',null,380),
('ของหวาน','น้ำตาลมิตรผล',null,'NON-VAT',null,null,null,null,390),
('น้ำ','Coke','15 วัน จ่าย','VAT','กรุงเทพ','1013439318','บริษัท ไทยน้ำทิพย์ คอร์ปอเรชั่น จำกัด','Coke',400),
('น้ำ','Smoosh','15 วัน จ่าย','VAT','กสิกร','6412090673','บริษัท เซ็นซอรี่ จำกัด','บริษัท เซ็นซอรี่ จำกัด',410),
('ไอศกรีม','Destiny','จ่ายก่อนส่ง','NON-VAT','กรุงศรี','0371569613','บจก. เดสทินีเอเชีย','บริษัท เดสทินีเอเชีย จำกัด',420),
('Delivery','สายคาดกล่อง Tumtook','จ่ายก่อนส่ง','NON-VAT',null,null,null,null,430),
('Delivery','ค่ากล่อง NLTY','จ่ายก่อนส่ง','NON-VAT',null,null,null,null,440),
('Delivery','ตะเกียบ สยามอุตสาหกรรมไผ่','ตัดยอดรายเดือน','NON-VAT',null,null,null,'บริษัท สยามอุตสาหกรรมไผ่ จำกัด',450)
on conflict (name) do nothing;

insert into pnl_benchmarks (bkey,period,pct) values
('FarmFresh','1/68',0.0374),
('FarmFresh','2/68',0.0451),
('FarmFresh','3/68',0.0438),
('FarmFresh','4/69',0.0365),
('FarmFresh','5/69',0.0391),
('Smilemeat','1/68',0.0861),
('Smilemeat','2/68',0.0561),
('Smilemeat','3/68',0.0745),
('Smilemeat','4/69',0.0902),
('Smilemeat','5/69',0.0746),
('Siammitr','1/68',0.0067),
('Siammitr','2/68',0.0073),
('Siammitr','3/68',0.0058),
('Siammitr','4/69',0.0082),
('Siammitr','5/69',0.0056),
('Smile heart','1/68',0.0073),
('Smile heart','2/68',0.0052),
('Smile heart','3/68',0.0039),
('Smile heart','4/69',0.0059),
('Smile heart','5/69',0.0053),
('Yannah Beef','1/68',0.0574),
('Yannah Beef','2/68',0.0649),
('Yannah Beef','3/68',0.0646),
('Yannah Beef','4/69',0.0622),
('Yannah Beef','5/69',0.0551),
('เสี่ยบิ๊ก','1/68',0.0716),
('เสี่ยบิ๊ก','2/68',0.0738),
('เสี่ยบิ๊ก','3/68',0.065),
('เสี่ยบิ๊ก','4/69',0.0642),
('เสี่ยบิ๊ก','5/69',0.0461),
('Jimmy','1/68',0.0533),
('Jimmy','2/68',0.0562),
('Jimmy','3/68',0.0607),
('Jimmy','4/69',0.0582),
('Jimmy','5/69',0.0499),
('ผัก','1/68',0.0547),
('ผัก','2/68',0.0452),
('ผัก','3/68',0.0474),
('ผัก','4/69',0.0509),
('ผัก','5/69',0.0534),
('Pure food','1/68',0.0),
('Pure food','2/68',0.0),
('Pure food','3/68',0.0),
('Pure food','4/69',0.0),
('Pure food','5/69',0.0447),
('PFP','1/68',0.0051),
('PFP','2/68',0.0059),
('PFP','3/68',0.0061),
('PFP','4/69',0.0069),
('PFP','5/69',0.0066),
('Makro','1/68',0.0246),
('Makro','2/68',0.0242),
('Makro','3/68',0.0258),
('Makro','4/69',0.0212),
('Makro','5/69',0.0267),
('ramenology','1/68',0.001),
('ramenology','2/68',0.0017),
('ramenology','3/68',0.0016),
('ramenology','4/69',0.0016),
('ramenology','5/69',0.0016),
('Mix888','1/68',0.0134),
('Mix888','2/68',0.0102),
('Mix888','3/68',0.0226),
('Mix888','4/69',0.023),
('Mix888','5/69',0.0206),
('Biz portal (Ajinomoto)','1/68',0.0033),
('Biz portal (Ajinomoto)','2/68',0.0047),
('Biz portal (Ajinomoto)','3/68',0.0029),
('Biz portal (Ajinomoto)','4/69',0.0029),
('Biz portal (Ajinomoto)','5/69',0.0033),
('AFM ธาริกันฟู้ดส์','1/68',0.0028),
('AFM ธาริกันฟู้ดส์','2/68',0.0038),
('AFM ธาริกันฟู้ดส์','3/68',0.0027),
('AFM ธาริกันฟู้ดส์','4/69',0.0045),
('AFM ธาริกันฟู้ดส์','5/69',0.0042),
('KingChef','1/68',0.0049),
('KingChef','2/68',0.0047),
('KingChef','3/68',0.0049),
('KingChef','4/69',0.0059),
('KingChef','5/69',0.0037),
('TVI','1/68',0.002),
('TVI','2/68',0.0027),
('TVI','3/68',0.0031),
('TVI','4/69',0.0048),
('TVI','5/69',0.0045),
('TRR (ม้าบิน)','1/68',0.0026),
('TRR (ม้าบิน)','2/68',0.0015),
('TRR (ม้าบิน)','3/68',0.0022),
('TRR (ม้าบิน)','4/69',0.0027),
('TRR (ม้าบิน)','5/69',0.0015),
('SP เบค่อน','1/68',0.0017),
('SP เบค่อน','2/68',0.0038),
('SP เบค่อน','3/68',0.0015),
('SP เบค่อน','4/69',0.0029),
('SP เบค่อน','5/69',0.0029),
('Betagro','1/68',0.0025),
('Betagro','2/68',0.0043),
('Betagro','3/68',0.0038),
('Betagro','4/69',0.0039),
('Betagro','5/69',0.0038),
('Best Deal','1/68',0.0162),
('Best Deal','2/68',0.0),
('Best Deal','3/68',0.003),
('Best Deal','4/69',0.0066),
('Best Deal','5/69',0.0056),
('KCG','1/68',0.0121),
('KCG','2/68',0.0144),
('KCG','3/68',0.0141),
('KCG','4/69',0.0174),
('KCG','5/69',0.0145),
('KCG Indoguna เนื้อ','1/68',0.0085),
('KCG Indoguna เนื้อ','2/68',0.0093),
('KCG Indoguna เนื้อ','3/68',0.0151),
('KCG Indoguna เนื้อ','4/69',0.0186),
('KCG Indoguna เนื้อ','5/69',0.0194),
('RISEPLUS','1/68',0.0024),
('RISEPLUS','2/68',0.0),
('RISEPLUS','3/68',0.002),
('RISEPLUS','4/69',0.002),
('RISEPLUS','5/69',0.002),
('ชีส (PSK นม)','1/68',0.002),
('ชีส (PSK นม)','2/68',0.0023),
('ชีส (PSK นม)','3/68',0.0021),
('ชีส (PSK นม)','4/69',0.0021),
('ชีส (PSK นม)','5/69',0.0),
('Dalee','1/68',0.0026),
('Dalee','2/68',0.0051),
('Dalee','3/68',0.0055),
('Dalee','4/69',0.0066),
('Dalee','5/69',0.0031),
('Maruha','1/68',0.0017),
('Maruha','2/68',0.0049),
('Maruha','3/68',0.0079),
('Maruha','4/69',0.0056),
('Maruha','5/69',0.0085),
('อัญญพัชร์ (แมงกะพรุน)','1/68',0.0),
('อัญญพัชร์ (แมงกะพรุน)','2/68',0.0),
('อัญญพัชร์ (แมงกะพรุน)','3/68',0.0005),
('อัญญพัชร์ (แมงกะพรุน)','4/69',0.0032),
('อัญญพัชร์ (แมงกะพรุน)','5/69',0.0028),
('สุรพลไฟน์เนสท์','1/68',0.0),
('สุรพลไฟน์เนสท์','2/68',0.0),
('สุรพลไฟน์เนสท์','3/68',0.0),
('สุรพลไฟน์เนสท์','4/69',0.0),
('สุรพลไฟน์เนสท์','5/69',0.0026),
('CPF','1/68',0.0),
('CPF','2/68',0.0),
('CPF','3/68',0.0),
('CPF','4/69',0.0),
('CPF','5/69',0.0064),
('SEACOURT','1/68',0.0),
('SEACOURT','2/68',0.0),
('SEACOURT','3/68',0.0),
('SEACOURT','4/69',0.0),
('SEACOURT','5/69',0.0033),
('JD FOOD','1/68',0.0),
('JD FOOD','2/68',0.0),
('JD FOOD','3/68',0.0),
('JD FOOD','4/69',0.0),
('JD FOOD','5/69',0.0),
('Knock Knock','1/68',0.0069),
('Knock Knock','2/68',0.0057),
('Knock Knock','3/68',0.0078),
('Knock Knock','4/69',0.0081),
('Knock Knock','5/69',0.0094),
('Topthai (ช้อนไอติม)','1/68',0.0008),
('Topthai (ช้อนไอติม)','2/68',0.0),
('Topthai (ช้อนไอติม)','3/68',0.0),
('Topthai (ช้อนไอติม)','4/69',0.0009),
('Topthai (ช้อนไอติม)','5/69',0.0),
('Jack','1/68',0.0013),
('Jack','2/68',0.0012),
('Jack','3/68',0.0012),
('Jack','4/69',0.0013),
('Jack','5/69',0.0011),
('SD Bakery','1/68',0.0),
('SD Bakery','2/68',0.0),
('SD Bakery','3/68',0.0),
('SD Bakery','4/69',0.0),
('SD Bakery','5/69',0.0),
('Freshy Syrup (TRR Food product)','1/68',0.0009),
('Freshy Syrup (TRR Food product)','2/68',0.0005),
('Freshy Syrup (TRR Food product)','3/68',0.0009),
('Freshy Syrup (TRR Food product)','4/69',0.0),
('Freshy Syrup (TRR Food product)','5/69',0.0),
('Queen','1/68',0.0005),
('Queen','2/68',0.0006),
('Queen','3/68',0.0005),
('Queen','4/69',0.0004),
('Queen','5/69',0.0005),
('น้ำตาลมิตรผล','1/68',0.0),
('น้ำตาลมิตรผล','2/68',0.0),
('น้ำตาลมิตรผล','3/68',0.0),
('น้ำตาลมิตรผล','4/69',0.0),
('น้ำตาลมิตรผล','5/69',0.0),
('Coke','1/68',0.0156),
('Coke','2/68',0.0188),
('Coke','3/68',0.0272),
('Coke','4/69',0.0235),
('Coke','5/69',0.0204),
('Smoosh','1/68',0.0113),
('Smoosh','2/68',0.0163),
('Smoosh','3/68',0.0075),
('Smoosh','4/69',0.0037),
('Smoosh','5/69',0.0075),
('Destiny','1/68',0.0156),
('Destiny','2/68',0.0181),
('Destiny','3/68',0.0),
('Destiny','4/69',0.018),
('Destiny','5/69',0.0164),
('สายคาดกล่อง Tumtook','1/68',0.0),
('สายคาดกล่อง Tumtook','2/68',0.0),
('สายคาดกล่อง Tumtook','3/68',0.0),
('สายคาดกล่อง Tumtook','4/69',0.0),
('สายคาดกล่อง Tumtook','5/69',0.0),
('ค่ากล่อง NLTY','1/68',0.0),
('ค่ากล่อง NLTY','2/68',0.0),
('ค่ากล่อง NLTY','3/68',0.0),
('ค่ากล่อง NLTY','4/69',0.0),
('ค่ากล่อง NLTY','5/69',0.0),
('ตะเกียบ สยามอุตสาหกรรมไผ่','1/68',0.0),
('ตะเกียบ สยามอุตสาหกรรมไผ่','2/68',0.0),
('ตะเกียบ สยามอุตสาหกรรมไผ่','3/68',0.0),
('ตะเกียบ สยามอุตสาหกรรมไผ่','4/69',0.0),
('ตะเกียบ สยามอุตสาหกรรมไผ่','5/69',0.0),
('กะเช้า','1/68',0.0063),
('กะเช้า','2/68',0.0081),
('กะเช้า','3/68',0.0061),
('กะเช้า','4/69',0.0096),
('กะเช้า','5/69',0.0081),
('กะเย็น','1/68',0.0036),
('กะเย็น','2/68',0.0041),
('กะเย็น','3/68',0.0041),
('กะเย็น','4/69',0.0049),
('กะเย็น','5/69',0.0029),
('Shopee','1/68',0.0266),
('Shopee','2/68',0.0185),
('Shopee','3/68',0.03),
('Shopee','4/69',0.0127),
('Shopee','5/69',0.0182)
on conflict (bkey,period) do update set pct=excluded.pct;

-- ---------- 5) Seed: Fix cost (โครงจากไฟล์รัชดา / ลาดพร้าวใส่ยอดเองในหน้า สรุป) ----------
insert into pnl_fixed_items (branch,grp,name,default_amount,sort)
select b.code, x.grp, x.name, case when b.code='JJRD' then x.amt else null end, x.sort
from pnl_branches b cross join (values
  ('รายเดือน','ค่าเช่าร้านรายเดือน',85000::numeric,10),
  ('รายเดือน','ค่าตำรวจ',4000,20),
  ('รายเดือน','ค่าขยะ',1500,30),
  ('รายเดือน','Omega เครื่องล้างจาน',10500,40),
  ('รายเดือน','ADS ค้างจ่าย',null,50),
  ('รายเดือน','Robot Pudu',16050,60),
  ('รายเดือน','ค่าบัญชี',null,70),
  ('สาธารณูปโภค','ค่าไฟฟ้า',null,10),
  ('สาธารณูปโภค','ค่าน้ำ',null,20),
  ('สาธารณูปโภค','ค่าเน็ต',null,30),
  ('สาธารณูปโภค','เน็ตออฟฟิศ',null,40),
  ('พนักงาน','เงินเดือนพนักงานหน้าสาขา',null,10),
  ('พนักงาน','พนักงานเบิก 15',null,20),
  ('พนักงาน','ประกันสังคม',3600,30)
) as x(grp,name,amt,sort)
where not exists (select 1 from pnl_fixed_items f where f.branch=b.code and f.name=x.name);

-- ---------- 6) Seed: ราคาเนื้อ Yannah (ทั้งสองสาขา) ----------
insert into pnl_meat_prices (branch,name,price_kg,sort)
select b.code, x.name, x.p, x.sort
from pnl_branches b cross join (values
  ('สันคอ',160::numeric,10),('สามชั้น',150,20),('ริบอาย',180,30),
  ('ใบพาย',230,40),('เสือออส',240,50),('ลิ้น',235,60)
) as x(name,p,sort)
where not exists (select 1 from pnl_meat_prices m where m.branch=b.code and m.name=x.name);

-- เสร็จแล้ว ✅
