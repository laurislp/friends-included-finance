const {json,db,validSplit}=require('./lib');
module.exports=async(req,res)=>{try{
 const secret=req.query?.secret; if(secret!==process.env.TELEGRAM_WEBHOOK_SECRET) return json(res,401,{ok:false}); const m=req.body?.message; if(!m?.chat?.id) return json(res,200,{ok:true});
 const employees=await db(`employees?telegram_user_id=eq.${m.from.id}&select=*`); const emp=employees[0]; const send=async text=>fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:m.chat.id,text})});
 if(!emp) {await send('Your Telegram account is not linked. Ask Svetlana to link your user and chat IDs in the website setup page.');return json(res,200,{ok:true});}
 const parts=(m.text||'').trim().split('|').map(x=>x.trim()); if(parts[0]==='/start'){await send(`Linked to ${emp.name}. Submit sales or expenses using the website, or use /help.`);return json(res,200,{ok:true});}
 await send('Use the website for the complete form. Your account is linked as '+emp.name+'.');json(res,200,{ok:true});
 }catch(e){json(res,500,{ok:false,error:e.message})}};
