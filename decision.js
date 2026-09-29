const {json,db,requireRole,validSplit,splitMath,telegram}=require('./lib');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST') return json(res,405,{error:'POST only'}); const b=req.body||{}; requireRole(b.actor,['manager']);
 const rows=await db(`transactions?reference=eq.${encodeURIComponent(b.reference)}&select=*`); const t=rows[0]; if(!t) throw new Error('Transaction not found.'); if(t.status==='Approved') return json(res,200,{transaction:t,idempotent:true});
 let update={status:'Approved',approval_at:new Date().toISOString()}; let message;
 if(t.type==='sale'){
  if(!validSplit(b.split)) throw new Error('Final split must total exactly 100%.'); const m=splitMath(t.amount,b.split); update={...update,final_split:b.split,commission_pool:m.pool,earned:m.earned};
  const changed=JSON.stringify(t.proposed_split)!==JSON.stringify(b.split); message=`Approved sale ${t.reference}: €${Number(t.amount).toFixed(2)}. Final split Richard ${b.split.richard}% (€${m.earned.richard.toFixed(2)}), Anastasia ${b.split.anastasia}% (€${m.earned.anastasia.toFixed(2)}), Jean-Claude ${b.split['jean-claude']}% (€${m.earned['jean-claude'].toFixed(2)}).${changed?' Changed from the original proposal.':''}`;
 }else{
  if(!['A','B','Overhead'].includes(b.allocation)) throw new Error('Choose a final allocation.'); update={...update,final_allocation:b.allocation}; message=`Approved expense ${t.reference}: €${Number(t.amount).toFixed(2)} — final allocation ${b.allocation}.${t.proposed_allocation!==b.allocation?` Changed from ${t.proposed_allocation}.`:''}`;
 }
 const notify=await telegram(message,t.origin_chat_id); update.notification_status=notify.status; update.notification_error=notify.error||null;
 const saved=await db(`transactions?reference=eq.${encodeURIComponent(t.reference)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(update)}); json(res,200,{transaction:saved[0]});
 }catch(e){json(res,400,{error:e.message})}};
