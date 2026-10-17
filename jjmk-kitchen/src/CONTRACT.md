# JJ Kitchen v2 — module contract (read with SPEC.md + shell.html)

Everything below is defined in `shell.html` (generated from `_shell_src.html` by `python3 _mkshell.py` — edit the src, never shell.html).
Modules are `k2/mod_<tab>.js`, inlined by `node build.mjs` (order = `modules.json`) into ONE `<script>` at `/*__MODULES__*/`,
output `/home/user/JJ-PnL/jjmk-kitchen.html`. A module is plain top-level JS (no `import`, no `</script`, no `<script>`), it shares the
global scope with the shell and every other module → **prefix all your top-level names** (functions, consts, lets) with your module prefix.
`new Function(src)` is run on each module and on the whole built script: a duplicate top-level `const/let` anywhere fails the build.

| tab | prefix | tab | prefix | tab | prefix |
|---|---|---|---|---|---|
| today `td*` | recv `rc*` | make `mk*` | count `ct*` | send `sd*` | bills `bl*` |
| buy `po*` | menus `mn*` | items `it*` | sups `sp*` | acc `ac*` | hist `hs*` · set `st*` |

## 1. Registering a tab
```js
I18N.add({th:{rc_title:'รับของ'}, en:{rc_title:'Receive'}, lo:{rc_title:'ຮັບເຄື່ອງ'}, my:{rc_title:'ပစ္စည်းလက်ခံ'}});   // every UI string, 4 langs
CSS.add(`.rc-line{...}`);                                                   // module CSS (prefix selectors)
RENDER.recv = function(el){ el.innerHTML = dhead('📥 '+t('nav_recv')) + ...; };  // called by show('recv') with the <section id="view-recv">
```
`show(tab)` = switch + persist (`localStorage.jjck_tab`) + calls `RENDER[tab](el)`; `rerender()` = `show(S.tab)`. `show()` already blocks
`acc`/`set` for non-admins (`PAGE_PERM`) and shows a placeholder for tabs with no RENDER. To re-draw after a save call your own render
or `rerender()`. Modal/pinned-bar state is yours to restore. Never render into another tab's section. `setBadge('send', n)` sets the
🚚 badge on the tab + sidebar (ids `#tbSend`/`#bdSend`); other tabs have no badge element.

## 2. State `S` (filled by `loadAll()` at boot; call `await loadAll()` + `rerender()` after bulk changes)
```
S.user {id,name}          S.prof {username,name,role:'owner'|'manager'|'warehouse',brScope:null|['JJRD'],brRaw,apps,kitchenPerm}
S.items[]  ck_items (deleted_at null, order sort,name)       S.recipes[] ck_recipes          S.recipeItems[] ck_recipe_items
S.boms {recipe_id:[lines]}   S.sups[] ck_sups   S.cfg (cfgClean of ck_settings.kc_cfg)   S.lineGroups[] {group_id,name}
S.branches[] [{code,name,short,stk,color}] = store branches the user may see (JJBR ∩ _br)   S.branchesAll[] all stores
S.tab   S.loaded   S.booted   S.kcSql (false = jjmk_kitchen2.sql not run → show sqlNeedBox())
```
`S.cfg` keys: `ck_sup_names[]`, `branch_line{code:groupId}`, `overhead_mode 'per_unit'|'pct'`, `overhead_value`, `markup_pct`, `bill_prefix`,
`refill_days`, `units[]`, `order_lookback_days`. Save with `await cfgSave({markup_pct:12})` (read-merge-write, returns the clean cfg).
Caches: mutate the row in `S.items`/`S.recipes` after you write it (pushMoves already keeps `qty` in sync).

## 3. Shared functions (exact signatures)
**Data** — `sb` supabase client · `await db(()=>sb.from(...)...)` → data (busy dot, toast on error, throws) · `sbAll(buildFn)` paginates 1000/page ·
`once(async fn)` ignores re-entrant calls (wrap save handlers) · `itemById(id) recipeById(id) supById(id) supByName(name)` ·
`bomOf(recipe|id)` → lines `[{...row, item, unit_disp, qty_base}]` (qty_base in the item's base unit, null if the unit is unknown) ·
`activeItems() activeRecipes()` (active!==false) · `branchName(code)` · `brStkId(code)` (stock-count branch_id) · `inBr(code) brScoped() brScopeTxt()` ·
`canKitchen() isAdminish()` · `supKey(name)` (= `nameKey`, lowercase/space-normalised).

**Stock** — `await pushMoves([{d?,kind,ref_kind:'item'|'recipe',ref_id,name?,qty(+/-),cost?,ref_table?,ref_id2?,note?}])`
inserts `kc_moves` (adds `by_name`, `d` = bizTodayISO) then `ck_add_qty` once per ref and updates the cached `qty`. Every stock change goes through it.
Kinds: `receive produce_in produce_out waste send adjust`.

**Costing** — `itemCost(it)` (avg_cost → last_price → price/buy_qty → null) · `avgCostItem(it,qtyBase,priceBase)` · `avgCostRecipe(r,qty,costUnit)` ·
`await applyItemReceipt(it,qtyBase,priceBase,d,qty0?)` writes `avg_cost/last_price/last_price_at` (call BEFORE pushMoves so the average uses the old qty · `qty0` = live pre-move qty if you have one) ·
`await applyRecipeLot(r,actualQty,costUnit,qty0?)` writes `avg_cost` + `unit_cost` (same rule) ·
`await refreshRows('item'|'recipe', ids)` re-reads qty/avg_cost/last_price(/unit_cost) of those rows into the cache (fail-soft → false) — **call it before every save/void/count apply** ·
`costAfterVoid(o,{avg,last,last_at},voidQty,voidPrice,later)` / `replayAfterVoid` / `unweighAvg` = cost after voiding a document (later = the same item's later docs `[{prev_qty,qty,price,d,…}]` · null = unknown → unweigh) → `{avg,last,last_at,fixes}` where `fixes` are the snapshots the later docs must be rewritten with ·
`await voidDone(refTable,refId2)` = a reversal move already exists (idempotent void) · `await pushMovesUndo(refTable,refId2)` reverses what the LAST pushMoves did (rollback of a half-saved doc) · `recipeCost(r,lots)` → `{items,overhead,extra,total,perUnit,yield,missing[]}` at current prices ·
`overheadFor(costItems,qty)` per cfg · `markupOf(r)` · `recipeUnitCost(r)` · `sellPrice(r)` = unit cost × (1+markup/100).

**Units** — `UNIT_STD` · `UNITS` · `packsOf(it)` → `[{u,q}]` (buy_unit first) · `unitFactor(it,u)` (1 u = ? base, null = unknown; `u` null = base) ·
`convert(it,qty,from,to)` · `unitList(it)` (base + packs + convertible std units + **the cfg.units that are convertible for this item** — an extra unit such as กระปุก shows in `allUnits()` but joins `unitList(it)` only once the item has a pack size for it) · `countUnitOf(it)` · `isMassVol(u)` ·
`unitOptions(list,sel)` `<option>`s · `allUnits()` · `trUnit(u)` · `trCat(c)` · `ITEM_CATS MENU_CATS EXP_CATS`.

**Format** — `t(key,vars)` · `dispName(row)` (i18n per LANG) · `esc(s)` (also escapes `'`) · `num(v)` · `fmt(n,dec)` · `fmtQ(n)` (≤4 dp) · `fmtI(n)` · `money(n)` ('฿1,234.50') ·
`moneyU(n)` (price per unit: ≥฿1 → 2 dp, below ฿1 → ≤4 dp — use it on send/bills/acc price columns) · `rnd2 rnd4` · `uid(prefix)` · `bizTodayISO()` (06:00 cut) · `todayStr()` · `addDays(iso,n)` · `ymOf(iso) ymNow() prevMonth(ym) nextMonth(ym) monthDays(ym)` ·
`dispDate(iso)` (พ.ศ. in th) · `dispMonth(ym)` · `thDate(iso)` (Thai always — LINE text) · `dispTime(ts)` · `methodSteps(note)` / `methodHtml(note)` (`#` head · `*` tip).

**UI** — `toast(msg,isErr)` (`isErr` = `true` red · `'warn'` amber — a successful save with something to know) · `openModal(html,cls?)` / `closeModal()` / `modalOpen()` (`MODAL_BACK=fn` to return to a parent form) ·
`await confirm2(msg,{ok,cancel,danger,html})` → boolean · `setBusy(bool)` · `zoomImg(url)` · `copyText(text)` · `hreg(fn)` → inline handler string
(`onclick="${hreg(el=>...)}"`) · `pillBar(items,cur,fn,{scroll,cls})` items `[{k,lb,n?,ic?,cls?}]`, `fn` = global fn name string or `fn(k)` ·
`dhead(txt,extra?)` · `card(title,body,{sp,cls,id,onclick})` · `stepper(id,val,{step,min,max,unit,on,big,ph})` → `− [input] ＋` (`on` = name string or `fn(value,id)`; the input fires `input`/`change`) ·
`stepBump(id,±1)` · `pinnedBar(html|null, viewEl?)` fixed bottom bar for the current tab (removed automatically when leaving the tab) ·
`searchBox(id,fn,ph)` · `emptyBox(txt)` · `fld(label,innerHtml)` · `selOpts(list,sel,lbOf)` · `stPill(st,lb)` · `sqlNeedBox()` · `itemOptionsHtml(sel) recipeOptionsHtml(sel)` ·
`thumbHtml(row,icon,cls)` · `pickImage('item'|'recipe', id|null, after(url))` · `await uploadPhoto(file)` → url (bucket `product-images`) ·
`lineSend(groupId,text)` (POST `/functions/v1/line-order` `{to,text}`, throws) · `lineShare(text)` · `lineGroupsLoad()` · `lgName(gid)` · `lgOptions(sel)` · `lineTextBox(text)` (copy + open LINE) ·
`LS.get/set/del` · `LANG` · `setLang(l)`.

Rules: all strings via `t()`, 4 languages · escape every DB value with `esc()` — **never inside a JS string literal in `onclick="…"`** (use `data-*` + `this.dataset.x`, or `hreg`) · image URLs through `imgOk()` · inputs ≥16px (default) · buttons ≥44px (`.btn`, `.btn.sm2`, `.pill`, `.hbtn`, `.skstep button` already are) ·
Thai staff words: รับของ/ทำของ/ส่งของ/สั่งของ/ส่วนผสม/นับสต๊อก (no BOM/PO/batch) · admin-only actions: check `isAdminish()` · branch data: filter with `inBr()`.
CSS classes available: `.card .card h3 .dhead .pills .pill(.on .add .needc) .bdg .srch .igrid .icard(.skcard .cnt .low .tap) .ithumb .iname .isub .skstep .skfoot .outb
.pickgrid .pick(.on) .bq .pinbar .kpis .kpi(.hero .tap) .kpi-v .bigacts .bigact(.hot .ok) .btn(.gh .dk .ok .sm2 .big) .chip(.ok .bad .mid .warn .blue) .stpill .st-* .steps .st
table.t td.n tr.tot tr.tap .twrap .rowline .mthumb .fld .md2 .grid2 .grid3 .hintbox .okbox .badbox .note .empty .spin .mut .sm .xs .b .right .red .green .amber .row .grow .tmsteps`.

## 4. Test harness (`k2/h.mjs`, Playwright, in-memory Supabase — never production)
```js
import { launch, open, T, ev, DB, sleep, DEVICES, probe, clean, HDR, noHScroll, viewTxt, modalTxt, toastTxt, D, addD, fixture, HASH, STK, GROUPS } from './h.mjs';
const browser = await launch();
const { page, errs, line, ctx } = await open(browser, { tab:'recv', user:'boss', vp:{width:390,height:844}, sa:{top:47,bottom:34,left:0,right:0}, touch:true, lang:'th', db: fixture(), cfg:{} });
T.eq(await ev(page, () => S.tab), 'recv', 'opens on tab');  … ; await ctx.close(); await browser.close(); process.exit(T.done());   // prints ALL PASSED (n)
```
`open()` serves the BUILT file (`BUILT`, or `path`/`html`), logs in through `jjsso_ticket` (users: `boss` owner · `mgr` manager · `staff` warehouse · `rd` staff with `_br:'JJRD'` ·
`nokitchen` no rights · `null` = no ticket → login card), waits for `S.booted`, persists `window.__DB` across `page.reload()`.
In-page: `window.__DB[table]` (mutable), `window.__LOG` (queries), `window.__LINE` (captured line-order posts `{url,body,headers}`), `window.__UPLOADS`, `window.__opened` (window.open url).
`cfg` (stub options): `{noTables:['kc_moves'], failTables:[], noCols:{ck_items:['avg_cost']}, failOps:[{t:'kc_moves',op:'insert'}], noRpc:true, lineFail:true, uploadFail:true}`.
Stub supports from().select/eq/neq/in/gte/lte/gt/lt/like/ilike/is/not/or/order/limit/range/single/maybeSingle/insert/upsert(onConflict)/update/delete (+`.select()` after writes), rpc ck_add_qty, storage.
Fixture (`fixture.mjs`): 12 items (mass/volume/count, packs), 4 recipes (`rc01` น้ำจิ้มสุกี้ 10 ถุง · `rc02` หมูหมัก 5 กก. · `rc03` เค้กกล้วยหอม 6 ก้อน (no lot yet) · `rc04` น้ำซุป 20 ลิตร),
3 suppliers (`sp01` ตลาดไท has a LINE group), kc_cfg (overhead per_unit 2, markup 10, JJRD group set, JJLP none), stock-count `products`/`stock_receipts` orders for JJRD+JJLP today (`sup` 'ครัวกลาง' incl. one with spaces) + yesterday + 9 days ago, kc_expenses this month.
`probe(page, sa, atEnd, HDR)` + `clean(r)` = the 15-device safe-area rule (nothing under status bar/home bar/notch, no overlapping header buttons, no horizontal scroll).
Dialogs auto-accept (`confirm`) — prefer `confirm2()` and click `#cfmOk`/`#cfmNo` in tests.

## 5. Build / run
`python3 _mkshell.py` (only after editing `_shell_src.html`) → `node build.mjs` → `node t_shell.mjs` (shell smoke, must stay green) → `node t_devices.mjs` (15-device matrix on today/set) → `node t_<tab>.mjs` (yours).
For your own tab's device sweep: `import { sweep } from './t_devices.mjs'; await sweep(browser, ['recv'], async (page, v) => { /* fill the page */ });` then `T.done()`.
`node t_sql.mjs` validates `jjmk_kitchen2.sql` with PGlite (run twice + anon usage). The SQL text is embedded in the built file as `<script type="text/plain" id="kcSql">` (settings page copies it).

## 6. Integrator notes (2026-10-16, after phase 1)
- Tabs without a `RENDER` (send · bills · buy · acc until phase 2) show a friendly **"มาในรอบถัดไป"** card (`renderPlaceholder`: 🚧 + `soon_title/soon_body/soon_<tab>/soon_back`, 4 languages,
  `.card.soon`, back button → today). It is not an error state; `today`'s 🚚/⚠️ cards may link there. Adding `RENDER.send` etc. replaces it automatically. `not_built` now holds the same text.
- `pillBar(items,cur,'fnName')` / `stepper(id,v,{on:'fnName'})` with a **string** handler are now attribute-safe (`callOf` escapes `JSON.stringify(arg)` with `esc()`), so keys with Thai/quotes work. Closures still work as before.
- Desktop sidebar spacing was tightened so all 13 pages + the ⚙️ footer fit a 1280×800 window (still `overflow-y:auto` for shorter ones).
- `node t_integ.mjs` = integrator seams (byte-identical blocks, placeholders ×4 langs, refresh keeps tab, language switch re-renders all 9 built tabs, SQL card, today links,
  recv→make costing seam, hist→detail seams, 15-device sweep on placeholder tabs, desktop sidebar). Keep it green together with `t_shell` when touching the shell.
- Cosmetic, deliberately left: `mnMoney`/`mkMoney` print cost per unit with up to 4 dp (e.g. ฿43.3169) because t_make/t_master assert those exact strings; phase-2 pages should use `moneyU`.


## 7. Fixer notes (2026-10-16, round 1 — after the verifiers)
- **Write order + rollback**: every document save is header → lines → cost → `pushMoves`; any failure runs the module's `*Rollback` (restore cost snapshot, `pushMovesUndo`, delete lines + header)
  and toasts `*_not_saved` (red) — nothing half-saved, the form stays filled, a retry never duplicates. Count apply re-reads the live qty first (`ctRefreshLive`): delta = counted − LIVE.
- **Snapshots**: `kc_receipt_lines.prev_avg/prev_last/prev_last_at/prev_qty` and `kc_productions.prev_avg/prev_unit_cost/prev_qty` (in the SQL now). Void of the LATEST doc restores them;
  void of an OLDER doc replays the later docs from the snapshot (`costAfterVoid`) and rewrites their snapshots (`rcFixLater`/`mkFixLater`) so any void order ends consistent. No `prev_*` columns (legacy table) = cost kept + amber warning.
- `ck_add_qty` now rounds to 4 dp, rejects an unknown `p_kind`, and a null delta reads the qty back (stub mirrors it).
- `openModal` adds `.on` before resetting `scrollTop` (hidden boxes ignore it); `closeModal` resets too. `body.haspin` is set while a pinned bar is on screen → `#toast` moves above it.
- Count grid = one card per row ≤640px (`.ctsec .igrid`), `.skstep input{min-width:58px}`; `.pill`/`.btn.sm2`/`.hbtn` ≥44px; `.modal.task` starts below the status bar.
- Item base unit is locked (`itLockWhy`) while the item has stock, recipe lines or ledger history.
- Deliberately left (asserted as 4-dp strings by v_e2e [B]/[E] and t_make/t_master): `mkMoney`/`mnMoney` per-unit costs with up to 4 dp.

## 8. Fixer notes (2026-10-16, round 2 — after the r2 verifiers)
- **Recipe lines must always convert**: `bomOf()` gives `qty_base:null` when a line's unit no longer converts to the item's base unit. 🍳 keeps such a line, flags it (`MK.lines[i].bad_unit`, `mkLineCalc(i).ubad`,
  red "⚠ แปลง {u} → {b} ไม่ได้ — แก้ที่ 📖", inputs disabled, excluded from `mkCalc()` and listed in `mkCalc().ubad`) and **`mkValidate()` refuses the save** (`mk_unit_bad_q`). Never plan/use 0 silently.
  `mkLinesSync()` re-derives the flag on every repaint, so a recipe fixed on another device converts again in the open form.
- **🥬 cannot drop a unit a recipe uses**: `itPackUsed(id,tmp)` (via `itRecipeUnits(id)`) — removing/renaming a pack or buy unit that any `ck_recipe_items.unit` of that item needs → `it_pack_used` toast, nothing written.
  Changing the SIZE is fine. The form lists the units recipes use (`it_pack_inuse`). A pack/buy unit the standard table already converts (กรัม/ขีด/กก./มล./ลิตร/โหล/ชิ้น) must match the standard factor (`itStdBad`, `it_pack_std`).
- **📖 lines write path is delete-first** (`mnWriteLines`): delete fails → nothing changed (`mn_lines_fail`); insert fails → the old rows are re-inserted with their ids; if that fails too the cache is emptied and the user is told to tap 💾 again (`mn_lines_lost`, draft kept).
  After a successful write `S.boms[rid]` is re-read from the table. Never insert-then-delete (a failed delete doubled every ingredient).
- **📖 yield_unit lock** (`mnLockWhy` = `itLockWhy` for products): stock ≠ 0 · any `kc_moves`/`kc_productions` for the recipe · any `kc_links` row → `#mnYu` disabled with the reason, `mnYuChange`/`mnSave` refuse and snap the draft back. `mnHistCheck` fills `_hist/_link` asynchronously.
- 🍳 lots stepper: `mkLotsChange` returns early when the value did not change (the `change` fired on blur used to re-render `#mkLines` and destroy the input the user had just tapped) and otherwise updates `.pv`/`#mkU*` in place. ใช้จริง/เศษ inputs `onfocus="this.select()"`.
- `pinnedBar` content from DB values goes through `esc()` (`mkBarTxt`). ⚙️ extra unit names refuse `< > " ' & \` and > 24 chars (`st_unit_bad`).
- `toast()` measures the pinned bar's real height (`style.bottom = h+8px`) — a two-line bar on 280px screens no longer overlaps it. Sidebar compacts at `≥900px and ≤900px tall` (all 13 pages + footer without scrolling on iPad landscape).
- 📜 history: `HS_CAP` (a table hit the 400-row limit in the range) → `hs_load_cap` banner.
- Login card: the shared JJ Login block renders `.jjlg-in` (fixed, `overflow-y:auto`, card `margin:auto`) inside `#loginOv` — that wrapper is the scroll container on landscape/short screens; tests must measure `card.parentElement`, not `#loginOv`.
- Stub: `cfg.failOps` entries accept `n` (fail only the next n calls) for one-shot network failures. Regression tests: `t_fix2.mjs` (71).

## 9. Integrator notes (2026-10-17, phase 2 — send · bills · buy · acc are in; no placeholder tab is left)
- **One open-order calculator for ☀️ today, 🚚 send and 🍳 make**: `sdCalcGroups({sr,dl,dll}, branches)` (mod_send.js, pure) → `{groups, ordered, sent, need, unlinked, lines}`.
  Orders = `stock_receipts` (sup ∈ `cfg.ck_sup_names`, order_date ≥ today − lookback; the real table has **no `id`** — line key `rid` = `branch_id|order_date|product_id`, lines sorted by `cat_label` → name (Thai) → product_id; `sbstub2.js` `SCHEMA` rejects unknown columns like PostgREST) minus what was delivered **line by line** (`kc_delivery_lines` of non-void `kc_deliveries`,
  keyed `branch|order_date|stk_product_id`, name fallback for legacy rows). A partial send keeps the remainder open (⏳ ค้างส่ง) on every page; a delivery with every line
  `sent = ordered` closes the order. `tdOpenOrders(sr,dl,dll)` (today), `sdCalc()` (send, + sequential stock allocation) and `mkOrdersCalc()` (make → `MK_ORD.ordered/sent`)
  all call it, so today's 🚚/⚡ counts, the send badge, make's ⚡ list and send's ขาด always agree (`t_integ` [7] asserts it before/after a partial send and after a void).
  make passes `S.branchesAll` (production is kitchen-wide), today/send pass `S.branches` (`_br` scope). Never re-implement the subtraction in a module.
- **Badge 🚚 on any tab**: the shell dispatches `document.dispatchEvent(new CustomEvent('kc:booted'))` after the first `show()`; mod_send listens and runs
  `sdLoad({noRefresh:true})` (orders only, no `refreshRows`) when the app boots on a tab other than today/send. A later full `sdLoad()` waits for a quiet load, then reads live stock.
- **Cache invalidation**: `sdSend` (after the moves) and `blAfter` (paid/unpaid/void) set `MK_ORD.at=0` so 🍳 re-reads orders on its next render (it otherwise caches 60 s);
  `blAfter` also runs `sdLoad()` so the badge and the reopened order are current even when 🧾 is the active tab.
- today's cards carry state: ⚡ → `mkSetPill('urgent')` + `show('make')`, 🔄 → `refill` pill (`tdGo(key,tab)`); 🚚 → send, ⚠️ → buy, 📋 → count, KPIs → recv/make/bills.
- Tests updated for phase 2: `t_shell` [3] (send renders the module, every tab has a RENDER), `t_count` [8] (fully delivered seed carries its lines), `v_e2e` [K] (same),
  `t_integ` rewritten (390 checks: modules ×4 langs, permissions, reload, language switch on all 13 tabs, SQL card on all tabs, today↔send↔make seam incl. partial send + void,
  boot badge incl. `_br` user, recv→make costing, hist→detail incl. send→`blDetail`, 15-device sweep on send/bills/buy/acc with data, desktop sidebar).
  Screenshots: `k2/shots_p2/` (390: today, send, send confirm/done/partial, bill detail, bills, buy, acc · 1280: send, acc).

## 10. Fixer notes (2026-10-17, phase 2 round 1 — after the r3 verifiers)
- **🚚 never computes from half the data**: `sdLoad` keeps `SD.raw`/`SD.groups` from the last good read when `stock_receipts`/`kc_deliveries`/`kc_delivery_lines` cannot be read (`SD.ok=false`);
  `sdPaint` then shows only the ⚠ banner + ⟳ and `sdSend` refuses with `sd_noread`. An unreadable `kc_delivery_lines` used to come back as "nothing delivered" → the same order could be billed and deducted twice.
  Only with `S.kcSql===false` **and** a table that does not exist (`sdTblGone`: 42P01/PGRST205 — *not* permission denied) do `kc_deliveries`/`kc_delivery_lines` count as empty (nothing could have been delivered; billing is blocked by `sd_sql_block` anyway).
  🍳 does the same (`mkOrdersCalc(…, ok)` → no ⚡ from partial data, `mk_orders_na` banner).
- **No price = cannot send**: `sdCalc` sets `l.noPrice` (`sdPriceOf(l)==null`) → `sent` forced 0, no stepper (⛔ chip + 📖 button), `sdSetSent` ignores it, the ✅ button only renders when a priced linked line exists,
  `sdSend` refuses a forced quantity by name (`sd_no_price`). The bill keeps the line as `sent 0 / unit_price null` (ค้างส่ง). Rule: branch price = actual lot cost — never a silent ฿0 line.
- **Bill price rounding**: `sdPriceOf` rounds to 2 dp from ฿1 (≤4 dp below ฿1, like `moneyU`) so the printed `qty × price = amount` on the LINE bill; `kc_delivery_lines.unit_price` stores that rounded price. Tests' independent arithmetic (`v_e2e3` `price()`) follows the same rule.
- **Line names**: `kc_delivery_lines.name` = the product name the BRANCH ordered (`l.name`), `recipe_id` = the kitchen product; LINE text/ค้างส่ง print the branch name, 🧾 detail shows "🍳 <kitchen name>" under it when different. `sdCalcGroups` already keys by `stk_product_id` (name fallback for legacy rows).
- **LINE delivered but status write failed** (send + buy): the update is retried once; if it still fails the device remembers it (`LS jjck_line_ok` / `jjck_po_lineok` `{id:iso}`, 3 days) → amber toast, honest state in the done dialog / 🧾 detail (`bl_line_local`) / 🛒 detail (`po_line_local` + ✅ ส่งแล้ว = `poMarkSent`),
  resend asks first (`bl_resend_q` / `po_resend_q`); a draft PO the supplier already received counts as incoming (`poIsIncoming`) so 🛒 does not suggest ordering it again.
- **Void needs the moves**: `blVoidDone` returns `null` when `kc_moves` cannot be read and `blVoid` aborts with `bl_moves_noread` (never guess the reversal). The lines fallback (bill with no moves at all) converts branch units with the link factor (`tdLinkOf(l.name)`).
- **`_br` on 🧾 write paths**: `blScopeOk(x)` (= `inBr(x.branch)` + `bl_br_deny` toast) guards `blDetail/blResend/blPaid/blUnpaid/blVoid`. ☀️ today's "ส่งสาขาวันนี้" KPI is `inBr`-filtered like the orders card.
- **Shell**: `.btn` is Prompt (`font-family:var(--fh)`), `#toast` has `pointer-events:none` and `.err/.warn` toasts wrap (`white-space:normal`), `lineTextBox` textarea is 16px, `#sbUser a` has a 44px hit area; 🚚 last card gets 72px bottom room on phones.
  🧾 sums rows ≥44px; at ≤339px the bills-count column (`.c-n`) is hidden on 🧾/💰 tables.
- 💰 markup field: only `^\d+(\.\d+)?$` (comma → dot, ≤1000) is saved; anything else → `ac_mk_bad`, value untouched. CSV cells starting with `= + - @ \t \r` get a leading `'`.
- 🍳 ⚡ card chip says why the suggestion exceeds the shortfall: `แนะนำ n รอบ · ถึงที่ควรมี q` (`mk_sugg_tgt`).
- Verifier suites updated to the fixed behaviour: `v_review3_send` [C][D][E][G][I][J][K][L][N], `v_review3_buy` [B], `v_review3_acc` [A][E]; `v_e2e3` price helper + sanity numbers; `t_send` line names. Screenshots: `k2/shots_fx1/`.

## 11. Fixer notes (2026-10-17, phase 2 round 2 — after the r4 verifiers)
- **🚚 sdSend re-checks everything AFTER the ✅ dialog** (the dialog can stay open while another device delivers / produces / bills): `sdStockOk(L,rids)` (= `refreshRows` → **false = refuse with `sd_live_fail`**, never the cached stock · then need > have → `sd_stock_short`) runs before *and* after the dialog;
  then `sdRead()` (the read part of `sdLoad`, no state) → `sdCalcGroups` → the group's `sdSig` (pid · name · remaining) and the re-priced rows (`sdRowsOf`) must equal what was confirmed, otherwise `sd_changed` + repaint, no bill;
  the bill number is read again after the dialog, and the header insert (`sdInsertHead`) retries ≤3× on **23505** with a fresh number. Nothing is written until all of that passed — `v_review3_r2_send` [A1][A2][A3], `t_fix3` [1][2][3].
- **SQL**: `kc_deliveries_bill_no_uq` / `kc_pos_po_no_uq` partial unique indexes (null allowed), created in a `do` block that only *notices* if duplicates already exist. The stub enforces both (`sbstub2.js` insert → 23505). `t_sql` asserts them.
- **🍳 never ⚡/🔄 from half the data**: `mkLoad`'s `get()` returns `null` for every read error (42501 permission, 42703 column, PGRST204, network…) — only a table that truly does not exist **while `S.kcSql===false`** counts as empty (`sdTblGone`). `stock_receipts` unreadable → `MK_ORD.ok=false` too. `mkOrdersCalc(…,ok,dailyOk)` computes the 14-day average only from a complete delivery read. `t_make` [K9b], `t_fix3` [4], `_v4_probe_make`.
- **Refill average in KITCHEN units**: `tdLineFactor(l)` (mod_today) = the `kc_links` factor of the line's branch name when it points at the line's `recipe_id`, else 1. `tdAvgSent` (☀️), `MK_ORD.daily` (🍳) and `blVoid`'s lines fallback all use it — a 0.5-factor line of 6 ถุง counts as 3 กก. `v_e2e3` [F], `t_fix3` [7]. `TD_LINKS` on ☀️ is kept from the last good read when `kc_links` cannot be read (like 🚚/🍳).
- **🛒 mirrors 🚚**: `poListLoad` sets `PO_LIST_OK=false` when `kc_pos` **or** `kc_po_lines` cannot be read (last good list kept); `poCalc` then returns no groups (`listOk:false`), `poPaint` shows `po_list_noread` + `po_list_noread_h` + ⟳ (`po_reload`) only, `poSend` / the manual "✅ ส่งแล้ว" / `poSave` / `poNextNo` refuse. `poSave` returns `{id,po_no,text}` and retries ≤3× on 23505 (reloads the list, next number, re-renders the text). `t_buy` [9] s5 updated to this behaviour; `v_review3_r2_buy` [A][B], `t_fix3` [5].
- **🧾 month taps**: `blLoad` is sequence-guarded (`BL_SEQ` + the month it was started for) and resolves `true` only when its result was applied; `RENDER.bills` paints on `true`. `v_review3_r2_bills` [A].
- **`numIn(v)`** (shell): `"1,5"` / `"1,25"` (comma + 1–2 digits) = decimal comma → 1.5 / 1.25; `"1,500"` stays 1,500. `stepper` handlers, `stepBump`, 🚚 ส่ง (`sdSetSent`) and 🛒 packs (`poSetPacks`) use it; `num()` is unchanged. `t_fix3` [6].
- Regression suite for this round: `t_fix3.mjs` (+ the verifiers' `v_review3_r2_*.mjs` now all green). Screenshots: `k2/shots_fx2/`.

