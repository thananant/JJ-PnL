// parse ทุก script block ของ jjmk-pnl.html (ต้อง bad: 0)
const fs=require('fs');const f=process.argv[2]||'jjmk-pnl.html';const h=fs.readFileSync(f,'utf8');
const re=/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0,bad=0;
while((m=re.exec(h))){i++;try{new Function(m[1]);}catch(e){bad++;console.log('block',i,'ERR',e.message);}}
console.log('blocks:',i,'bad:',bad); process.exit(bad?1:0);
