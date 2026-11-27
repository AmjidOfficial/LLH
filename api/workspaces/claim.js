import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['POST'];
export default async function(req,res){
  const owner=await isSuperAdmin(req.user.id);
  if(!owner)return res.status(403).json({error:'Only a platform Super Admin can claim this private workspace.'});
  const slug=String(req.body?.slug||'').trim().toLowerCase();
  const w=(await db.query('SELECT id,name,slug FROM saas_workspaces WHERE slug=$1 AND (owner_user_id IS NULL OR owner_user_id=$2) AND status=$3',[slug,req.user.id,'active'])).rows[0];
  if(!w)return res.status(409).json({error:'This workspace has already been claimed or is not available.'});
  const result=await db.transaction([
    {sql:'UPDATE saas_workspaces SET owner_user_id=$1,updated_at=NOW() WHERE id=$2 AND (owner_user_id IS NULL OR owner_user_id=$1) AND NOT EXISTS(SELECT 1 FROM saas_memberships WHERE workspace_id=$2 AND role=$3) RETURNING id',params:[req.user.id,w.id,'owner']},
    {sql:'INSERT INTO saas_memberships(workspace_id,user_id,role) SELECT $1,$2,$3 WHERE EXISTS(SELECT 1 FROM saas_workspaces WHERE id=$1 AND owner_user_id=$2) ON CONFLICT(workspace_id,user_id) DO NOTHING RETURNING id',params:[w.id,req.user.id,'owner']},
    {sql:'INSERT INTO saas_subscriptions(workspace_id,plan_key,status) VALUES($1,$2,$3) ON CONFLICT(workspace_id) DO NOTHING',params:[w.id,'founder','trial']},
    {sql:'INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',params:[w.id,req.user.id,'workspace.claimed','workspace',w.id]}
  ]);
  if(!result.results[0]?.rowCount||!result.results[1]?.rowCount)return res.status(409).json({error:'This workspace is already claimed.'});
  return res.json({workspace:{...w,role:'owner'}});
}