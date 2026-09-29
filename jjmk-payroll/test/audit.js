// เทสการจดประวัติการทำรายการ (payroll_audit) กับโค้ดจริงใน jjmk-payroll.html
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html=fs.readFileSync(__dirname+'/../../jjmk-payroll.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]+>/g,'');
const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push(e.message));
const writes=[]; let failAudit=false;
function chain(table){ let op='select', row=null; const b={};
  for(const m of ['select','eq','neq','gte','lte','lt','gt','in','is','not','or','order','limit','range','single','maybeSingle','on','subscribe']) b[m]=()=>b;
  for(const m of ['insert','update','upsert','delete']) b[m]=(r)=>{ op=m; row=r; return b; };
  b.then=(ok,er)=>{ let res={data:[],error:null,count:0};
    if(op!=='select'){ if(table==='payroll_audit' && failAudit) res={data:null,error:{message:'permission denied for table payroll_audit'}}; else writes.push({table,op,row}); }
    return Promise.resolve(res).then(ok,er); };
  return b; }
const dom=new JSDOM(html,{url:'https://thananant.github.io/JJ-PnL/jjmk-payroll.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){ w.supabase={createClient:()=>({from:t=>chain(t),channel:()=>chain('ch'),rpc:()=>chain('rpc'),removeChannel(){} })}; w.TextEncoder=require('util').TextEncoder; w.alert=()=>{}; w.confirm=()=>true; w.indexedDB=undefined; w.scrollTo=()=>{}; }});
const w=dom.window, d=w.document; const E=s=>w.eval(s);
let fail=0; const ok=(c,m)=>{console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++;};
const tick=()=>new Promise(r=>setTimeout(r,20));
const audits=()=>writes.filter(x=>x.table==='payroll_audit').map(x=>x.row.action);
setTimeout(async ()=>{ try{
  console.log('[จดว่าใครเปิดแอป]');
  E(`AUTH={username:'boss',display_name:'บอส',role:'owner'}; applyUser(AUTH); auditReady=false; auditOpen();`); await tick();
  ok(audits().length===0,'ยังไม่มีตารางประวัติ = ไม่จด ไม่พัง');
  E(`auditReady=true; auditOpen();`); await tick();
  ok(audits().join()==='open','เข้าจากหน้าศูนย์รวมแอพ = จด "เปิดแอป"');
  E(`auditOpen();`); await tick();
  ok(audits().length===1,'รีเฟรช/ลากลงในแท็บเดิม = ไม่จดซ้ำ');
  E(`auditPendingLogin=true; auditOpen();`); await tick();
  ok(audits().join()==='open,login' && !E('auditPendingLogin'),'พิมพ์รหัสในแอป = จด "เข้าสู่ระบบ" หลังโหลดข้อมูลเสร็จ');
  ok(/auditPendingLogin = true/.test(E('doLogin.toString()')) && !/auditWrite\('login'/.test(E('doLogin.toString()')),'doLogin ไม่จดเองก่อนรู้ว่ามีตาราง (เดิมหายทุกครั้ง)');
  ok(/applyPermUI\(\);\s*auditOpen\(\);/.test(E('startApp.toString()')),'startApp เรียก auditOpen หลังโหลดข้อมูลเสร็จ');
  console.log('[จดทุกการเขียนข้อมูล]');
  E(`go('adv')`); await w.eval(`db.from('advances').insert({employee_id:1,amount:500})`); await tick();
  const last=writes.filter(x=>x.table==='payroll_audit').pop();
  ok(last && last.row.action==='insert' && last.row.tbl==='advances' && last.row.username==='boss' && /500/.test(last.row.detail),'เพิ่มรายการเบิก → จด ใคร/ตาราง/รายละเอียด');
  console.log('[จดไม่สำเร็จต้องบอก]');
  failAudit=true; let toasts=[]; w.toast=m=>toasts.push(m);
  E(`auditWrite('update','employees','x')`); await tick();
  ok(/permission denied/.test(E('auditLastErr')) && toasts.some(t=>/จดประวัติการทำรายการไม่สำเร็จ/.test(t)),'insert ล้ม → เก็บสาเหตุ + แจ้งเตือน (เดิมเงียบ)');
  E(`auditWrite('update','employees','y')`); await tick();
  ok(toasts.filter(t=>/จดประวัติ/.test(t)).length===1,'แจ้งเตือนครั้งเดียว ไม่รัว');
}catch(e){ console.log('CRASH',e.stack); fail++; }
 if(errs.length) console.log('jsdom:',errs.filter(x=>!/scrollTo/.test(x)).slice(0,3).join(' | '));
 console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
},400);
