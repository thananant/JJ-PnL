# สร้าง sql/jjmk_order_seed.sql จากไฟล์รายการสินค้าโปรแกรมเก่า (xlsx 2 ชีท: รัชดา / ลาดพร้าว)
# ใช้: python3 scripts/mk_order_seed.py <ไฟล์.xlsx>   (ต้องมี openpyxl)
import sys, json, openpyxl, datetime
src=sys.argv[1]
wb=openpyxl.load_workbook(src,data_only=True)
BR={'รัชดา':'JJRD','ลาดพร้าว':'JJLP'}
DAY={'อา':0,'จ':1,'อ':2,'พ':3,'พฤ':4,'ศ':5,'ส':6}
def q(s): return "'"+str(s if s is not None else '').replace("'","''")+"'"
def numv(v): return 'null' if v in (None,'') else repr(float(v))
def sched(txt):
    t=str(txt or '').strip()
    if t.startswith('รอบทุก'):
        n=int(''.join(ch for ch in t if ch.isdigit()) or 15); return {'type':'cycle','every':n,'anchor':datetime.date.today().isoformat(),'lead':1}
    if t.startswith('สั่ง:'):
        days=sorted({DAY[x] for x in t[5:].split() if x in DAY}); return {'type':'days','days':days,'lead':1}
    return {'type':'any','lead':1}
sups={}; prods=[]
for ws in wb.worksheets:
    br=BR.get(ws.title.strip()); 
    if not br: continue
    rows=list(ws.iter_rows(values_only=True))[1:]
    for i,r in enumerate(rows):
        if not r[2]: continue
        sname=(r[8] or 'ไม่ระบุ').strip()
        sups.setdefault(sname, sched(r[9]))
        rate=None
        if r[12] is not None: rate={'g0':float(r[12]),'g1':float(r[13] or r[12]),'g2':float(r[14] or r[12])}
        nm=str(r[2]).strip()
        seen=[p for p in prods if p['branch']==br and p['name']==nm]
        if seen: nm=f"{nm} ({(r[8] or '').strip() or 'ซ้ำ'})"   # ชื่อซ้ำในสาขาเดียวกัน (ไฟล์เก่ามี) -> ต่อชื่อซัพให้แยกกัน
        prods.append(dict(branch=br,name=nm,bill=r[3] or '',en=r[4] or '',lo=r[5] or '',my=r[6] or '',dept=r[1] or '',unit=r[7] or '',
            sup=sname,pack=r[15],pack_unit=r[16] or '',step=r[17],order_unit=r[18] or '',rate=rate,safety=r[10],mx=r[11],sort=int(r[0] or i)))
out=[]
out.append(f"-- ============================================================\n-- JJ สั่งของ · seed ซัพ+สินค้าจากโปรแกรมเก่า (สร้างโดย scripts/mk_order_seed.py {datetime.date.today()})\n--   รันหลัง jjmk_order_setup.sql · รันซ้ำได้ (สินค้าเดิม = อัปเดตข้อมูลอ้างอิง ยกเว้น active/safety_days ที่ตั้งในแอพ · ซัพเดิม = ไม่ทับรอบส่งที่ตั้งไว้แล้ว)\n--   วันส่งทุกซัพตั้งต้น 'ส่งอีก 1 วัน' (lead_ok=false) → ไปเช็ค/แก้ในแอพ หน้าตั้งค่า > ซัพ ก่อนใช้จริง\n-- ============================================================")
out.append("insert into ord_suppliers(name,sched,sort) values")
out.append(",\n".join(f"  ({q(n)},{q(json.dumps(s,ensure_ascii=False))}::jsonb,{i})" for i,(n,s) in enumerate(sups.items())))
out.append("on conflict (name) do nothing;")
out.append("insert into ord_products(branch,name,bill_name,name_en,name_lo,name_my,dept,unit,supplier_id,pack_qty,pack_unit,order_step,order_unit,rate,safety_old,max_old,sort) values")
vals=[]
for p in prods:
    vals.append(f"  ({q(p['branch'])},{q(p['name'])},{q(p['bill'])},{q(p['en'])},{q(p['lo'])},{q(p['my'])},{q(p['dept'])},{q(p['unit'])},(select id from ord_suppliers where name={q(p['sup'])}),{numv(p['pack'])},{q(p['pack_unit'])},{numv(p['step'])},{q(p['order_unit'])},{('null' if p['rate'] is None else q(json.dumps(p['rate']))+'::jsonb')},{numv(p['safety'])},{numv(p['mx'])},{p['sort']})")
out.append(",\n".join(vals))
out.append("""on conflict (branch,name) do update set
  bill_name=excluded.bill_name, name_en=excluded.name_en, name_lo=excluded.name_lo, name_my=excluded.name_my,
  dept=excluded.dept, unit=excluded.unit, supplier_id=excluded.supplier_id,
  pack_qty=excluded.pack_qty, pack_unit=excluded.pack_unit, order_step=excluded.order_step, order_unit=excluded.order_unit,
  rate=coalesce(ord_products.rate,excluded.rate), safety_old=excluded.safety_old, max_old=excluded.max_old, sort=excluded.sort;
-- ตรวจผล
select branch, count(*) as products, count(*) filter (where rate is null) as "ไม่มีอัตราใช้" from ord_products group by branch order by branch;
select count(*) as suppliers, count(*) filter (where not lead_ok) as "ยังไม่ยืนยันวันส่ง" from ord_suppliers;""")
open('sql/jjmk_order_seed.sql','w',encoding='utf-8').write("\n".join(out)+"\n")
print('suppliers',len(sups),'products',len(prods),'-> sql/jjmk_order_seed.sql')
