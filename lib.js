const json = (res, code, body) => { res.status(code).setHeader('Content-Type','application/json'); res.end(JSON.stringify(body)); };
const env = (name) => { if (!process.env[name]) throw new Error(`Missing ${name}`); return process.env[name]; };
async function db(path, options={}) {
  const base=env('SUPABASE_URL').replace(/\/$/,'');
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'return=representation',...(options.headers||{})}});
  const text=await r.text(); let data; try {data=JSON.parse(text)} catch {data=text}
  if(!r.ok) throw new Error(typeof data==='object'?(data.message||data.hint||JSON.stringify(data)):text);
  return data;
}
const employeeRoles={svetlana:'manager',richard:'sales',anastasia:'sales','jean-claude':'sales',kevin:'expenses'};
function requireRole(role, allowed) { if(!allowed.includes(employeeRoles[role])) throw new Error('This action is not permitted for the selected role.'); }
function cents(n){return Math.round(Number(n)*100)/100}
function splitMath(amount, split){
 const pool=cents(amount*.1), ids=['richard','anastasia','jean-claude']; let values={}, total=0;
 for(const id of ids){values[id]=cents(pool*(Number(split[id]||0)/100));total+=values[id]}
 let residual=cents(pool-total); if(residual){const max=Math.max(...ids.map(i=>Number(split[i]||0))); const winner=ids.find(i=>Number(split[i]||0)===max); values[winner]=cents(values[winner]+residual)}
 return {pool,earned:values};
}
function validSplit(s){const ids=['richard','anastasia','jean-claude']; return ids.every(i=>Number.isFinite(Number(s?.[i]))&&Number(s[i])>=0&&Number(s[i])<=100)&&ids.reduce((x,i)=>x+Number(s[i]),0)===100}
async function telegram(text, chatId){
 if(!chatId) return {status:'not-applicable'};
 try{const r=await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text})}); if(!r.ok) throw new Error(await r.text()); return {status:'sent'};}catch(e){return {status:'failed',error:e.message}}
}
module.exports={json,db,requireRole,employeeRoles,cents,splitMath,validSplit,telegram};
