import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','PATCH','DELETE'];
async function context(req,res){
 const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase();
 const w=(await db.query("SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status='active'",[slug])).rows[0];
 if(!w){res.status(404).json({error:'Store not found.'});return null;}
 const superAdmin=await isSuperAdmin(req.user.id);
 const m=(await db.query("SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status='active'",[w.id,req.user.id])).rows[0];
 if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role))){res.status(403).json({error:'You cannot moderate community content.'});return null;}
 return w.id;
}
export default async function(req,res){
 const wid=await context(req,res);if(!wid)return;
 if(req.method==='GET'){
  const [reviews,comments]=await Promise.all([
   db.query("SELECT r.id,r.customer_name,r.rating,r.title,r.body,r.status,r.created_at,r.product_id,p.name AS product_name FROM atelier_customer_reviews r LEFT JOIN atelier_products p ON p.id=r.product_id WHERE r.workspace_id=$1 ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 300",[wid]),
   db.query("SELECT c.id,c.customer_name,c.body,c.status,c.created_at,c.content_id,i.title AS post_title FROM atelier_post_comments c JOIN atelier_content_items i ON i.id=c.content_id WHERE c.workspace_id=$1 ORDER BY CASE c.status WHEN 'pending' THEN 0 ELSE 1 END,c.created_at DESC LIMIT 300",[wid])
  ]);
  return res.json({reviews:reviews.rows,comments:comments.rows});
 }
 const b=req.body||{},kind=String(b.kind||''),id=String(b.id||''),status=String(b.status||'');
 if(!id||!['review','comment'].includes(kind))return res.status(400).json({error:'Choose a review or comment.'});
 const table=kind==='review'?'atelier_customer_reviews':'atelier_post_comments';
 if(req.method==='PATCH'){
  if(!['pending','approved','rejected'].includes(status))return res.status(400).json({error:'Invalid moderation status.'});
  const r=await db.query("UPDATE "+table+" SET status=$1,moderated_at=NOW(),moderated_by=$2 WHERE id=$3 AND workspace_id=$4 RETURNING id,status",[status,req.user.id,id,wid]);
  if(!r.rows[0])return res.status(404).json({error:'Submission not found.'});
  await db.query("INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[wid,req.user.id,kind+'.'+status,kind,id,JSON.stringify({status})]);
  return res.json({ok:true,status});
 }
 const r=await db.query("DELETE FROM "+table+" WHERE id=$1 AND workspace_id=$2 RETURNING id",[id,wid]);
 if(!r.rows[0])return res.status(404).json({error:'Submission not found.'});
 await db.query("INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)",[wid,req.user.id,kind+'.deleted',kind,id]);
 return res.json({ok:true,deleted:true});
}