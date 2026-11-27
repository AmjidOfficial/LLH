import { db, storage } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
import { randomUUID } from 'node:crypto';
export const access = 'user';
export const methods = ['POST'];
const MAX=10*1024*1024;
function imageOk(b,t){
  if(t==='image/jpeg')return b[0]===255&&b[1]===216&&b[2]===255;
  if(t==='image/png')return b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;
  if(t==='image/webp')return b.toString('ascii',8,12)==='WEBP';
  return false;
}
export default async function(req,res){
  const slug=String(req.body?.store||'').trim().toLowerCase(),id=String(req.body?.content_id||'');
  const w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
  if(!w)return res.status(404).json({error:'Store not found.'});
  const superAdmin=await isSuperAdmin(req.user.id);
  const m=(await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[w.id,req.user.id,'active'])).rows[0];
  if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role)))return res.status(403).json({error:'You cannot upload website media.'});
  const item=(await db.query('SELECT id,image_key FROM atelier_content_items WHERE id=$1 AND workspace_id=$2 AND archived_at IS NULL',[id,w.id])).rows[0];
  if(!item)return res.status(404).json({error:'Content item not found.'});
  const f=(req.files||[]).find(x=>x.field==='image');
  if(!f||!f.buffer)return res.status(400).json({error:'Choose an image.'});
  if(f.buffer.length>MAX)return res.status(413).json({error:'Image must be under 10 MB.'});
  if(!imageOk(f.buffer,f.contentType))return res.status(415).json({error:'Use a valid JPG, PNG or WebP image.'});
  const ext=f.contentType==='image/png'?'png':f.contentType==='image/webp'?'webp':'jpg';
  const key='content/'+w.id+'/'+id+'/'+randomUUID()+'.'+ext;
  await storage.put(key,f.buffer,f.contentType);
  await db.query('UPDATE atelier_content_items SET image_key=$1,updated_by=$2,updated_at=NOW() WHERE id=$3 AND workspace_id=$4',[key,req.user.id,id,w.id]);
  if(item.image_key)await storage.del(item.image_key).catch(()=>{});
  return res.json({ok:true,image_url:await storage.url(key,{ttl:300})});
}