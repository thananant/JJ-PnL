// smoke114: jjmk-order.html (ฝั่งพนักงาน) — ล็อกอิน PIN · ตารางโต๊ะตามสาขา (รัชดา 44 / ลาดพร้าว 38) · สร้าง QR ต้องเลือกแพ็กเกจ
//   หมดเวลา 110 นาทีนับจากตอนสร้าง · ต่อเวลา/ปิดโต๊ะ · ฟีดออเดอร์ + เปลี่ยนสถานะ · เพิ่มเมนู · ตั้งค่า
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-order.html','utf8').replace(/<link href="https:\/\/fonts[^>]*>/g,'').replace(/<script src="https:[^>]*><\/script>/g,'');
const posts=[],patches=[],dels=[];
let sessions=[],orders=[],menu=[{id:1,name:'หมูสามชั้น',category:'หมู',packages:['standard','premium'],unit_label:'จาน',max_per_order:null,active:true,sort:1}];
let settings=[{key:'pin',value:'1234'},{key:'tables',value:'{"JJRD":44,"JJLP":38}'},{key:'minutes',value:'110'},
  {key:'packages',value:'[{"code":"standard","name":"Standard","color":"#5B7FA6"},{"code":"premium","name":"Premium","color":"#E5B03C"}]'}];
let nextId=100;
const vc=new JSDOM(html,{runScripts:'dangerously',url:'https://thananant.github.io/JJ-PnL/jjmk-order.html',
  beforeParse(w){
    w.confirm=()=>true; w.print=()=>{}; w.open=()=>{};
    w.fetch=async(url,opt)=>{
      const method=opt&&opt.method||'GET'; const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
      const body=opt&&opt.body?JSON.parse(opt.body):null;
      if(method==='POST'){posts.push({url,body});
        if(url.includes('qr_sessions')){const r={id:nextId++,...body};sessions.unshift(r);return T([r]);}
        if(url.includes('qr_menu_items')){const r={id:nextId++,active:true,...body};menu.push(r);return T([r]);}
        if(url.includes('qr_settings')){(Array.isArray(body)?body:[body]).forEach(b=>{const x=settings.find(s=>s.key===b.key);if(x)x.value=b.value;else settings.push({key:b.key,value:b.value});});return T([]);}
        return T([]);}
      if(method==='PATCH'){patches.push({url,body});
        const m=url.match(/id=eq\.(\d+)/);
        if(url.includes('qr_sessions')&&m){Object.assign(sessions.find(s=>s.id==m[1])||{},body);}
        if(url.includes('qr_orders')&&m){Object.assign(orders.find(o=>o.id==m[1])||{},body);}
        return T([]);}
      if(method==='DELETE'){dels.push(url);return T([]);}
      if(url.includes('qr_settings'))return T(settings);
      if(url.includes('qr_sessions')){const br=(url.match(/branch=eq\.(\w+)/)||[])[1];return T(sessions.filter(s=>s.branch===br));}
      if(url.includes('qr_orders')){const br=(url.match(/branch=eq\.(\w+)/)||[])[1];return T(orders.filter(o=>o.branch===br));}
      if(url.includes('qr_menu_items'))return T(menu);
      return T([]);
    };
    w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
  }});
const w=vc.window,d=w.document;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{
  const out=[];
  await sleep(300);
  const main=()=>d.getElementById('main').textContent;
  // 1) ล็อกอิน
  out.push('เปิดมาถามรหัสพนักงานก่อน: '+d.getElementById('loginOv').classList.contains('on'));
  d.getElementById('pin').value='0000'; w.login(); await sleep(50);
  out.push('รหัสผิด → ไม่เข้า + บอกว่าผิด: '+(d.getElementById('loginOv').classList.contains('on')&&d.getElementById('lgErr').textContent.includes('ไม่ถูกต้อง')));
  d.getElementById('pin').value='1234'; w.login(); await sleep(300);
  out.push('รหัสถูก → เข้าได้ + จำไว้ในเครื่อง: '+(!d.getElementById('loginOv').classList.contains('on')&&w.localStorage.getItem('jjqr_pin')==='1234'));
  // 2) ตารางโต๊ะ
  out.push('รัชดามีโต๊ะ 44 ช่อง ว่างทั้งหมด: '+(d.querySelectorAll('#main .tile').length===44&&main().includes('เปิดอยู่ 0/44')));
  w.setBr('JJLP'); await sleep(250);
  out.push('สลับลาดพร้าว → 38 โต๊ะ: '+(d.querySelectorAll('#main .tile').length===38));
  w.setBr('JJRD'); await sleep(250);
  // 3) สร้าง QR: ต้องเลือกแพ็กเกจก่อน
  w.openTable(7); await sleep(30);
  const box=()=>d.getElementById('box').textContent;
  out.push('แตะโต๊ะว่าง → กล่องเลือกแพ็กเกจ 2 อัน (Standard/Premium) + ปุ่มสร้างยังกดไม่ได้: '
    +(d.getElementById('ovl').classList.contains('on')&&d.querySelectorAll('#box .pk button').length===2&&box().includes('Standard')&&box().includes('Premium')&&d.getElementById('genBtn').disabled));
  posts.length=0; await w.genQR(); await sleep(50);
  out.push('ยังไม่เลือกแพ็กเกจ กดสร้างไม่ทำอะไร: '+(posts.length===0));
  d.querySelectorAll('#box .pk button')[1].click(); await sleep(30);
  out.push('เลือก Premium แล้วปุ่มสร้างกดได้: '+(!d.getElementById('genBtn').disabled));
  const t0=Date.now();
  await w.genQR(); await sleep(150);
  const p=posts.find(x=>x.url.includes('qr_sessions'));
  const exp=new Date(p.body.expires_at)-new Date(p.body.started_at);
  out.push('สร้าง QR → บันทึกรอบโต๊ะ: สาขา JJRD โต๊ะ 7 แพ็กเกจ premium มี token: '
    +(!!p&&p.body.branch==='JJRD'&&p.body.table_no===7&&p.body.package==='premium'&&/^[a-z0-9]{10,14}$/.test(p.body.token)));
  out.push('หมดเวลา = เริ่ม + 110 นาที (เริ่มนับตอนกดสร้าง): '+(Math.round(exp/60000)===110&&Math.abs(new Date(p.body.started_at)-t0)<3000));
  out.push('กล่องเปลี่ยนเป็นหน้า QR: ลิงก์ชี้ jjmk-menu.html?s=token + บอกโต๊ะ/แพ็กเกจ/เวลาเหลือ: '
    +(box().includes('jjmk-menu.html?s='+p.body.token)&&box().includes('โต๊ะ 7')&&box().includes('Premium')&&/เหลือ 1(09|10):\d\d/.test(box())));
  out.push('ไม่มีไลบรารี QR (ออฟไลน์) ก็ยังมีรูป QR สำรอง: '+(!!d.querySelector('#qrc img')||!!d.querySelector('#qrc canvas')));
  w.closeBox(); await sleep(30); w.renderTables();
  const tile7=d.querySelectorAll('#main .tile')[6];
  out.push('โต๊ะ 7 ในตารางขึ้นเป็นเปิดอยู่ + นาฬิกาเดิน + ชื่อแพ็กเกจ: '+(tile7.classList.contains('open')&&/1(09|10):\d\d/.test(tile7.textContent)&&tile7.textContent.includes('Premium')&&main().includes('เปิดอยู่ 1/44')));
  w.openTable(7); await sleep(30); posts.length=0;
  await w.genQR(); await sleep(50);
  out.push('โต๊ะที่เปิดอยู่ กดสร้างซ้ำไม่ได้ (เปิดกล่อง QR เดิมแทน): '+(posts.length===0&&box().includes('jjmk-menu.html?s=')));
  // 4) ต่อเวลา / ปิดโต๊ะ
  const sid=p.body.id||sessions[0].id;
  patches.length=0; await w.extend(sid,15); await sleep(50);
  const pe=patches.find(x=>x.url.includes('qr_sessions'));
  out.push('+15 นาที → หมดเวลาเลื่อนเป็น 125 นาทีจากเริ่ม: '+(!!pe&&Math.round((new Date(pe.body.expires_at)-new Date(p.body.started_at))/60000)===125));
  patches.length=0; await w.closeSess(sid); await sleep(100);
  out.push('ปิดโต๊ะ → status=closed + โต๊ะกลับเป็นว่าง: '+(patches.some(x=>x.body.status==='closed')&&d.querySelectorAll('#main .tile')[6].textContent.includes('ว่าง')));
  // 5) ออเดอร์เข้า
  const s2={id:nextId++,token:'tk2',branch:'JJRD',table_no:12,package:'standard',status:'open',started_at:new Date().toISOString(),expires_at:new Date(Date.now()+100*60000).toISOString()};
  sessions.unshift(s2);
  orders.push({id:501,session_id:s2.id,branch:'JJRD',table_no:12,items:[{id:1,name:'หมูสามชั้น',qty:2,unit:'จาน'}],note:'ไม่เผ็ด',kind:'order',status:'new',created_at:new Date().toISOString()});
  orders.push({id:502,session_id:s2.id,branch:'JJRD',table_no:12,items:[],note:'ขอน้ำแข็ง',kind:'call',status:'new',created_at:new Date().toISOString()});
  orders.push({id:503,session_id:999,branch:'JJLP',table_no:3,items:[{id:1,name:'หมูสามชั้น',qty:1,unit:'จาน'}],kind:'order',status:'new',created_at:new Date().toISOString()});
  await w.refresh(); await sleep(100);
  out.push('แท็บออเดอร์ขึ้นตัวเลขใหม่ 2 (นับเฉพาะสาขานี้) + โต๊ะ 12 มีป้ายออเดอร์ใหม่: '
    +(d.querySelector('#tabs .badge')&&d.querySelector('#tabs .badge').textContent==='2'&&d.querySelectorAll('#main .tile')[11].querySelector('.nb').textContent==='2'));
  w.setTab('orders'); await sleep(50);
  out.push('ฟีดออเดอร์: เห็นออเดอร์ #501 โต๊ะ 12 หมูสามชั้น × 2 + หมายเหตุ + เรียกพนักงาน: '
    +(main().includes('#501')&&main().includes('โต๊ะ 12')&&main().includes('หมูสามชั้น')&&main().includes('ไม่เผ็ด')&&main().includes('เรียกพนักงาน')&&main().includes('ขอน้ำแข็ง')&&!main().includes('โต๊ะ 3')));
  patches.length=0; await w.setStat(501,'cooking'); await sleep(50);
  out.push('กด 🔥 กำลังทำ → PATCH status=cooking + ตัวเลขใหม่ลดเหลือ 1: '+(patches.some(x=>x.url.includes('qr_orders?id=eq.501')&&x.body.status==='cooking')&&d.querySelector('#tabs .badge').textContent==='1'));
  await w.setStat(501,'served'); await w.setStat(502,'served'); await sleep(50);
  out.push('เสิร์ฟ/รับทราบครบ → ไม่มีตัวเลขค้าง + ย้ายไปกลุ่มเสิร์ฟแล้ว: '+(!d.querySelector('#tabs .badge')&&main().includes('ไม่มีออเดอร์ในกลุ่มนี้')));
  // 6) เมนู
  w.setTab('menu'); await sleep(50);
  d.getElementById('mName').value='เนื้อวากิว'; d.getElementById('mCat').value='เนื้อ'; d.getElementById('mUnit').value='จาน'; d.getElementById('mMax').value='2';
  d.querySelectorAll('.mPk')[0].checked=false;   // เฉพาะ Premium
  posts.length=0; await w.menuSave(); await sleep(80);
  const pm=posts.find(x=>x.url.includes('qr_menu_items'));
  out.push('เพิ่มเมนู "เนื้อวากิว" เฉพาะ Premium ไม่เกิน 2/ครั้ง: '+(!!pm&&pm.body.name==='เนื้อวากิว'&&JSON.stringify(pm.body.packages)==='["premium"]'&&pm.body.max_per_order===2&&main().includes('เนื้อวากิว')));
  patches.length=0; await w.menuToggle(1); await sleep(50);
  out.push('ปิดขายชั่วคราว → active=false: '+(patches.some(x=>x.url.includes('qr_menu_items?id=eq.1')&&x.body.active===false)&&main().includes('ปิดขาย')));
  // 7) ตั้งค่า
  w.setTab('settings'); await sleep(50);
  d.getElementById('tb_JJLP').value='40'; d.getElementById('cMin').value='120';
  posts.length=0; await w.cfgSave(); await sleep(80);
  const ps=posts.find(x=>x.url.includes('qr_settings'));
  out.push('ตั้งค่า: จำนวนโต๊ะลาดพร้าว 40 + เวลา 120 นาที บันทึกลง qr_settings (upsert): '
    +(!!ps&&ps.url.includes('on_conflict=key')&&ps.body.some(r=>r.key==='tables'&&JSON.parse(r.value).JJLP===40)&&ps.body.some(r=>r.key==='minutes'&&r.value==='120')));
  w.setBr('JJLP'); await sleep(250); w.setTab('tables'); await sleep(30);
  out.push('ตั้งค่าใหม่มีผลทันที (ลาดพร้าว 40 โต๊ะ · เวลา 120): '+(d.querySelectorAll('#main .tile').length===40&&main().includes('120 นาที')));
  out.push('errors: '+JSON.stringify(w.errors));
  console.log(out.join('\n')); process.exit(0);
},200);
