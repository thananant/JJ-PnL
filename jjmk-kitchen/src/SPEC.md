# JJ Kitchen v2 — rebuild spec (owner brief 2026-10-16)

The owner judged the current Central Kitchen app (`/home/user/JJ-PnL/jjmk-kitchen.html`, "old app") unusable and ordered a rebuild from scratch,
keeping ONLY the corporate identity (colours, logo, header/tab look of the stock-count app) and the existing master data
(ingredients, products/recipes with method + photos, suppliers with LINE groups). Everything else is new. Thai UI, staff may be Lao/Myanmar/English.

## Owner's brief (verbatim intent, Thai → English)
1. **Receiving**: record what was received today — item, quantity, package size, unit, and the ACTUAL price paid on that date.
2. **Production**: what was produced today, lot size, unit, and leftover/scrap of ingredients.
3. **Stock count split in two**: raw materials vs finished products.
4. **Branch orders** linked to the branch stock-count app: how much they ordered and how much must be sent; one bill per branch, stored per branch.
5. **Accounting.**
6. **History** of receiving and production.
7. **Menus/recipes**: pick ingredients and enter quantities in different units.
8. **Suppliers** with LINE group, to compute purchase orders like before.
Also: the branch counts stock and presses "order"; the kitchen must send from finished stock, produce urgently if short so every order is filled,
keep finished stock adequate but not excessive (refill after deliveries), send the bill to each branch's LINE group, keep each branch's month-end payable,
**product price = actual cost of that production lot** (ingredient prices as received; each lot may differ; always up to date) **+ hidden overhead costs** set in accounting.
Keep recipes/methods/photos; prices come from real costs.

## Hard rules (repo CLAUDE.md — binding)
- Single-file HTML app (CDN supabase-js; same SB_URL/SB_ANON as the old app). Central login `pnl_users` exactly like the old app: `jjsso_ticket` from the hub,
  tab session `sessionStorage.jjck_sess`, "remember 12h" `jjck_keep`, `kitchenAllowed()`/`mapCentralProf()` semantics incl. `_br` branch scope — PORT the old app's
  login/boot code (functions `sha256hex pwHash kitchenAllowed mapCentralProf centralLogin showLogin lgSubmit doLogout` and the `JJLogin.mount(...)` call) verbatim where possible.
- Embed byte-identical: the `window.JJLogin` block (`var APP='kitchen'`), the `<!-- JJBR-BEGIN … JJBR-END -->` block, the pull-to-refresh script (`ลากหน้าลง = รีเฟรช`), meta no-cache.
- Safe areas: header `padding-top:env(safe-area-inset-top)`, side insets with `max(…, env())`, pinned bottom bars above `env(safe-area-inset-bottom)`; no horizontal scroll on the 15-device matrix
  (320…440 phones, 280/344 folds, landscape 852×393 / 800×360, iPad 744); inputs ≥16px; tap targets ≥44px; refresh keeps the tab (`localStorage.jjck_tab`, validated).
- No `.sql` files committed to main/work branches (SQL goes to chat + branch `sql`). Never write the stock-count app's tables except as stated below. Escape all user data (`esc()`).
- 4 languages th/en/lo/my: every UI string through `t(key)`; module strings registered via `I18N.add({th:{…},en:{…},lo:{…},my:{…}})`.
- Simple words on staff screens (ทำของ/ส่งของ/สั่งของ/รับของ/ส่วนผสม) — no BOM/batch/safety/PO jargon in Thai UI.

## CI / look (= stock-count app `jjmk-stockcheck.html`)
Palette `--red:#C62127 --dk:#7E1013 --wine:#6B0F12 --ink:#2E2119 --mut:#8A7A66 --line:#E8DFCC --card:#FFFDF7 --bg:#F6F1E5 --green:#1F7A43 --amber:#A66A00 --goldf:#E5B03C`.
Fonts Prompt (headings/buttons) + Sarabun (+ Noto Sans Lao Looped / Noto Sans Myanmar). Header: sticky, gradient `linear-gradient(180deg,#7E1013,#690C0F)`, white text, logo with gold border,
glass language button; **tab row** of pills (inactive `rgba(255,255,255,.14)` text `#F2DCDC`, active `#E5B03C` text `#5A3E00`), horizontally scrollable, active scrolled into view; no ☰ menu.
Desktop ≥900px: dark-red left sidebar listing all pages. Pills `.pill` (wine outline / wine fill), section heads `.dhead` (wine text + gold line), cards with cream title strip,
count cards with − [input] ＋ and a pinned bottom save bar. Reuse the CSS from the old app's current version where it already matches (it was restyled to this CI today).

## Data model
### Master data — EXISTING tables, reused as-is (do not rename; add columns only with `alter table … add column if not exists`)
- `ck_items` (ingredients): id text pk, name, i18n jsonb, cat, unit (base unit e.g. กก./ลิตร/ชิ้น), buy_unit, buy_qty (1 buy_unit = buy_qty base), price (per buy unit, legacy),
  sup (supplier NAME), lead_days, min_qty, qty (cached stock in base unit), image_url, packs jsonb [{u,q}], count_unit, dept, active, deleted_at, sort.
  NEW columns: `avg_cost numeric` (moving-average cost per base unit), `last_price numeric` (last received price per base unit), `last_price_at date`.
- `ck_recipes` (products = finished goods): id, name, i18n, cat, yield_qty, yield_unit (1 lot = yield_qty yield_unit), extra_cost, qty (cached finished stock), unit_cost, image_url,
  note (method text: one line = one step, `#` = heading, `*` = tip), markup_pct, safety_days, safety_qty, stock_name, active, deleted_at, sort.
  NEW columns: `avg_cost numeric` (moving-average cost per yield unit, from lots), `target_qty numeric`, `target_days numeric`.
- `ck_recipe_items`: id, recipe_id, item_id, qty (in the ITEM's base unit — e.g. 2970 means 2970 g when item unit is กรัม … **check**: old app stored qty in the item's `unit`), sort.
  NEW column: `unit text` (nullable; null = item base unit; otherwise any unit convertible to it: กรัม/ขีด/กก./มล./ลิตร/pack unit).
- `ck_sups`: id, name, phone, lead_days, credit_days, line_group_id, order_days smallint[], note, active.
- `ck_settings` (key text pk, value jsonb) — reuse for: `kc_cfg` (see Settings), nothing else from the old app is read.
- Read-only external: `pnl_users`, `pnl_branches` (via JJBR block), `line_groups` (group_id,name), stock-count app's `products` (id, branch_id, name, unit, sup),
  `stock_receipts` (branch_id, branch_name, product_id, name, unit, sup, order_date, ordered) = branch orders, `branches` (id, name), `suppliers` (name, line_group_id — read only).
- RPC `ck_add_qty(p_kind text, p_id text, p_delta numeric)` already exists (kind 'item' → ck_items.qty, 'recipe' → ck_recipes.qty); keep using it for atomic stock updates.
- Old transactional tables (`ck_moves ck_productions ck_prod_items ck_plans ck_pos ck_po_items ck_orders ck_order_items ck_bills ck_br_needs ck_expenses ck_price_log`) are NOT read or written.

### New transactional tables (prefix `kc_`, all `id text primary key` generated client-side `uid('rc')` style unless noted, `by_name text`, `created_at timestamptz default now()`)
- `kc_receipts` (header): d date, sup_id text, sup_name text, bill_no text, total numeric, note text, po_id text.
- `kc_receipt_lines`: id bigserial, receipt_id, item_id, name, packs numeric (number of packages), pack_unit text, pack_qty numeric (1 package = pack_qty base units), unit text (base),
  qty_base numeric, price_mode text ('pack'|'total'), price numeric (what was typed), price_total numeric, price_base numeric (= price_total/qty_base), sort int.
- `kc_productions`: d date, recipe_id, name, lots numeric, plan_qty numeric (= lots × yield_qty), actual_qty numeric, unit text, cost_items numeric, cost_overhead numeric,
  cost_total numeric, cost_unit numeric (= cost_total/actual_qty), kind text ('urgent'|'refill'|'manual'), note text.
- `kc_production_lines`: id bigserial, production_id, item_id, name, qty_plan numeric (recipe × lots, base unit), qty_used numeric, qty_waste numeric (เศษเหลือ/ทิ้ง), unit text (base),
  unit_cost numeric (item avg_cost at the time), cost numeric (= (used+waste) × unit_cost), sort int.
- `kc_moves` (stock ledger for BOTH kinds): id bigserial, d date, kind text ('receive'|'produce_in'|'produce_out'|'send'|'adjust'|'waste'), ref_kind text ('item'|'recipe'), ref_id text,
  name text, qty numeric (signed, base unit), cost numeric (signed), ref_table text, ref_id2 text, note text, by_name, created_at. Every stock change = insert kc_moves + `ck_add_qty`.
- `kc_counts`: d date, kind text ('item'|'recipe'), n int, diff int, note text. `kc_count_lines`: id bigserial, count_id, ref_id, name, sys_qty, counted_qty, delta, unit, count_unit, count_qty.
- `kc_deliveries` (= branch bill): bill_no text (format `<BRANCH>-<YYMMDD>-<n>`), d date, branch text (code e.g. JJRD), branch_name text, order_date date, status text ('sent'|'paid'|'void'),
  subtotal numeric, overhead numeric, total numeric, line_sent_at timestamptz, line_group_id text, paid_at date, note text.
- `kc_delivery_lines`: id bigserial, delivery_id, recipe_id, name, stk_product_id text, ordered numeric, sent numeric, unit text, unit_cost numeric, unit_price numeric, amount numeric, sort int.
- `kc_links`: id bigserial, stk_name text (branch product name as in stock-count `products.name`), recipe_id text, factor numeric default 1 (1 branch unit = factor recipe yield units), unique(stk_name).
- `kc_pos`: po_no text, d date, sup_id, sup_name, status text ('draft'|'sent'|'received'), text text, note text, line_sent_at timestamptz.
  `kc_po_lines`: id bigserial, po_id, item_id, name, packs numeric, pack_unit, pack_qty, qty_base, unit, price_est numeric, sort int.
- `kc_expenses` (overhead / hidden costs): d date (any day of the month it belongs to), ym text ('YYYY-MM'), cat text, name text, amount numeric, recurring boolean, note text.
- Settings live in `ck_settings` key `kc_cfg`: `{ck_sup_names:['ครัวกลาง'], branch_line:{JJRD:'C…',JJLP:'C…'}, overhead_mode:'per_unit'|'pct', overhead_value:number, markup_pct:number,
  bill_prefix:'', refill_days:3, units:[...extra unit names], order_lookback_days:3}`.
- SQL file `k2/jjmk_kitchen2.sql`: create tables, indexes, `alter … add column if not exists`, **grant select/insert/update/delete to anon + permissive RLS policies for anon**
  (same pattern as the old `jjmk_kitchen_central.sql`: `alter table … enable row level security; create policy … for all to anon using (true) with check (true)`), re-runnable (if not exists / or replace).
  Also `create or replace function ck_add_qty` identical to the old one if missing.

## Units
Base units per item (`unit`). Conversions: mass กรัม↔ขีด(100 g)↔กก.(1000 g); volume มล.↔ลิตร(1000 ml); count ชิ้น/โหล(12). Per-item packs: `buy_unit/buy_qty` + `packs[{u,q}]`
(1 u = q base). `unitFactor(item, unitName)` → how many base units in one `unitName` (null if unknown). Recipe lines may be in any convertible unit; production converts to base.
Receiving: user enters packs × pack size (prefilled from item buy_unit/buy_qty, editable; new sizes get saved to `packs`). Counting: items counted in `count_unit` (or auto: smallest package, else base), products in yield_unit.

## Costing (owner rule: actual prices, per lot)
- Receipt line: price_base = price_total / qty_base. Item: `last_price=price_base`, `avg_cost = (max(qty,0)×avg_cost + qty_base×price_base)/(max(qty,0)+qty_base)` (if no prior avg → price_base). Stock += qty_base.
- Production: each line cost = (qty_used + qty_waste) × item.avg_cost (fallback last_price, then legacy price/buy_qty, else 0 and flag "ไม่มีราคา"). cost_items = Σ; overhead = per settings
  (per_unit × actual_qty or pct × cost_items) + recipe.extra_cost × lots; cost_total; cost_unit = cost_total/actual_qty. Stock: items −(used+waste) (moves produce_out/waste), product +actual_qty (produce_in).
  Product `avg_cost` = moving average with existing finished stock (if qty ≤ 0 → this lot's cost_unit). `unit_cost` column also set = cost_unit (latest lot) for display.
- Delivery line unit_price = product.avg_cost × (1 + markup_pct/100) (markup default 0; per-recipe markup_pct overrides). amount = sent × unit_price. Bill total = Σ amount (overhead already inside cost).
- Accounting month view: revenue = Σ delivery totals (status ≠ void) by branch; purchases = Σ receipts; overhead = Σ expenses (ym); COGS = Σ delivery lines sent × unit_cost; gross profit = revenue − COGS;
  net = revenue − purchases − overhead (cash view) — show both clearly labelled; receivable per branch = unpaid bills; suggested overhead per unit = overhead(ym) ÷ units produced(ym) with a button to apply to settings.

## Pages (tab ids → labels th) — order in the tab row
`today` ☀️ วันนี้ · `recv` 📥 รับของ · `make` 🍳 ทำของ · `count` 📋 นับสต๊อก · `send` 🚚 ส่งสาขา · `bills` 🧾 บิลสาขา · `buy` 🛒 สั่งของ · `menus` 📖 เมนู/สูตร · `items` 🥬 วัตถุดิบ ·
`sups` 🏷️ ร้านค้า · `acc` 💰 บัญชี · `hist` 📜 ประวัติ · `set` ⚙️ ตั้งค่า
- **today**: date; cards: 🚚 ออเดอร์สาขาที่ยังไม่ส่ง (n สาขา · m รายการ) → send; ⚡ ต้องทำด่วน (short for open orders) → make; 🔄 ต้องทำเติม (finished stock below target = target_qty or target_days × avg daily sent last 14 d);
  ⚠️ วัตถุดิบต่ำกว่าขั้นต่ำ → buy; 📋 นับล่าสุด; today's totals (received ฿, produced lots, sent ฿). Big tap targets.
- **recv**: form (ร้านค้า select + ＋ใหม่, วันที่, เลขบิล) + lines: วัตถุดิบ (search/select + ＋ใหม่ inline: name, base unit, pack), จำนวนบรรจุ, ขนาดบรรจุ [qty][unit], ราคา (toggle ต่อบรรจุ/รวม) → shows qty_base & ราคา/หน่วย;
  save → receipt + lines + moves + item avg_cost/last_price; "รับตามใบสั่งซื้อ" prefill from a sent PO; list of today's/recent receipts (open → detail, void with reversal).
- **make**: pick product (cards with photo) → lots (−/＋, decimals ok) → ingredient table (plan qty per lot × lots, editable ใช้จริง + เศษ/ทิ้ง, shows unit cost & cost), method steps (from note), actual yield qty + unit,
  live cost summary (cost_items, overhead, total, per unit, vs previous avg) → save. Pills: ⚡ ด่วน (from open orders) / 🔄 เติม (below target) / ทั้งหมด. Today's productions list (open → detail/void with reversal).
- **count**: two pills 🥬 วัตถุดิบ / 🍲 สินค้าที่ผลิตแล้ว; category chips; cards (photo, name, "ในระบบ X <count unit>", − [input] ＋, หมด); pinned bar "นับแล้ว a/b · 💾 บันทึก"; draft in localStorage (same day);
  summary of differences → apply (adjust moves) + kc_counts record.
- **send**: branch orders read from `stock_receipts` where `sup` matches any of cfg.ck_sup_names (case/space-insensitive) and order_date ≥ today − lookback, grouped by branch+order_date,
  minus orders already delivered (kc_deliveries with same branch+order_date, status≠void). Each branch card: lines (branch product name → recipe via kc_links or exact/normalised name match; unmatched → "ยังไม่ผูก" with a picker that saves kc_links),
  สั่งมา · มี · ส่ง (editable, default min(ordered, stock)) · ขาด. Button "✅ ส่งแล้ว ออกบิล" → kc_deliveries + lines (unit_cost/unit_price snapshot), moves `send`, stock −; then LINE text
  (shop header, branch, date, lines qty×unit × price = amount, total, bill no) sent via Edge Function `line-order` `{to, text}` (SB_URL+'/functions/v1/line-order', headers apikey+Bearer SB_ANON) to cfg.branch_line[branch];
  no group → show text + copy button + line.me/R/share. Partial send keeps the remainder visible as "ค้างส่ง".
- **bills**: month + branch filters; list bills (no, date, branch, total, status, LINE sent?); open → lines, resend LINE, mark paid, void (reverses stock); month totals per branch (to pay at month end).
- **buy**: suggestions per supplier: items with qty < min_qty or needed for ⚡/🔄 production plans (recipe × lots) − stock; packs rounded up; editable; PO text → LINE group of supplier (ck_sups.line_group_id) or copy/share;
  status sent; list POs; "รับของตามใบนี้" → recv prefilled.
- **menus**: product cards (photo, name, yield/lot, unit, stock, cost/unit avg & last lot); form: name, cat, yield_qty/unit, markup, target_qty/days, photo upload (bucket `product-images` like old app), method textarea,
  recipe lines: item picker + qty + unit select (base + convertible + packs) → shows base qty and cost at current avg prices; "ไม่ใช้แล้ว" toggle. Cost history per lot (from kc_productions).
- **items**: list/cards with stock, avg cost, last price, min; form: name, cat, base unit, buy unit + size, extra packs, count unit, supplier, min qty, photo; "ไม่ใช้แล้ว".
- **sups**: supplier cards; form: name, phone, credit days, order days, lead days, LINE group picker (from `line_groups` + "ใช้กลุ่มเดียวกับแอพนับสต๊อก" suggestion from `suppliers`), test send; items bought here.
- **acc**: month picker; revenue by branch; purchases; expenses list (add/edit/delete; recurring copies forward); COGS/gross/net; receivables by branch; overhead per unit suggestion + settings (overhead mode/value, markup) with explanation.
- **hist**: timeline filters (type: receive/produce/send/count/adjust; date range; search); rows link to details.
- **set**: branch LINE groups (per branch from JJBR stores), ck_sup_names, bill prefix, lookback days, refill days, language, SQL install card (copy `jjmk_kitchen2.sql` text embedded in a `<script type="text/plain" id="kcSql">`), app version.
- Permissions: `canKitchen()` = role owner/manager/supervisor/warehouse (same mapping as old). Pages acc/set/bills(mark paid/void) require `isAdminish()`; others any kitchen user. `_br` scope filters branches in send/bills/acc.

## Engineering conventions
- Source is split for parallel work: `k2/shell.html` (everything up to and including shared libs + i18n core + an `<!-- MODULES -->` marker + boot + PTR + closing tags) and `k2/mod_<name>.js` files;
  `k2/build.mjs` inlines each module (in the order listed in `k2/modules.json`) at the marker inside one `<script>` and writes `/home/user/JJ-PnL/jjmk-kitchen-new.html`.
- Shared API (defined in shell): `S` state {user, prof, items, recipes, recipeItems, sups, cfg, lineGroups, tab, …}; `sb` client; `db(fn)` wrapper (busy dot + error toast + returns data, throws on error);
  `loadAll()`; `uid(p)`; `num fmt fmtQ rnd2 rnd4 esc t dispName dispDate bizTodayISO addDays thDate toast confirm2 openModal closeModal`; `unitFactor(item,u) unitList(item) convert(item,qty,from,to)`;
  `itemById recipeById supById bomOf(recipe)` ; `pushMoves(moves)` (inserts kc_moves + ck_add_qty per ref); `avgCostItem/avgCostRecipe` helpers; `lineSend(groupId,text)`; `I18N.add(obj)`, `CSS.add(str)`;
  `VIEWS`, `PAGE_PERM`, `RENDER[tab]=function(el){…}`, `show(tab)`, components `pillBar(items,cur,fn)`, `dhead(txt)`, `card(title,body)`, `stepper(...)`, `pinnedBar(html)`.
- Each module file: `I18N.add({...})`, `CSS.add(`...`)`, `RENDER.<tab>=…`, its functions prefixed by module (e.g. `rc*` receiving, `mk*` make, `ct*` count, `sd*` send, `bl*` bills, `po*` buy, `mn*` menus, `it*` items, `sp*` sups, `ac*` acc, `hs*` hist, `st*` settings, `td*` today).
- Tests: Playwright + the in-memory Supabase stub (`k2/h.mjs` harness exporting `open(browser,{tab,db,user,vp,sa})` with fixtures in `k2/fixture.mjs` and a stub that supports from/select/eq/in/gte/lte/order/limit/insert/upsert/update/delete/rpc ck_add_qty and `functions/v1/line-order` capture).
  Each module ships `k2/t_<name>.mjs` printing `ALL PASSED (n)` or failures. Never touch production.
