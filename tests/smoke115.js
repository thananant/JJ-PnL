// smoke115: jjmk-menu.html (ฝั่งลูกค้า) — โหลดรอบโต๊ะจาก token · โชว์โต๊ะ/แพ็กเกจ/นาฬิกาถอยหลัง · เมนูตามแพ็กเกจ
//   เลือกจำนวน (จำกัดต่อครั้ง) · ส่งออเดอร์ผ่าน qr_place_order · ประวัติที่สั่ง · หมดเวลา/ปิดโต๊ะ/QR ผิด
const fs=require('fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('jjmk-menu.html','utf8').replace(/<link href="https:\/\/fonts[^>]*>/g,'');
const rpcs=[];
const menu=[{id:1,name:'หมูสามชั้น',category:'หมู',unit:'จาน',max:null,image:null},{id:2,name:'เนื้อวากิว',category:'เนื้อ',unit:'จาน',max:2,image:null},{id:3,name:'ผักรวม',category:'ผัก',unit:'จาน',max:null,image:null}];
let orders=[];
let sess={id:9,branch:'JJRD',table_no:7,package:'premium',started_at:new Date(Date.now()-5*60000).toISOString(),expires_at:new Date(Date.now()+105*60000).toISOString(),status:'open'};
const info=()=>({ok:true,now:new Date().toISOString(),session:{...sess,open:sess.status==='open'&&new Date(sess.expires_at)>new Date()},
  packages:[{code:'standard',name:'Standard'},{code:'premium',name:'Premium'}],menu,orders});
function mk(token){
  return new JSDOM(html,{runScripts:'dangerously',url:'https://thananant.github.io/JJ-PnL/jjmk-menu.html?s='+token,
    beforeParse(w){
      w.prompt=()=>'ขอน้ำแข็ง';
      w.fetch=async(url,opt)=>{
        const body=JSON.parse(opt.body); const T=async v=>({ok:true,status:200,text:async()=>JSON.stringify(v)});
        if(url.includes('rpc/qr_session_info')){rpcs.push({fn:'info',body});return T(body.p_token==='tok1'?info():{ok:false,error:'ไม่พบ QR นี้'});}
        if(url.includes('rpc/qr_place_order')){rpcs.push({fn:'order',body});
          if(sess.status!=='open')return T({ok:false,error:'โต๊ะนี้ปิดแล้ว'});
          if(new Date(sess.expires_at)<=new Date())return T({ok:false,error:'หมดเวลาสั่งแล้ว'});
          const items=(body.p_items||[]).map(i=>{const m=menu.find(x=>x.id===i.id);return {id:i.id,name:m.name,qty:Math.min(i.qty,m.max||99),unit:m.unit};});
          const o={id:700+orders.length,items,note:body.p_note,kind:items.length?'order':'call',status:'new',at:new Date().toISOString()};
          orders.unshift(o); return T({ok:true,order_id:o.id,items,kind:o.kind});}
        return T({});
      };
      w.errors=[]; w.addEventListener('error',e=>w.errors.push(e.message));
    }});
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const out=[];
  const vc=mk('tok1'),w=vc.window,d=w.document; await sleep(250);
  const main=()=>d.getElementById('main').textContent;
  out.push('โหลดรอบโต๊ะจาก token: หัวขึ้น สาขารัชดา · โต๊ะ 7 · Premium: '
    +(d.getElementById('brName').textContent==='สาขารัชดา'&&d.getElementById('tblChip').textContent==='โต๊ะ 7'&&d.getElementById('pkChip').textContent==='Premium'));
  out.push('นาฬิกาถอยหลังจากเวลาหมด (ราว 105 นาที): '+/^1(04|05):\d\d$/.test(d.getElementById('timer').textContent));
  out.push('มีหมวดจากเมนู (หมู/เนื้อ/ผัก) + แท็บที่สั่งไป: '+(d.querySelectorAll('#cats .cat').length===4&&d.getElementById('cats').textContent.includes('ที่สั่งไป (0)')));
  out.push('หมวดแรกโชว์เมนู + ปุ่ม − / +: '+(main().includes('หมูสามชั้น')&&d.querySelectorAll('#main .qty').length===1));
  out.push('ยังไม่เลือก → ปุ่มส่งกดไม่ได้: '+d.getElementById('sendBtn').disabled);
  w.qty(1,1); w.qty(1,1); await sleep(20);
  out.push('กด + 2 ครั้ง → หมูสามชั้น 2 + แถบล่างนับ 1 เมนู 2 รายการ + ปุ่มส่งกดได้: '
    +(d.querySelector('#main .qty b').textContent==='2'&&d.getElementById('cartSt').textContent.includes('1 เมนู · 2 รายการ')&&!d.getElementById('sendBtn').disabled));
  w.pickCat('เนื้อ'); w.qty(2,1); w.qty(2,1); w.qty(2,1); await sleep(20);
  out.push('เนื้อวากิวจำกัด 2/ครั้ง → กด + 3 ครั้งได้แค่ 2 + เตือน: '
    +(d.querySelector('#main .qty b').textContent==='2'&&d.getElementById('toast').textContent.includes('ไม่เกิน 2')));
  w.qty(2,-1); w.qty(2,-1); await sleep(20);
  out.push('กด − จนเหลือ 0 → เอาออกจากตะกร้า: '+(d.getElementById('cartSt').textContent.includes('1 เมนู · 2 รายการ')));
  w.qty(2,1);
  w.openCart(); await sleep(20);
  const sheet=()=>d.getElementById('sheet').textContent;
  out.push('กดส่ง → แผ่นยืนยันสรุป 2 เมนู + ช่องหมายเหตุ: '+(d.getElementById('ovl').classList.contains('on')&&sheet().includes('หมูสามชั้น')&&sheet().includes('× 2')&&sheet().includes('เนื้อวากิว')&&!!d.getElementById('note')));
  d.getElementById('note').value='ไม่ใส่ผัก';
  rpcs.length=0; await w.sendOrder(); await sleep(150);
  const o=rpcs.find(x=>x.fn==='order');
  out.push('ยืนยัน → เรียก qr_place_order ด้วย token + รายการ + หมายเหตุ: '
    +(!!o&&o.body.p_token==='tok1'&&o.body.p_items.length===2&&o.body.p_items[0].qty===2&&o.body.p_note==='ไม่ใส่ผัก'));
  out.push('ส่งแล้ว: ตะกร้าว่าง + เด้งไปหน้าที่สั่งไป เห็นออเดอร์ + สถานะ "รับออเดอร์แล้ว": '
    +(w.eval('Object.keys(S.cart).length')===0&&main().includes('ออเดอร์ #700')&&main().includes('หมูสามชั้น × 2')&&main().includes('รับออเดอร์แล้ว')&&main().includes('ไม่ใส่ผัก')));
  rpcs.length=0; await w.callStaff(); await sleep(120);
  out.push('เรียกพนักงาน → ส่งออเดอร์เปล่า + หมายเหตุ: '+(rpcs.some(x=>x.fn==='order'&&x.body.p_items.length===0&&x.body.p_note==='ขอน้ำแข็ง')&&main().includes('เรียกพนักงาน')));
  // ครัวเปลี่ยนสถานะ → ลูกค้าเห็นตอนโหลดใหม่
  orders[1].status='served'; await w.load(); await sleep(50); w.pickCat('__orders'); await sleep(20);
  out.push('ครัวกดเสิร์ฟแล้ว → ลูกค้าเห็นสถานะเปลี่ยน: '+main().includes('เสิร์ฟแล้ว'));
  // หมดเวลา
  sess.expires_at=new Date(Date.now()-1000).toISOString(); await w.load(); await sleep(50);
  out.push('หมดเวลา → นาฬิกาขึ้น "หมดเวลา" + ซ่อนแถบสั่ง + บอกให้เรียกพนักงานถ้าจะต่อเวลา + ยังเห็นรายการเดิม: '
    +(d.getElementById('timer').textContent==='หมดเวลา'&&d.getElementById('cartbar').style.display==='none'&&main().includes('หมดเวลาสั่งอาหารแล้ว')&&main().includes('ต่อเวลา')&&main().includes('ออเดอร์ #700')));
  w.qty(1,1); out.push('หมดเวลาแล้วกด + ไม่ทำอะไร: '+(w.eval('Object.keys(S.cart).length')===0));
  // ต่อเวลา (พนักงาน) → กลับมาสั่งได้
  sess.expires_at=new Date(Date.now()+15*60000).toISOString(); await w.load(); await sleep(50);
  out.push('พนักงานต่อเวลา → โหลดใหม่แล้วสั่งได้อีก + นาฬิกาเป็นสีเตือน (<10 นาที? ไม่ใช่ 15): '+(d.getElementById('cartbar').style.display===''&&/^1[45]:\d\d$/.test(d.getElementById('timer').textContent)));
  sess.status='closed'; await w.load(); await sleep(50);
  out.push('ปิดโต๊ะ → ขึ้น "โต๊ะนี้ปิดแล้ว": '+(main().includes('โต๊ะนี้ปิดแล้ว')&&d.getElementById('timer').textContent==='ปิดโต๊ะแล้ว'));
  out.push('errors: '+JSON.stringify(w.errors));
  // token ผิด / ไม่มี token
  const v2=mk('bad'); await sleep(200);
  out.push('QR ผิด/หมดอายุ → บอก "ไม่พบ QR นี้": '+v2.window.document.getElementById('main').textContent.includes('ไม่พบ QR นี้'));
  const v3=new JSDOM(html,{runScripts:'dangerously',url:'https://x.test/jjmk-menu.html',beforeParse(w){w.fetch=async()=>({ok:true,text:async()=>'{}'});}}); await sleep(100);
  out.push('เปิดโดยไม่มี token → บอกให้สแกน QR: '+v3.window.document.getElementById('main').textContent.includes('ไม่พบ QR'));
  console.log(out.join('\n')); process.exit(0);
})();
