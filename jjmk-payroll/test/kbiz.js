// เทสไฟล์โอน K BIZ (เงินเดือน + เบิกกลางเดือน) กับโค้ดจริงใน jjmk-payroll.html
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
function chain(){ const b={}; for(const m of ['select','eq','neq','gte','lte','lt','gt','in','is','not','or','order','limit','range','single','maybeSingle','on','subscribe','insert','update','upsert','delete']) b[m]=()=>b;
  b.then=(ok,er)=>Promise.resolve({data:[],error:null}).then(ok,er); return b; }
const files=[]; let promptAns=null, promptDef=null; const alerts=[];
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:()=>chain(),channel:()=>chain(),rpc:()=>chain(),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder;
    w.alert=m=>alerts.push(String(m)); w.confirm=()=>true; w.indexedDB=undefined; w.scrollTo=()=>{};
    w.prompt=(msg,def)=>{ promptDef=def; return promptAns===undefined?def:promptAns; };
    w.XLSX={utils:{aoa_to_sheet:aoa=>({aoa}),encode_cell:()=>'X',book_new:()=>({}),book_append_sheet:(wb,ws,n)=>{wb.ws=ws;wb.n=n;}},writeFile:(wb,f)=>files.push({f,n:wb.n,aoa:wb.ws.aoa})};
  }});
const w=dom.window, d=w.document; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
setTimeout(()=>{ try{
  E(`applyUser({role:'owner'}); devBranch={SN_RD:'JJRD',SN_OF:'OFFICE'};
     shiftDefs=[fromDbShift({id:1,name:'กะเช้า',start_time:'10:00',end_time:'19:00',in_grace:5,out_grace:0,sort_order:1})];
     const mk=(id,code,nick,br,bank,acc,extra)=>fromDbEmp(Object.assign({id,code,nick,full_name:nick+' ทดสอบ',branch:br,dept:'หน้าร้าน',position:'พนักงาน',
        wage_type:'daily',rate:500,active:true,shift_id:1,birth_date:'1995-05-05',phone:'0812345678',bank_name:bank,bank_account:acc,deposit_on:false},extra||{}));
     employees=[mk(1,'A','แพร','JJRD','กสิกรไทย','123-4-56789-0'), mk(2,'B','บอส','JJRD','เงินสด',''), mk(3,'C','มิว','JJRD','ไทยพาณิชย์','4021112223'),
                mk(4,'D','น้อง','JJRD','กสิกรไทย','1234567890'), mk(5,'E','ปอ','JJRD','กสิกรไทย','9999999999',{active:false}),
                mk(6,'F','ฟ้า','JJRD','กสิกรไทย','5555555555'), mk(7,'G','กิ๊ฟ','OFFICE','กสิกรไทย','7777777777',{wage_type:'monthly',rate:20000})];
     const days=[]; for(let x=new Date('2026-08-26T12:00:00'); x<=new Date('2026-09-25T12:00:00'); x.setDate(x.getDate()+1)) days.push(localYMD(x));
     punches=[]; for(const c of ['A','B','C','D']) for(const dd of days){ punches.push({code:c,date:dd,time:'09:55',sn:'SN_RD'},{code:c,date:dd,time:'19:05',sn:'SN_RD'}); }
     for(const dd of days){ punches.push({code:'G',date:dd,time:'08:55',sn:'SN_OF'},{code:'G',date:dd,time:'18:05',sn:'SN_OF'}); }
     advances=[fromDbAdv({id:1,employee_id:1,period:'2026-09',amount:300,taken_date:'2026-09-12',note:''})];
     recomputeAll(); refreshPeriodSelectors(); document.getElementById('periodSel').value='2026-09'; document.getElementById('advPeriodSel').value='2026-09';`);
  const net=id=>E(`Math.round(calcPay(employees.find(e=>e.id===${id}),'2026-09').net*100)/100`);
  console.log('[ไฟล์โอนเงินเดือน — สาขารัชดา]');
  ok(d.querySelector('button[onclick="openKbizBranch(\'pay\')"]'),'หน้าสรุปเงินเดือนมีปุ่ม 🏦 ไฟล์โอน K BIZ');
  E(`openKbizBranch('pay')`);
  ok(/เงินเดือน/.test(d.getElementById('kbizTitle').textContent) && d.querySelectorAll('#kbizBtns button').length>=5,'หน้าต่างเลือกสาขาเดียวกับเบิกกลางเดือน');
  promptAns=undefined; E(`kbizGo('JJRD')`);
  const f=files.pop();
  ok(f && f.f==='KBIZ_Payroll_JJRD_2026-09.xlsx' && f.n==='Transaction Upload','ชื่อไฟล์ + ชีต Transaction Upload (ฟอร์มเดียวกับเบิก)');
  const rows=f.aoa.slice(3);
  const accA=rows.find(r=>r[1]==='1234567890');
  ok(accA && Math.abs(accA[3]-(net(1)+net(4)))<0.005 && /(แพร\+น้อง|น้อง\+แพร) รวม/.test(alerts.at(-1)),'บัญชีร่วม (แพร+น้อง) รวมเป็นแถวเดียว ยอด = สุทธิ 2 คนรวมกัน');
  ok(net(1) < E(`calcPay(employees[0],'2026-09').base`),'ยอดของแพรหักเบิกกลางเดือนแล้ว (ใช้ calcPay ตัวเดียวกับสลิป)');
  ok(!rows.some(r=>r[1]==='9999999999') && !rows.some(r=>r[1]==='5555555555'),'ไม่รวมคนพ้นสภาพที่ไม่มีวันทำงาน / คนที่ยังไม่มียอด');
  ok(/บอส .*รับเงินสด/.test(alerts.at(-1)) && /มิว .*ไม่ใช่บัญชีกสิกร/.test(alerts.at(-1)),'คนรับเงินสด / ธนาคารอื่น ไม่อยู่ในไฟล์ + บอกให้จ่ายเอง');
  ok(f.aoa[0][1]===rows.length && Math.abs(f.aoa[0][3]-rows.reduce((s,r)=>s+r[3],0))<0.005 && rows.every(r=>r[0]==='004' && r[4]===promptDef),'แถวสรุปจำนวน/ยอดรวม + รหัสธนาคาร 004 + วันเงินเข้า');
  const exp=E(`(()=>{ const pay=periodRangeE(employees[0],'2026-09').pay; const t=new Date(); t.setDate(t.getDate()+1); t.setHours(0,0,0,0);
      const d0=new Date(pay+'T00:00:00')>=t? new Date(pay+'T00:00:00') : t; const p2=n=>String(n).padStart(2,'0'); return p2(d0.getDate())+'/'+p2(d0.getMonth()+1)+'/'+d0.getFullYear(); })()`);
  ok(promptDef===exp,'วันเงินเข้าตั้งต้น = วันจ่ายของงวด (หรือพรุ่งนี้ถ้าเลยมาแล้ว): '+promptDef);
  console.log('[ทุกสาขา: หน้าร้าน + ออฟฟิศ]');
  E(`kbizGo('')`); const fa=files.pop();
  ok(fa && fa.aoa.slice(3).some(r=>r[1]==='7777777777') && /หลายรอบจ่าย/.test(alerts.at(-1)),'รวมออฟฟิศด้วย + เตือนว่ามีหลายรอบจ่ายในไฟล์เดียว');
  console.log('[ยกเลิก/วันที่ผิด]');
  const n0=files.length; promptAns=null; E(`kbizGo('JJRD')`); ok(files.length===n0,'กดยกเลิกที่ถามวันที่ = ไม่สร้างไฟล์');
  promptAns='01/01/2020'; E(`kbizGo('JJRD')`); ok(files.length===n0,'วันย้อนหลัง = ไม่สร้างไฟล์ (ธนาคารไม่รับ)');
  console.log('[ไฟล์โอนเบิกกลางเดือนยังเหมือนเดิม]');
  promptAns=undefined; E(`openKbizBranch('adv'); kbizGo('JJRD')`); const fv=files.pop();
  ok(fv && fv.f==='KBIZ_Advance_JJRD_2026-09.xlsx' && fv.aoa.slice(3).length===1 && fv.aoa.slice(3)[0][3]===300 && fv.aoa[0][3]===300,'เบิกกลางเดือน: 1 รายการ 300 บาท ชื่อไฟล์เดิม');
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.filter(x=>!/scrollTo/.test(x)).slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
