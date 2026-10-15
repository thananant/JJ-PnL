// smoke_k_interval: ครัวกลาง (jjmk-kitchen.html) — ซัพโหมด "สั่งทุก N วัน" (order_mode='interval') ในสูตร br* ที่พอร์ตจากแอพนับสต๊อก
// วันขาย cd = 2026-10-15 (พฤ) · อัตราใช้ทุกสินค้า: จ–พฤ 1 · ศ 2 · ส–อา 3 · ทุกสินค้าอยู่แผนก "ครัวกลาง" (= ของครัว)
// ซัพ: IV3 (interval ทุก 3 วัน ส่ง +4) · IV15 (interval cycle_days null → 15 วัน ส่ง +2) · ANY (ทุกวัน +1) · FIX (พฤ→ส)
// JJRD: IV3 สั่งล่าสุด 10-13 → รอบหน้า 10-16 = ยังไม่ครบ · IV15 มีแค่ใบ 06-01 (เกิน 120 วัน) = ไม่เคยสั่ง → ครบ (เริ่มนับรอบ)
// JJLP: IV3 สั่ง 10-12 (+ใบของวันขาย 10-15 ต้องไม่นับ) → 10-15 ครบ · IV15 สั่ง 10-01 → รอบหน้า 10-16 (ค่าตั้งต้น 15 วัน) = ยังไม่ครบ
// คิดมือ:
//   JJRD IV15 (ครบ): ของถึง 10-17 · ชุดหน้า 11-01 → ครอบคลุม 15 วัน 10-17..10-31 = 3+3+1+1+1+1+2+3+3+1+1+1+1+2+3 = 27 ·
//        ระหว่างรอ 10-16 (ศ) = 2 · นับได้ 0 → เหลือ 0 → ต้องส่ง 27
//   JJLP IV3 (ครบ): ของถึง 10-19 (จ) · ชุดหน้า 10-22 → ครอบคลุม 3 วัน จ+อ+พ = 3 · ระหว่างรอ 10-16..10-18 = 2+3+3 = 8 ·
//        กำลังมา: ใบ 10-12 ×5 ถึง 10-16 (> cd และ < 10-19) = 5 · นับได้ 4 → เหลือ 4−8+5 = 1 → ต้องส่ง 3−1 = 2
//   ANY: ถึง 10-16 ครอบคลุม 1 วัน (ศ) = 2 · นับได้ 1 → ต้องส่ง 1 · FIX: ถึง 10-17 ชุดหน้า 10-24 = 3+3+1+1+1+1+2 = 12 · รอ 2 · นับ 0 → 12
// + ใบสั่งสะกดชื่อซัพต่างตัวพิมพ์/ช่องว่าง ยังนับรอบได้ (ไม่กรอง in.sup ตรงตัว) · ไม่มีซัพ interval = ไม่ query วันสั่งล่าสุด
// + รอบยาวเกิน 31 วัน (IV45 = 90 · IV90 = 117 รวมวันขายดีที่เกิน +50 วัน) — คิดมืออยู่ที่ข้อ 6d
// + เทียบกับโค้ดครัวกลางก่อนแก้ (commit bed4816) ตอนไม่มีซัพ interval: ทุกแถวต้องเหมือนเดิมทุกตัวเลข
const fs=require('fs');
const {JSDOM}=require('jsdom');
const {execSync}=require('child_process');
const strip=h=>h.replace(/<script src="https?:[^"]*"><\/script>/g,'').replace(/<link [^>]*fonts\.g[^>]*>/g,'');
const RD='b19f0a17b4472',LP='b19f0a17b448212',CD='2026-10-15';

function mkDB(opt){
  opt=opt||{};
  const sup=[
    {name:'IV3',order_mode:'interval',cycle_days:3,lead_days:4,schedule:null,order_ahead:0},
    {name:'IV15',order_mode:'interval',cycle_days:null,lead_days:2,schedule:null,order_ahead:0},
    {name:'ANY',order_mode:'any',cycle_days:null,lead_days:1,schedule:null,order_ahead:0},
    {name:'FIX',order_mode:'fixed',cycle_days:null,lead_days:null,schedule:{thu:'sat'},order_ahead:0}];
  if(opt.noInterval)sup.forEach(x=>{if(x.order_mode==='interval')x.order_mode='any';});
  const P=(id,bid,sp,s)=>({id,branch_id:bid,name:'ของ '+id,unit:'ชิ้น',sup:sp,cat_label:'ครัวกลาง',dept:'ครัวกลาง',
    rate_wk:1,rate_fri:2,rate_we:3,sort:s,image_url:null,deleted_at:null});
  const C=(pid,bid,q)=>({id:pid+'c',product_id:pid,branch_id:bid,qty:q,out_of_stock:false,created_at:CD+'T20:00:00Z',count_date:CD});
  const R=(pid,bid,sp,od,q)=>({id:pid+od,product_id:pid,branch_id:bid,sup:sp,order_date:od,ordered:q});
  const V=opt.recvVar?{IV3:' iv3 ',IV15:'iv15'}:{};   // recvVar: ใบสั่งสะกดชื่อซัพต่างตัวพิมพ์/ช่องว่างจากสินค้า (แอพนับสต๊อกยังจับคู่ได้ด้วย supKey)
  const rs=s=>V[s]||s;
  const DB={
    suppliers:sup,
    products:[P('rA',RD,'IV3',1),P('rB',RD,'IV15',2),P('rC',RD,'ANY',3),P('rD',RD,'FIX',4),
              P('lA',LP,'IV3',1),P('lB',LP,'IV15',2),P('lC',LP,'ANY',3),P('lD',LP,'FIX',4)],
    stock_counts:[C('rA',RD,4),C('rB',RD,0),C('rC',RD,1),C('rD',RD,0),C('lA',LP,4),C('lB',LP,0),C('lC',LP,1),C('lD',LP,0)],
    stock_receipts:[R('rA',RD,rs('IV3'),'2026-10-13',6),R('rA',RD,'IV3','2026-10-14',0),R('rB',RD,'IV15','2026-06-01',9),R('rC',RD,'ANY','2026-10-14',3),
                    R('lA',LP,'IV3','2026-10-12',5),R('lA',LP,'IV3','2026-10-15',7),R('lB',LP,rs('IV15'),'2026-10-01',9)],
    ck_settings:[],ck_br_needs:[],cal_special_days:[]};
  if(opt.long){   // รอบยาวเกิน 31 วัน (JJRD): IV45 ทุก 45 วัน · IV90 ทุก 90 วัน · ส่ง +1 · ยังไม่เคยสั่ง · นับได้ 0 · วันขายดี พ 23 ธ.ค. (เกิน +50 วัน)
    sup.push({name:'IV45',order_mode:'interval',cycle_days:45,lead_days:1,schedule:null,order_ahead:0},
             {name:'IV90',order_mode:'interval',cycle_days:90,lead_days:1,schedule:null,order_ahead:0});
    DB.products.push(Object.assign(P('rE',RD,'IV45',5),{rate_wk:2,rate_fri:2,rate_we:2}),Object.assign(P('rF',RD,'IV90',6),{rate_wk:1,rate_fri:1,rate_we:2}));
    DB.stock_counts.push(C('rE',RD,0),C('rF',RD,0));
    DB.cal_special_days.push({id:1,name:'วันขายดีไกล',day_from:'2026-12-23',day_to:'2026-12-23',order_rate_group:2,order_branches:null,cancelled:false});
  }
  return DB;
}

/* supabase-js ปลอม: from(t).select().eq/gte/lt/in/...order().range() → {data,error} (กรองจริงตามเงื่อนไข + คืนเฉพาะคอลัมน์ที่ select) */
function mkSupabase(DB,calls,opt){
  opt=opt||{};
  class Q{
    constructor(t){this.t=t;this.f=[];this.q=[];this.ord=[];this.rg=null;this.cols='*';this.op='select';this.one=false;}
    select(c){if(this.op==='select')this.cols=c||'*';return this;}
    insert(){this.op='insert';return this;} upsert(){this.op='upsert';return this;} update(){this.op='update';return this;} delete(){this.op='delete';return this;}
    _f(tag,fn){this.q.push(tag);this.f.push(fn);return this;}
    eq(c,v){return this._f('eq.'+c+'='+v,r=>String(r[c])===String(v));}
    neq(c,v){return this._f('neq.'+c+'='+v,r=>String(r[c])!==String(v));}
    gte(c,v){return this._f('gte.'+c+'='+v,r=>r[c]!=null&&String(r[c])>=String(v));}
    gt(c,v){return this._f('gt.'+c+'='+v,r=>r[c]!=null&&String(r[c])>String(v));}
    lte(c,v){return this._f('lte.'+c+'='+v,r=>r[c]!=null&&String(r[c])<=String(v));}
    lt(c,v){return this._f('lt.'+c+'='+v,r=>r[c]!=null&&String(r[c])<String(v));}
    in(c,a){return this._f('in.'+c+'='+JSON.stringify(a),r=>a.map(String).includes(String(r[c])));}
    is(c,v){return this._f('is.'+c+'='+v,r=>v===null?r[c]==null:r[c]===v);}
    not(c,op,v){return this._f('not.'+c+'.'+op+'='+v,r=>op==='is'&&v===null?r[c]!=null:true);}
    ilike(){return this;} like(){return this;} or(){return this;} filter(){return this;} match(){return this;} contains(){return this;}
    order(c,o){this.ord.push([c,!(o&&o.ascending===false)]);return this;}
    limit(){return this;} range(a,b){this.rg=[a,b];return this;}
    maybeSingle(){this.one=true;return this;} single(){this.one=true;return this;}
    then(res,rej){
      calls.push({t:this.t,op:this.op,cols:this.cols,q:this.q.slice()});
      if(this.op!=='select')return Promise.resolve({data:null,error:null}).then(res,rej);
      if(this.t==='suppliers'&&opt.noCycCol&&/cycle_days/.test(this.cols))
        return Promise.resolve({data:null,error:{message:'column suppliers.cycle_days does not exist'}}).then(res,rej);
      let rows=(DB[this.t]||[]).filter(r=>this.f.every(fn=>fn(r)));
      for(let i=this.ord.length-1;i>=0;i--){const [c,asc]=this.ord[i];
        rows=rows.slice().sort((a,b)=>(String(a[c])<String(b[c])?-1:String(a[c])>String(b[c])?1:0)*(asc?1:-1));}
      if(this.rg)rows=rows.slice(this.rg[0],this.rg[1]+1);
      if(this.cols&&this.cols!=='*'&&!/[(*]/.test(this.cols)){const cs=this.cols.split(',').map(x=>x.trim());   // คืนเฉพาะคอลัมน์ที่ขอ
        rows=rows.map(r=>{const o={};cs.forEach(c=>{if(c in r)o[c]=r[c];});return o;});}
      const data=this.one?(rows[0]||null):JSON.parse(JSON.stringify(rows));
      return Promise.resolve({data,error:null}).then(res,rej);
    }
    catch(fn){return this.then(x=>x,fn);}
  }
  return {createClient:()=>({from:t=>new Q(t),rpc:async()=>({data:null,error:null}),
    storage:{from:()=>({upload:async()=>({}),getPublicUrl:()=>({data:{publicUrl:''}})})},
    auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
}

function boot(html,DB,calls,opt){
  return new JSDOM(strip(html),{runScripts:'dangerously',url:'https://x.test/',
    beforeParse(w){
      const T0=new w.Date(2026,9,15,14,0,0).getTime(); w.Date.now=()=>T0;   // วันธุรกิจ = 2026-10-15
      w.supabase=mkSupabase(DB,calls,opt);
      w.localStorage.setItem('jjck_lang','th');
      w.confirm=()=>true; w.alert=()=>{};
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }}).window;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const row=(P,id)=>P.rows.find(x=>x.p.id===id);

(async()=>{
  const out=[];
  const html=fs.readFileSync('jjmk-kitchen.html','utf8');
  const calls=[];const w=boot(html,mkDB(),calls);
  await sleep(300);
  await w.brLoad(true);
  const S=w.eval('S');
  out.push('โหลดยอดสาขาได้ 2 สาขา ไม่มี error: '+(!S.br.err&&(S.br.data||[]).length===2));
  const B=c=>S.br.data.find(b=>b.code===c),RDb=B('JJRD'),LPb=B('JJLP');
  out.push('วันขาย (นับล่าสุด) = 2026-10-15 ทั้ง 2 สาขา: '+(RDb.cd===CD&&LPb.cd===CD));

  // 1) query
  const supQ=calls.find(c=>c.t==='suppliers');
  out.push('อ่าน suppliers พร้อม cycle_days: '+(!!supQ&&/cycle_days/.test(supQ.cols)));
  const lq=calls.filter(c=>c.t==='stock_receipts'&&c.cols==='sup,order_date');
  const lqRD=lq.find(c=>c.q.includes('eq.branch_id='+RD));
  out.push('อ่านวันสั่งล่าสุดต่อสาขา ย้อน 120 วัน (≥ 2026-06-17) ถึงก่อนวันขาย (< 2026-10-15) · 2 สาขา: '
    +(lq.length===2&&!!lqRD&&lqRD.q.includes('gte.order_date=2026-06-17')&&lqRD.q.includes('lt.order_date=2026-10-15')));
  out.push('ไม่กรองชื่อซัพใน query (จับคู่ด้วย brSupKey เหมือนแอพนับสต๊อก) · ยังกรอง ordered>0: '
    +(!!lqRD&&!lqRD.q.some(x=>x.startsWith('in.sup=')||x.startsWith('eq.sup='))&&lqRD.q.includes('gt.ordered=0')));
  const rq=calls.find(c=>c.t==='stock_receipts'&&c.cols==='product_id,order_date,ordered'&&c.q.includes('eq.branch_id='+RD));
  out.push('ของกำลังมายังอ่านช่วงเดิม 10 วัน (10-05..10-15): '+(!!rq&&rq.q.includes('gte.order_date=2026-10-05')&&rq.q.includes('lte.order_date=2026-10-15')));
  out.push('วันสั่งล่าสุด JJRD: IV3 = 10-13 (ใบยกเลิกส่ง 10-14 ordered=0 ไม่นับ) · IV15 ไม่มี (ใบ 06-01 เกิน 120 วัน): '+(RDb.last.iv3==='2026-10-13'&&!RDb.last.iv15));
  out.push('วันสั่งล่าสุด JJLP: IV3 = 10-12 (ใบของวันขาย 10-15 ไม่นับ) · IV15 = 10-01: '+(LPb.last.iv3==='2026-10-12'&&LPb.last.iv15==='2026-10-01'));

  // 2) ตัวเลข JJRD
  const PR=w.brPlan(RDb),PL=w.brPlan(LPb);
  const rA=row(PR,'rA'),rB=row(PR,'rB'),rC=row(PR,'rC'),rD=row(PR,'rD');
  out.push('JJRD IV3 ยังไม่ครบรอบ → ไม่มีวันส่ง ไม่มียอด (mode interval · cyc 3 · ล่าสุด 10-13 · รอบหน้า 10-16): '
    +(rA.dl.d===''&&rA.dl.mode==='interval'&&rA.dl.cyc===3&&rA.dl.last==='2026-10-13'&&rA.dl.next==='2026-10-16'&&rA.need===0&&rA.order===null&&rA.have===4));
  out.push('JJRD IV15 (cycle_days ว่าง = 15) ไม่เคยสั่ง → ครบรอบ: ถึง 10-17 · ครอบคลุม 15 วัน = 27 · รอ 2 · ต้องส่ง 27: '
    +(rB.dl.d==='2026-10-17'&&rB.dl.mode==='interval'&&rB.dl.cyc===15&&rB.dl.last===null&&rB.cov.days===15&&rB.cov.sum===27&&rB.pre.sum===2&&rB.left===0&&rB.order===27));
  out.push('JJRD ANY ไม่เปลี่ยน: ถึง 10-16 · ครอบคลุม 1 วัน = 2 · นับ 1 → ต้องส่ง 1: '
    +(rC.dl.mode==='any'&&rC.dl.d==='2026-10-16'&&rC.cov.days===1&&rC.cov.sum===2&&rC.onWay===0&&rC.order===1));
  out.push('JJRD FIX ไม่เปลี่ยน: ถึง 10-17 · ครอบคลุม 7 วัน = 12 · รอ 2 · ต้องส่ง 12: '
    +(rD.dl.mode==='fixed'&&rD.dl.d==='2026-10-17'&&rD.cov.days===7&&rD.cov.sum===12&&rD.pre.sum===2&&rD.order===12));
  out.push('JJRD ต้องส่ง 3 รายการ (IV15 27 · ANY 1 · FIX 12 — IV3 ไม่อยู่): '+(PR.need.length===3&&!PR.need.includes(rA)));

  // 3) ตัวเลข JJLP (รอบต่อสาขา)
  const lA=row(PL,'lA'),lB=row(PL,'lB'),lC=row(PL,'lC'),lD=row(PL,'lD');
  out.push('JJLP IV3 ครบรอบ (10-12 + 3 = 10-15): ถึง 10-19 · ครอบคลุม 3 วัน = 3 · รอ 8 · กำลังมา 5 · เหลือ 1 → ต้องส่ง 2: '
    +(lA.dl.d==='2026-10-19'&&lA.dl.mode==='interval'&&lA.dl.last==='2026-10-12'&&lA.cov.days===3&&lA.cov.sum===3&&lA.pre.sum===8&&lA.onWay===5&&lA.left===1&&lA.order===2));
  out.push('JJLP IV15 ยังไม่ครบ (10-01 + 15 = 10-16 > 10-15 — ค่าตั้งต้น 15 วัน): ไม่มียอด: '
    +(lB.dl.d===''&&lB.dl.cyc===15&&lB.dl.next==='2026-10-16'&&lB.order===null&&lB.need===0));
  out.push('JJLP ANY/FIX เหมือน JJRD (1 · 12): '+(lC.order===1&&lD.order===12));

  // 4) ฟังก์ชันย่อย
  const cyc=w.eval('brCyc');
  out.push('brCyc: 3→3 · "7"→7 · 2→2 · 90→90 · null/1/91/"x" → 15: '
    +(cyc({cycle_days:3})===3&&cyc({cycle_days:'7'})===7&&cyc({cycle_days:2})===2&&cyc({cycle_days:90})===90
      &&cyc({cycle_days:null})===15&&cyc({cycle_days:1})===15&&cyc({cycle_days:91})===15&&cyc({cycle_days:'x'})===15&&cyc(null)===15));
  out.push('brDelivery interval = เวลาเดินทางล้วน (ไม่สนรอบ): IV3 สั่ง 10-12 → ถึง 10-16: '+(w.brDelivery('IV3','2026-10-12').d==='2026-10-16'&&w.brDelivery('IV3','2026-10-12').mode==='interval'));
  out.push('brNextAfter interval = ของชุดนี้ + cyc (10-19 → 10-22) · ANY +1 วัน: '+(w.brNextAfter('IV3','2026-10-15','2026-10-19')==='2026-10-22'&&w.brNextAfter('ANY','2026-10-15','2026-10-16')==='2026-10-17'));
  out.push('ครบรอบพอดีวันที่ last+cyc = cd (≤): '+(w.brIvState(S.br.sups[0],'2026-10-16',{iv3:'2026-10-13'}).due===true&&w.brIvState(S.br.sups[0],'2026-10-15',{iv3:'2026-10-13'}).due===false));

  // 5) บรรทัดสถานะ
  const mR=w.brMetaLine(RDb,PR),mL=w.brMetaLine(LPb,PL);
  out.push('JJRD บรรทัดสถานะ: IV3 ⏳ ยังไม่ครบรอบ (ทุก 3 วัน) · สั่งล่าสุด/รอบหน้า + IV15 ครบรอบ เริ่มนับรอบ: '
    +(mR.includes('IV3: ⏳ ยังไม่ครบรอบ (ทุก 3 วัน) · สั่งล่าสุด '+w.dispDate('2026-10-13')+' · รอบหน้า '+w.dispDate('2026-10-16'))
      &&mR.includes('IV15: 🔁 ครบรอบทุก 15 วัน — ต้องสั่งวันนี้ · ยังไม่เคยสั่ง — เริ่มนับรอบ')));
  out.push('JJLP บรรทัดสถานะ: IV3 ครบรอบ (ไม่มีคำว่าเริ่มนับ) + IV15 ยังไม่ครบ: '
    +(mL.includes('IV3: 🔁 ครบรอบทุก 3 วัน — ต้องสั่งวันนี้')&&!mL.includes('IV3: 🔁 ครบรอบทุก 3 วัน — ต้องสั่งวันนี้ · ยังไม่เคยสั่ง')&&mL.includes('IV15: ⏳ ยังไม่ครบรอบ (ทุก 15 วัน)')));
  const k4=['th','en','lo','my'].every(l=>{const D=w.eval('I18N')[l];return D&&D.br_iv_wait&&D.br_iv_due&&D.br_iv_first;});
  out.push('ข้อความใหม่ครบ 4 ภาษา: '+k4);

  // 6) ไม่มีคอลัมน์ cycle_days → อ่านแบบเดิม (ไม่พัง) และรอบ = 15
  const calls2=[];const w2=boot(html,mkDB(),calls2,{noCycCol:true});
  await sleep(300); await w2.brLoad(true);
  const S2=w2.eval('S'),R2=S2.br.data&&S2.br.data.find(b=>b.code==='JJLP'),P2=R2&&w2.brPlan(R2),a2=P2&&row(P2,'lA');
  out.push('ไม่มีคอลัมน์ cycle_days: ยังโหลดได้ (fallback) · IV3 ใช้ 15 วัน → 10-12+15 ยังไม่ครบ ไม่มียอด: '
    +(!S2.br.err&&!!a2&&S2.br.sups.length===4&&a2.dl.cyc===15&&a2.dl.d===''&&a2.order===null));

  // 6b) ใบสั่งสะกดชื่อซัพต่างตัวพิมพ์/ช่องว่าง (' iv3 ' · 'iv15') — ต้องยังนับรอบได้เหมือนแอพนับสต๊อก (เดิมกรอง in.sup ตรงตัว = หาไม่เจอ → ครบรอบผิด)
  const calls3=[];const w3=boot(html,mkDB({recvVar:true}),calls3);
  await sleep(300); await w3.brLoad(true);
  const S3=w3.eval('S'),RD3=S3.br.data&&S3.br.data.find(b=>b.code==='JJRD'),LP3=S3.br.data&&S3.br.data.find(b=>b.code==='JJLP');
  const a3=RD3&&row(w3.brPlan(RD3),'rA'),b3=LP3&&row(w3.brPlan(LP3),'lB');
  out.push('ใบสั่งสะกด " iv3 " / "iv15": JJRD IV3 ล่าสุด 10-13 ยังไม่ครบรอบ ไม่มียอด · JJLP IV15 ล่าสุด 10-01 ยังไม่ครบ: '
    +(!!a3&&!!b3&&RD3.last.iv3==='2026-10-13'&&a3.dl.d===''&&a3.order===null&&LP3.last.iv15==='2026-10-01'&&b3.dl.d===''&&b3.order===null));

  // 6c) ไม่มีสินค้าของซัพ interval = ไม่อ่านวันสั่งล่าสุดเลย (ไม่เสีย query)
  const calls4=[];const w4=boot(html,mkDB({noInterval:true}),calls4);
  await sleep(300); await w4.brLoad(true);
  out.push('ไม่มีซัพ interval: ไม่ query วันสั่งล่าสุด (sup,order_date): '+(!w4.eval('S').br.err&&!calls4.some(c=>c.t==='stock_receipts'&&c.cols==='sup,order_date')));

  // 6d) รอบยาวเกิน 31 วัน — ต้องครอบคลุมครบรอบ (เดิมตัดที่ 31 วัน) + วันขายดีที่เกิน +50 วันต้องโหลดมาด้วย
  //   IV45: ถึง 10-16 · ชุดหน้า 10-16+45 = 11-30 · 45 วัน × 2 = 90 · รอ 0 · นับ 0 → ต้องส่ง 90
  //   IV90: ถึง 10-16 · ชุดหน้า 2027-01-14 · 90 วัน × 1 + ส–อา 26 วัน (12 สัปดาห์ ศ–พฤ ×2 + ศ ส อา จ อ พ) + วันขายดี พ 23 ธ.ค. 1 = 117
  const calls5=[];const w5=boot(html,mkDB({long:true}),calls5);
  await sleep(300); await w5.brLoad(true);
  const S5=w5.eval('S'),RD5=S5.br.data&&S5.br.data.find(b=>b.code==='JJRD'),P5=RD5&&w5.brPlan(RD5);
  const e5=P5&&row(P5,'rE'),f5=P5&&row(P5,'rF');
  out.push('IV45 (ทุก 45 วัน): ถึง 10-16 · ครอบคลุม 45 วัน = 45×2 = 90 · ต้องส่ง 90: '
    +(!!e5&&e5.dl.d==='2026-10-16'&&e5.dl.cyc===45&&e5.cov.days===45&&e5.cov.sum===90&&e5.pre.sum===0&&e5.order===90&&w5.brNextAfter('IV45','2026-10-15','2026-10-16')==='2026-11-30'));
  const spq=calls5.find(c=>c.t==='cal_special_days');
  out.push('IV90 (ทุก 90 วัน): ครอบคลุม 90 วัน = 117 (รวมวันขายดี 23 ธ.ค.) · โหลดวันพิเศษถึง +130 วัน (2027-02-22): '
    +(!!f5&&f5.cov.days===90&&f5.cov.sum===117&&f5.order===117&&!!spq&&spq.q.includes('lte.day_from=2027-02-22')));

  // 7) เทียบโค้ดก่อนแก้ (bed4816) — ไม่มีซัพ interval = ทุกแถวเหมือนเดิมทุกตัวเลข · มี interval = แถว ANY/FIX เหมือนเดิม
  let old=null;try{old=execSync('git show bed4816:jjmk-kitchen.html',{encoding:'utf8',maxBuffer:64<<20,stdio:['ignore','pipe','ignore']});}catch(e){}
  if(!old)out.push('(ข้ามการเทียบโค้ดเดิม — ไม่มี commit bed4816)');
  else{
    const pick=x=>JSON.stringify([x.p.id,x.have,x.need,x.order,x.left,x.onWay,x.cov,x.pre,x.dl.d,x.dl.od,x.dl.mode==='interval'?'any':x.dl.mode]);
    const runBoth=async opt=>{
      const res=[];
      for(const src of [old,html]){const c=[];const ww=boot(src,mkDB(opt),c);await sleep(250);await ww.brLoad(true);
        const SS=ww.eval('S');res.push(SS.br.data.map(b=>ww.brPlan(b).rows.map(pick)));}
      return res;};
    const [o1,n1]=await runBoth({noInterval:true});
    out.push('ไม่มีซัพ interval: ผลทุกแถวตรงกับโค้ดเดิม (8 แถว): '+(JSON.stringify(o1)===JSON.stringify(n1)&&o1.flat().length===8));
    const [o2,n2]=await runBoth({});
    const only=(arr,ids)=>arr.flat().filter(s=>ids.some(id=>s.startsWith('["'+id+'"')));
    out.push('มีซัพ interval: แถว ANY/FIX ตรงกับโค้ดเดิม: '+(JSON.stringify(only(o2,['rC','rD','lC','lD']))===JSON.stringify(only(n2,['rC','rD','lC','lD']))&&only(n2,['rC','rD','lC','lD']).length===4));
  }

  out.push('errors: '+JSON.stringify(w.errors.concat(w2.errors,w3.errors,w4.errors,w5.errors)));
  console.log(out.join('\n')); process.exit(0);
})().catch(e=>{console.log('CRASH '+(e&&e.stack||e));process.exit(1);});
