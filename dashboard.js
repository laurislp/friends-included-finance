const {json,db,employeeRoles,cents}=require('./lib');
module.exports=async(req,res)=>{try{
 const actor=req.query?.actor; if(!employeeRoles[actor]) throw new Error('Choose a demonstration role.');
 const all=await db('transactions?select=*&order=submitted_at.asc');
 const own=employeeRoles[actor]==='sales'?all.filter(x=>x.type==='sale'&&x.submitted_by===actor):employeeRoles[actor]==='expenses'?all.filter(x=>x.type==='expense'&&x.submitted_by===actor):all;
 const approved=all.filter(x=>x.status==='Approved'), expenses=all.filter(x=>x.type==='expense'), sales=approved.filter(x=>x.type==='sale');
 const project=(p)=>{const income=sales.filter(x=>x.project===p).reduce((s,x)=>s+Number(x.amount),0);const comm=sales.filter(x=>x.project===p).reduce((s,x)=>s+Number(x.commission_pool),0);const ex=expenses.filter(x=>x.final_allocation===p).reduce((s,x)=>s+Number(x.amount),0);return {income:cents(income),commissions:cents(comm),expenses:cents(ex),result:cents(income-comm-ex)}};
 const income=sales.reduce((s,x)=>s+Number(x.amount),0),comm=sales.reduce((s,x)=>s+Number(x.commission_pool),0),ex=expenses.reduce((s,x)=>s+Number(x.amount),0);
 const earned={richard:0,anastasia:0,'jean-claude':0}; sales.forEach(x=>Object.keys(earned).forEach(k=>earned[k]+=Number(x.earned?.[k]||0)));
 json(res,200,{role:employeeRoles[actor],records:own,manager:employeeRoles[actor]==='manager'?{all}:null,financials:{A:project('A'),B:project('B'),company:{income:cents(income),commissions:cents(comm),expenses:cents(ex),result:cents(income-comm-ex)},earned:Object.fromEntries(Object.entries(earned).map(([k,v])=>[k,cents(v)])),overhead:cents(expenses.filter(x=>x.final_allocation==='Overhead'||x.proposed_allocation==='Overhead').reduce((s,x)=>s+Number(x.amount),0)),awaiting:cents(expenses.filter(x=>!x.final_allocation&&x.proposed_allocation!=='Overhead').reduce((s,x)=>s+Number(x.amount),0))}});
 }catch(e){json(res,400,{error:e.message})}};
