const crypto=require('crypto');
const BASE='https://friends-included-finance-gamma.vercel.app';
const env=n=>{if(!process.env[n])throw Error('Missing '+n);return process.env[n]};
async function db(path,o={}){const key=env('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(env('SUPABASE_URL')+'/rest/v1/'+path,{...o,headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'return=representation','Content-Type':'application/json',...o.headers}});const d=await r.json();if(!r.ok)throw Error(d.message||'Database failed');return d;}
async function tg(method,body){const r=await fetch('https://api.telegram.org/bot'+env('TELEGRAM_BOT_TOKEN')+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!d.ok)throw Error(d.description||'Telegram failed');return d.result;}
const secret=()=>crypto.createHmac('sha256',env('TELEGRAM_BOT_TOKEN')).update('friends-included-webhook-v2').digest('hex');
const help='Sales: /sale REF|Customer|A or B|Description|Amount|Richard %|Anastasia %|Jean-Claude %\nExample: /sale S06|Olivia Rose|A|Ceremony guests|100|50|30|20\n\nExpenses (Kevin): /expense REF|Description|Materials, Travel or Other|A, B or Overhead|Amount\nExample: /expense E08|Taxi to venue|Travel|A|25\n\nUse a new reference. Splits must total 100. Saved entries are Pending; manager approval replies here.';
module.exports=async(req,res)=>{try{
 if(req.method==='GET'){if(req.query.setup==='1')await tg('setWebhook',{url:BASE+'/api/telegram',secret_token:secret(),allowed_updates:['message']});const i=await tg('getWebhookInfo',{});return res.json({ok:true,url:i.url,pending:i.pending_update_count,lastError:i.last_error_message||null});}
 if(req.headers['x-telegram-bot-api-secret-token']!==secret())return res.status(401).json({ok:false});
 const m=req.body?.message;if(!m?.from?.id||m.chat?.type!=='private'||!m.text)return res.json({ok:true});
 const send=text=>tg('sendMessage',{chat_id:m.chat.id,text});
 const emp=(await db('employees?telegram_user_id=eq.'+m.from.id+'&select=id,name,role'))[0];
 const identity='Your Telegram user ID: '+m.from.id+'\nChat ID: '+m.chat.id;
 const match=m.text.trim().match(/^(\/\w+)(?:@\w+)?(?:\s+|\|)?([\s\S]*)$/),verb=match?.[1].toLowerCase();
 if(['/start','/help','/id'].includes(verb)){await send((emp?'Linked to '+emp.name+'.':'Not linked yet. Ask the manager to enter these IDs in Bot setup.')+'\n'+identity+'\n\n'+help);return res.json({ok:true});}
 if(!emp){await send('Link your account in Bot setup first.\n'+identity);return res.json({ok:true});}
 let row;
 try{const p=(match?.[2]||'').split('|').map(s=>s.trim());
 if(verb==='/sale'){const [reference,customer,project,description,amount,r,a,j]=p,split={richard:+r,anastasia:+a,'jean-claude':+j};
 if(emp.role!=='sales'||p.length!==8||p.some(v=>!v)||!['A','B'].includes(project)||!Number.isFinite(+amount)||+amount<=0||Object.values(split).some(n=>!Number.isFinite(n)||n<0||n>100)||Math.abs(+r+ +a+ +j-100)>0.000001)throw Error('Check sale fields and the 100% split; send /help for the format.');
 row={reference,type:'sale',submitted_by:emp.id,customer,project,description,amount:+amount,proposed_split:split};
 }else if(verb==='/expense'){const [reference,description,category,allocation,amount]=p;
 if(emp.role!=='expenses'||p.length!==5||p.some(v=>!v)||!['Materials','Travel','Other'].includes(category)||!['A','B','Overhead'].includes(allocation)||!Number.isFinite(+amount)||+amount<=0)throw Error('Check expense fields; only Kevin submits expenses. Send /help.');
 row={reference,type:'expense',submitted_by:emp.id,description,category,proposed_allocation:allocation,amount:+amount};
 }else{await send(help);return res.json({ok:true});}
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(row.reference))throw Error('Use letters, numbers, hyphens or underscores in the reference.');
 Object.assign(row,{origin:'telegram',origin_chat_id:m.chat.id,status:'Pending',notification_status:'pending'});
 if((await db('transactions?reference=eq.'+encodeURIComponent(row.reference)+'&select=reference')).length){await send(row.reference+' already exists. No duplicate was created.');return res.json({ok:true});}
 await db('transactions',{method:'POST',body:JSON.stringify(row)});
 }catch(e){await send('Not saved: '+e.message);return res.json({ok:true});}
 await send(row.reference+' saved as Pending'+(row.type==='expense'?' (awaiting allocation), proposed '+row.proposed_allocation:'')+': EUR '+row.amount.toFixed(2)+'. '+(row.type==='expense'?'Company result is reduced immediately. ':'')+'The manager can now approve it in Records. The final decision will be sent to this chat.');
 await db('transactions?reference=eq.'+encodeURIComponent(row.reference),{method:'PATCH',body:JSON.stringify({notification_status:'sent'})});
 const sync=await require('./index').syncLedger(row.reference);
 if(!sync.ok)console.error('Sheet sync failed for '+row.reference);
 return res.json({ok:true});
}catch(e){console.error('Telegram failed:',e.message);return res.status(500).json({ok:false,error:'Telegram update failed'});}};
