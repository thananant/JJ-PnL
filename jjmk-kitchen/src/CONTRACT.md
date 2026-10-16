# JJ Kitchen v2 — module contract (read with SPEC.md + shell.html)

Everything below is defined in `shell.html` (generated from `_shell_src.html` by `python3 _mkshell.py` — edit the src, never shell.html).
Modules are `k2/mod_<tab>.js`, inlined by `node build.mjs` (order = `modules.json`) into ONE `<script>` at `/*__MODULES__*/`,
output `/home/user/JJ-PnL/jjmk-kitchen-new.html`. A module is plain top-level JS (no `import`, no `</script`, no `<script>`), it shares the
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
