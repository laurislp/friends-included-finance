const {json,db,requireRole,validSplit}=require('./lib');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST') return json(res,405,{error:'POST only'}); const b=req.body||{}; const actor=b.actor;
 if(!b.reference||!b.description||!Number.isFinite(Number(b.amount))||Number(b.amount)<=0) throw new Error('Reference, description and a positive amount are required.');
 if(!/^(S0[1-5]|E0[1-7]|[A-Z][A-Z0-9-]{2,30})$/.test(b.reference)) throw new Error('Use a unique reference such as S01 or E01.');
 let row={reference:b.reference.trim(),type:b.type,submitted_by:actor,origin:'web',description:b.description.trim(),amount:Number(b.amount),status:'Pending',notification_status:'not-applicable'};
 if(b.type==='sale'){requireRole(actor,['sales']); if(!b.customer||!['A','B'].includes(b.project)||!validSplit(b.split)) throw new Error('Sale requires customer, project A/B and a 100% proposed split.'); Object.assign(row,{customer:b.customer.trim(),project:b.project,proposed_split:b.split});}
 else if(b.type==='expense'){requireRole(actor,['expenses']); if(!['Materials','Travel','Other'].includes(b.category)||!['A','B','Overhead'].includes(b.allocation)) throw new Error('Expense requires category and allocation.'); Object.assign(row,{category:b.category,proposed_allocation:b.allocation});}
 else throw new Error('Unknown transaction type.');
 const data=await db('transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)}); json(res,201,{transaction:data[0]});
 }catch(e){json(res,400,{error:e.message})}};
