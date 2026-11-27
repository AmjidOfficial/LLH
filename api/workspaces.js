import { db } from 'hatchable';
import { randomUUID } from 'node:crypto';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','POST'];
export default async function(req,res){
  const user=req.user;
  const superAdmin=await isSuperAdmin(user.id);
  if(req.method==='GET'){
    if(superAdmin){
      const all=(await db.query("SELECT w.id,w.name,w.slug,w.plan_key,w.status,'super_admin' AS role FROM saas_workspaces w WHERE w.status='active' ORDER BY w.created_at DESC")).rows;
      return res.json({workspaces:all,claimable:[],platform_role:'super_admin'});
    }
    const r=await db.query("SELECT w.id,w.name,w.slug,w.plan_key,w.status,COALESCE(m.role,CASE WHEN w.owner_user_id=$1 THEN 'owner' END) AS role FROM saas_workspaces w LEFT JOIN saas_memberships m ON m.workspace_id=w.id AND m.user_id=$1 AND m.status=$2 WHERE (m.user_id=$1 OR w.owner_user_id=$1) ORDER BY w.created_at DESC",[user.id,'active']);
    const claimable=(await db.query("SELECT id,name,slug FROM saas_workspaces w WHERE (owner_user_id IS NULL OR owner_user_id=$1) AND status='active' AND NOT EXISTS(SELECT 1 FROM saas_memberships m WHERE m.workspace_id=w.id) ORDER BY created_at ASC LIMIT 10",[user.id])).rows;
    return res.json({workspaces:r.rows,claimable});
  }
  if(!superAdmin)return res.status(403).json({error:'Only a platform Super Admin can create workspaces.'});
  const name=String(req.body?.name||'').trim();
  const slug=String(req.body?.slug||'').trim().toLowerCase();
  if(name.length<2||name.length>100)return res.status(400).json({error:'Workspace name must be 2 to 100 characters.'});
  if(!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(slug))return res.status(400).json({error:'Use a simple URL slug with letters, numbers and hyphens.'});
  const id=randomUUID();
  try{
    await db.transaction([
      {sql:'INSERT INTO saas_workspaces(id,name,slug,owner_user_id) VALUES($1,$2,$3,$4)',params:[id,name,slug,user.id]},
      {sql:'INSERT INTO saas_memberships(workspace_id,user_id,role) VALUES($1,$2,$3)',params:[id,user.id,'owner']},
      {sql:'INSERT INTO saas_storefronts(workspace_id,display_name) VALUES($1,$2)',params:[id,name]},
      {sql:'INSERT INTO saas_subscriptions(workspace_id,plan_key,status) VALUES($1,$2,$3)',params:[id,'starter','trial']},
      {sql:'INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',params:[id,user.id,'workspace.created','workspace',id]}
    ]);
    return res.status(201).json({workspace:{id,name,slug,role:'super_admin',plan_key:'starter'}});
  }catch(e){
    if(String(e.message||'').toLowerCase().includes('unique'))return res.status(409).json({error:'That store URL is already in use.'});
    throw e;
  }
}