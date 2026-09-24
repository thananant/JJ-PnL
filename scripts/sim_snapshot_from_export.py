# -*- coding: utf-8 -*-
"""แปลง CSV จาก sql/jjmk_export_products.sql (ฉบับเก่า 19 ก.ย.) → สแนปช็อตรูปแบบเดียวกับ sql/jjmk_export_sim.sql
   ใช้เฉพาะตอนยังไม่มีไฟล์จาก jjmk_export_sim.sql — กติกาซัพ (สั่งล่วงหน้า/จ่ายก่อนส่ง) ในไฟล์เก่าไม่มี → ใส่ 0/false
   ใช้: python3 scripts/sim_snapshot_from_export.py in.csv out.csv"""
import csv,sys,json,re
DOW={'จันทร์':'mon','อังคาร':'tue','พุธ':'wed','พฤหัสบดี':'thu','ศุกร์':'fri','เสาร์':'sat','อาทิตย์':'sun'}
CODE={'รัชดา':'JJRD','ลาดพร้าว':'JJLP'}
def parse(mode,txt):
    if mode=='วันสั่งตายตัว':
        sch={}
        for m in re.finditer(r'สั่ง(\S+?)\s*→\s*ส่ง(\S+)',txt or ''):
            a,b=DOW.get(m.group(1)),DOW.get(m.group(2))
            if a and b: sch[a]=b
        return 'fixed',json.dumps(sch,ensure_ascii=False),1
    m=re.search(r'ส่งอีก\s*(\d+)\s*วัน',txt or '')
    return 'any','{}',int(m.group(1)) if m else 1
rows=list(csv.DictReader(open(sys.argv[1],encoding='utf-8')))
nz=lambda v:'' if v in (None,'null') else v
with open(sys.argv[2],'w',encoding='utf-8',newline='') as f:
    w=csv.writer(f)
    w.writerow(['branch_code','branch_name','product_id','name','unit','dept','sup','rate_wk','rate_fri','rate_we',
                'sup_name','order_mode','schedule','lead_days','order_ahead','prepay','line_group_id','cutoff','min_cases','cycle_days'])
    for i,r in enumerate(rows):
        mode,sch,lead=parse(r['รอบสั่ง'],r['วันสั่ง → วันส่ง'])
        sup=r['ชื่อซัพ'] if r['ชื่อซัพ']!='(ไม่ระบุซัพ)' else ''
        w.writerow([CODE.get(r['สาขา'],r['สาขา']),r['สาขา'],'x%d'%i,r['ชื่อสินค้า (ชื่อนับ)'],r['หน่วยนับ'],r['แผนก'],sup,
                    nz(r['ใช้ต่อวัน จ-พฤ']),nz(r['ใช้ต่อวัน ศุกร์']),nz(r['ใช้ต่อวัน ส-อา']),
                    sup,mode,sch,lead,'0','false','',nz(r['เวลาตัดรอบสั่ง']),nz(r['ขั้นต่ำ (ลัง)']),nz(r['รอบทุกกี่วัน'])])
print('rows',len(rows))
