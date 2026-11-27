import { db, storage } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','POST','PUT','DELETE'];
async function getContext(req,res){
  const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase();
  const w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
  if(!w){res.status(404).json({error:'Store not found.'});return null;}
  const superAdmin=await isSuperAdmin(req.user.id);
  const m=(await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[w.id,req.user.id,'active'])).rows[0];
  if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role))){res.status(403).json({error:'You do not have permission to manage website content.'});return null;}
  return {workspaceId:w.id};
}
const allowedTypes=['post','page_section','gallery'];
const allowedPlacements=['journal','hero','intro','craft','tryon','fit','contact','category-jackets','category-bags','category-accessories','announcement'];
function cleanTags(value){
  const raw=Array.isArray(value)?value:String(value||'').split(',');
  return [...new Set(raw.map(x=>String(x).trim().replace(/^#/,'').slice(0,32)).filter(Boolean))].slice(0,12);
}
export default async function(req,res){
  const c=await getContext(req,res);if(!c)return;
  const wid=c.workspaceId;
  if(req.method==='GET'){
    const rows=await db.query("SELECT id,content_type,title,body,image_key,image_alt,tags,placement,status,is_pinned,sort_order,starts_at,ends_at,created_at,updated_at FROM atelier_content_items WHERE workspace_id=$1 AND archived_at IS NULL ORDER BY is_pinned DESC,sort_order ASC,updated_at DESC LIMIT 300",[wid]);
    const items=await Promise.all(rows.rows.map(async x=>({...x,image_url:x.image_key?await storage.url(x.image_key,{ttl:3600}):null})));
    return res.json({items});
  }
  const b=req.body||{},id=String(b.id||'');
  if(req.method==='POST'||req.method==='PUT'){
    const type=String(b.content_type||'post'),title=String(b.title||'').trim(),placement=String(b.placement||'journal');
    const status=['draft','published','archived'].includes(b.status)?b.status:'draft';
    if(!allowedTypes.includes(type)||title.length<2||title.length>180||!allowedPlacements.includes(placement))return res.status(400).json({error:'Check the content type, title and placement.'});
    const body=String(b.body||'').slice(0,5000),tags=cleanTags(b.tags),pinned=!!b.is_pinned,sort=Number.isInteger(Number(b.sort_order))?Math.max(-10000,Math.min(10000,Number(b.sort_order))):0;
    if(b.starts_at&&b.ends_at&&new Date(b.ends_at)<=new Date(b.starts_at))return res.status(400).json({error:'End date must be after start date.'});
    let result;
    if(req.method==='PUT'){
      if(!id)return res.status(400).json({error:'Content item ID is required.'});
      result=await db.query("UPDATE atelier_content_items SET content_type=$1,title=$2,body=$3,image_alt=$4,tags=$5,placement=$6,status=$7,is_pinned=$8,sort_order=$9,starts_at=$10,ends_at=$11,updated_by=$12,updated_at=NOW() WHERE id=$13 AND workspace_id=$14 AND archived_at IS NULL RETURNING id,title,content_type,status,placement",[type,title,body,String(b.image_alt||'').slice(0,240),tags,placement,status,pinned,sort,b.starts_at||null,b.ends_at||null,req.user.id,id,wid]);
      if(!result.rows[0])return res.status(404).json({error:'Content item not found.'});
    }else{
      result=await db.query("INSERT INTO atelier_content_items(workspace_id,content_type,title,body,image_alt,tags,placement,status,is_pinned,sort_order,starts_at,ends_at,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING id,title,content_type,status,placement",[wid,type,title,body,String(b.image_alt||'').slice(0,240),tags,placement,status,pinned,sort,b.starts_at||null,b.ends_at||null,req.user.id]);
    }
    await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[wid,req.user.id,req.method==='POST'?'content.created':'content.updated','content',result.rows[0].id,JSON.stringify({content_type:type,placement,status})]);
    return res.status(req.method==='POST'?201:200).json({item:result.rows[0]});
  }
  if(req.method==='DELETE'){
    if(!id)return res.status(400).json({error:'Content item ID is required.'});
    const r=await db.query("UPDATE atelier_content_items SET status='archived',archived_at=NOW(),updated_at=NOW(),updated_by=$1 WHERE id=$2 AND workspace_id=$3 AND archived_at IS NULL RETURNING id,image_key",[req.user.id,id,wid]);
    if(!r.rows[0])return res.status(404).json({error:'Content item not found.'});
    await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[wid,req.user.id,'content.archived','content',id]);
    return res.json({ok:true,archived:true});
  }
  return res.status(405).json({error:'Method not supported.'});
}