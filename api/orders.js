import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','PATCH'];
async function getMember(workspaceId,userId){return (await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[workspaceId,userId,'active'])).rows[0]||null;}
export default async function(req,res){
 const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase(),w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
 if(!w)return res.status(404).json({error:'Workspace not found.'});
 const superAdmin=await isSuperAdmin(req.user.id),m=await getMember(w.id,req.user.id);
 if(!m&&!superAdmin&&w.owner_user_id!==req.user.id)return res.status(403).json({error:'You are not a member of this store.'});
 if(req.method==='GET'){
  const r=await db.query('SELECT id,order_number,customer_name,customer_phone,subtotal_pkr,shipping_pkr,total_pkr,currency,payment_method,payment_status,order_status,created_at FROM commerce_orders WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100',[w.id]);
  return res.json({orders:r.rows,role:m?.role||'super_admin'});
 }
 if(!superAdmin&&w.owner_user_id!==req.user.id&&!['owner','admin','manager'].includes(m?.role))return res.status(403).json({error:'You cannot update orders.'});
 const id=String(req.body?.order_id||''),status=String(req.body?.order_status||''),allowed=['placed','confirmed','processing','ready_to_ship','shipped','delivered','cancelled'];
 if(!id||!allowed.includes(status))return res.status(400).json({error:'Invalid order or status.'});
 const current=(await db.query('SELECT id,order_status FROM commerce_orders WHERE id=$1 AND workspace_id=$2',[id,w.id])).rows[0];
 if(!current)return res.status(404).json({error:'Order not found.'});
 if(current.order_status===status)return res.json({order:current});
 if(current.order_status==='cancelled'||current.order_status==='delivered')return res.status(409).json({error:'This order is already closed and cannot be moved to another status.'});
 const statements=[];
 if(status==='cancelled')statements.push({sql:'SELECT release_cancelled_order_inventory($1,$2)',params:[id,w.id]});
 if(status==='delivered'&&current.order_status!=='delivered')statements.push({sql:'SELECT complete_order_sales($1,$2)',params:[id,w.id]});
 statements.push({sql:'UPDATE commerce_orders SET order_status=$1,updated_at=NOW() WHERE id=$2 AND workspace_id=$3 RETURNING id,order_number,order_status',params:[status,id,w.id]});
 statements.push({sql:'INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',params:[w.id,req.user.id,'order.status_changed','order',id,JSON.stringify({status,previous:current.order_status})]});
 const result=await db.transaction(statements),updated=result.results?.[statements.length-2]?.rows?.[0]||{id,order_status:status};
 return res.json({order:updated});
}