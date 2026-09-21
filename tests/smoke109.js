// smoke109: jjmk-stockcheck — ลากหน้าลง = รีเฟรช (มือถือ)
//   ต้องเป็นตัวรีเฟรชของแอพเอง ไม่ใช่เบราว์เซอร์รีโหลดทั้งหน้า (preventDefault)
//   ลากไม่ถึงเกณฑ์ = เด้งกลับเฉย ๆ · ลากถึง = โหลดข้อมูลใหม่ · ค่านับที่ยังไม่กดบันทึกต้องไม่หาย
//   ห้ามแย่ง gesture: หน้าไม่ได้อยู่บนสุด / กล่องยืนยันเปิดอยู่ / นิ้วอยู่ในกล่องที่กำลังเลื่อน
const fs=require('fs');
const {JSDOM}=require('jsdom');
const crypto=require('crypto');
const html=fs.readFileSync('jjmk-stockcheck.html','utf8');
const patched=html.replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const BID='b19f0a17b4472';
const H=(u,p)=>crypto.createHash('sha256').update(u+'|'+p+'|JJSC').digest('hex');
const users=[{id:1,username:'admin',pass_hash:H('admin','jjmk1234'),display_name:'ผู้ดูแลระบบ',role:'admin',branches:[],depts:[],active:true}];
let prodHits=0;
const vc=new JSDOM(patched,{runScripts:'dangerously',url:'https://x.test/',
  beforeParse(w){
    w.localStorage.setItem('jjsc_auth',JSON.stringify({u:'admin',h:H('admin','jjmk1234')}));
    w.localStorage.setItem('jjsc_tab','count');
    w.localStorage.setItem('jjsc_lgsync',String(Date.now()));
    w.localStorage.setItem('JJSC_NOPREWARM','1');
    w.ontouchstart=null;   // ทำเป็นจอสัมผัส (initPtr ทำงานเฉพาะจอสัมผัส)
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET';
      const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v),json:async()=>v});
      if(method!=='GET')return T([]);
      if(url.includes('sc_users')){
        const um=url.match(/username=eq\.([^&]+)/);
        return T(um?users.filter(x=>x.username===decodeURIComponent(um[1])):users);
      }
      if(url.includes('sc_depts'))return T([{id:1,name:'ครัว',sort:1}]);
      if(url.includes('products')&&!url.includes('pnl_')){prodHits++;return T([
        {id:'p1',branch_id:BID,cat_label:'เนื้อสัตว์',name:'หมูสไลด์',unit:'กก.',sup:'S1',rate_wk:10,rate_fri:10,rate_we:10,dept:'ครัว',sort:1},
        {id:'p2',branch_id:BID,cat_label:'ผัก',name:'ผักบุ้ง',unit:'กก.',sup:'S1',rate_wk:8,rate_fri:8,rate_we:8,dept:'ครัว',sort:2}]);}
      if(url.includes('suppliers')&&!url.includes('pnl_'))return T([{name:'S1',order_mode:'any',lead_days:1,line_group_id:null}]);
      return T([]);
    };
    w.TextEncoder=TextEncoder;
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const tev=(type,y,target)=>{ // จำลองนิ้ว 1 นิ้ว (jsdom ไม่มี TouchEvent จริง)
  const e=new w.Event(type,{bubbles:true,cancelable:true});
  e.touches=type==='touchend'?[]:[{clientY:y,clientX:100}];
  (target||d.body).dispatchEvent(e); return e;
};
const setScroll=v=>Object.defineProperty(w,'scrollY',{value:v,configurable:true});
const ptr=()=>d.getElementById('ptr');
const pull=()=>ptr().style.transform;
setTimeout(async()=>{
  const out=[];
  await sleep(400);
  setScroll(0);
  out.push('มีตัวลากลงรีเฟรชในหน้า (วงกลม ⟳ ไม่ใช่ป้ายเดิม): '
    +(!!ptr()&&!!ptr().querySelector('.ptr-c')&&ptr().getAttribute('data-notr')!==null));

  // 1) ลากไม่ถึงเกณฑ์ → เด้งกลับ ไม่โหลดใหม่
  let n0=prodHits;
  tev('touchstart',100); tev('touchmove',160); await sleep(30);
  out.push('ลากลงนิดเดียว: วงกลมโผล่ตามนิ้ว แต่ยังไม่ขึ้น "ปล่อยเพื่อรีเฟรช": '
    +(pull()==='translate(-50%, -26px)'&&!ptr().classList.contains('rel')));
  tev('touchend',160); await sleep(200);
  out.push('ปล่อยตอนลากไม่ถึงเกณฑ์ → เด้งกลับ ไม่โหลดข้อมูลใหม่: '+(prodHits===n0&&!ptr().classList.contains('spin')));

  // 2) ลากเกินเกณฑ์ → รีเฟรชข้อมูล (ไม่ใช่รีโหลดทั้งหน้า)
  n0=prodHits;
  tev('touchstart',100);
  const mv=tev('touchmove',300);
  await sleep(30);
  out.push('ลากลงเกิน 70: วงกลมเปลี่ยนเป็นสถานะ "ปล่อยเพื่อรีเฟรช": '+ptr().classList.contains('rel'));
  out.push('กันเบราว์เซอร์รีโหลดทั้งหน้าเอง (preventDefault ตอนลาก): '+mv.defaultPrevented);
  tev('touchend',300);
  out.push('ระหว่างโหลด วงกลมค้างไว้แล้วหมุน: '
    +(ptr().classList.contains('spin')&&pull()==='translate(-50%, 16px)'));
  await sleep(450);
  out.push('ปล่อยแล้วโหลดข้อมูลใหม่จริง + ขึ้นข้อความบอก + วงกลมเก็บกลับ: '
    +(prodHits>n0&&d.getElementById('toast').textContent.includes('อัปเดตข้อมูลล่าสุด')
      &&!ptr().classList.contains('spin')&&pull()==='translate(-50%, -56px)'));
  out.push('อยู่หน้าเดิม ไม่เด้งกลับหน้าแรก: '+(w.eval('S.tab')==='count'));

  // 3) ค่านับที่ยังไม่กดบันทึกต้องไม่หายหลังรีเฟรช
  w.setQ('p1',7); await sleep(80);
  n0=prodHits;
  tev('touchstart',100); tev('touchmove',300); tev('touchend',300); await sleep(500);
  out.push('ค่านับที่ยังไม่กดบันทึก (7) ไม่หายหลังลากรีเฟรช: '
    +(prodHits>n0&&w.eval("(S.all.find(x=>x.id==='p1')||{}).qty")===7));

  // 4) ห้ามแย่ง gesture
  setScroll(300);
  tev('touchstart',100); const mv2=tev('touchmove',300); await sleep(30);
  out.push('หน้ายังเลื่อนค้างอยู่กลางหน้า → ไม่ทำงาน (ปล่อยให้เลื่อนหน้าตามปกติ): '
    +(!mv2.defaultPrevented&&pull()==='translate(-50%, -56px)'));
  tev('touchend',300); await sleep(60);
  setScroll(0);
  d.getElementById('ovl').classList.add('on');
  tev('touchstart',100); const mv3=tev('touchmove',300); await sleep(30);
  out.push('กล่องยืนยันเปิดอยู่ → ไม่ทำงาน: '+(!mv3.defaultPrevented&&pull()==='translate(-50%, -56px)'));
  tev('touchend',300); d.getElementById('ovl').classList.remove('on'); await sleep(60);
  const box=d.createElement('div'); d.body.appendChild(box);
  Object.defineProperty(box,'scrollTop',{value:40,configurable:true});
  tev('touchstart',100,box); const mv4=tev('touchmove',300,box); await sleep(30);
  out.push('นิ้วอยู่ในกล่อง/ตารางที่กำลังเลื่อนอยู่ → ไม่แย่ง gesture: '
    +(!mv4.defaultPrevented&&pull()==='translate(-50%, -56px)'));
  tev('touchend',300,box); await sleep(60);

  // 5) ลากขึ้น (เลื่อนหน้าปกติ) ต้องไม่ทำอะไร
  n0=prodHits;
  tev('touchstart',300); const mv5=tev('touchmove',100); tev('touchend',100); await sleep(200);
  out.push('ลากขึ้น = เลื่อนหน้าปกติ ไม่รีเฟรช: '+(!mv5.defaultPrevented&&prodHits===n0));

  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},250);
