import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','POST'];
export default async function(req,res){
  const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase();
  const w=(await db.query('SELECT id,name,slug,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
  if(!w)return res.status(404).json({error:'Workspace not found.'});
  const superAdmin=await isSuperAdmin(req.user.id);
  const m=(await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[w.id,req.user.id,'active'])).rows[0];
  if(!m&&!superAdmin&&w.owner_user_id!==req.user.id)return res.status(403).json({error:'You are not a member of this store.'});
  if(req.method==='GET'){
    const s=(await db.query('SELECT display_name,description,logo_url,primary_colour,accent_colour,currency,country_code,whatsapp_phone,business_address,map_url,facebook_url,published FROM saas_storefronts WHERE workspace_id=$1',[w.id])).rows[0];
    return res.json({workspace:w,storefront:s,role:m?.role||'super_admin'});
  }
  if(!superAdmin&&w.owner_user_id!==req.user.id&&!['owner','admin'].includes(m?.role))return res.status(403).json({error:'Only the owner, admin or platform Super Admin can change storefront settings.'});
  const b=req.body||{};
  const name=String(b.display_name||w.name).trim().slice(0,100);
  const description=String(b.description||'').trim().slice(0,1200);
  const primary=/^#[0-9a-f]{6}$/i.test(b.primary_colour)?b.primary_colour:'#241b15';
  const accent=/^#[0-9a-f]{6}$/i.test(b.accent_colour)?b.accent_colour:'#b47b4b';
  const phone=String(b.whatsapp_phone||'').replace(/[^0-9+]/g,'').slice(0,24);
  const address=String(b.business_address||'').trim().slice(0,300);
  const mapUrl=String(b.map_url||'').trim().slice(0,500);
  const facebookUrl=String(b.facebook_url||'').trim().slice(0,500);
  await db.query('UPDATE saas_storefronts SET display_name=$1,description=$2,primary_colour=$3,accent_colour=$4,whatsapp_phone=$5,published=$6,business_address=$7,map_url=$8,facebook_url=$9,updated_at=NOW() WHERE workspace_id=$10',[name,description,primary,accent,phone,!!b.published,address,mapUrl,facebookUrl,w.id]);
  await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,details) VALUES($1,$2,$3,$4,$5::jsonb)',[w.id,req.user.id,'storefront.updated','storefront',JSON.stringify({published:!!b.published})]);
  return res.json({ok:true});
}