import { db, storage } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','POST','PUT','DELETE'];
async function member(workspaceId,userId){return (await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[workspaceId,userId,'active'])).rows[0]||null;}
export default async function(req,res){
 if(req.method==='GET'){
  const slug=String(req.query?.store||'').trim().toLowerCase(),w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
  if(!w)return res.status(404).json({error:'Workspace not found.'});
  const superAdmin=await isSuperAdmin(req.user.id),m=await member(w.id,req.user.id);
  if(!m&&!superAdmin&&w.owner_user_id!==req.user.id)return res.status(403).json({error:'You are not a member of this store.'});
  const r=await db.query('SELECT id,name,category,style,leather_type,description,image_url,price_pkr,compare_at_pkr,offer_price_pkr,offer_starts_at,offer_ends_at,price_status,published,sku,slug,stock_status,tryon_enabled,product_details,quantity_on_hand,quantity_reserved,sold_count,product_status FROM atelier_products WHERE workspace_id=$1 AND archived_at IS NULL ORDER BY created_at DESC LIMIT 250',[w.id]);
  const products=await Promise.all(r.rows.map(async p=>({...p,image_url:p.image_url?.startsWith('storage:')?await storage.url(p.image_url.slice(8),{ttl:300}):p.image_url})));
  return res.json({products,role:m?.role||'super_admin'});
 }
 const b=req.body||{},slug=String(b.store||'').trim().toLowerCase(),w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
 if(!w)return res.status(404).json({error:'Workspace not found.'});
 const superAdmin=await isSuperAdmin(req.user.id),m=await member(w.id,req.user.id);
 if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role)))return res.status(403).json({error:'Only store owners, admins, managers and Super Admins can manage products.'});
 const productId=String(b.id||'');
 if(req.method==='DELETE'){
  if(!productId)return res.status(400).json({error:'Product id is required.'});
  const a=await db.query("UPDATE atelier_products SET published=false,tryon_enabled=false,product_status='archived',archived_at=NOW(),updated_at=NOW(),updated_by=$1 WHERE id=$2 AND workspace_id=$3 RETURNING id",[req.user.id,productId,w.id]);
  if(!a.rows[0])return res.status(404).json({error:'Product not found.'});
  await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[w.id,req.user.id,'product.archived','product',productId]);
  return res.json({ok:true,archived:true});
 }
 const name=String(b.name||'').trim(),category=String(b.category||'').trim(),price=b.price_pkr===''||b.price_pkr==null?null:Number(b.price_pkr),compare=b.compare_at_pkr===''||b.compare_at_pkr==null?null:Number(b.compare_at_pkr),offer=b.offer_price_pkr===''||b.offer_price_pkr==null?null:Number(b.offer_price_pkr),offerStart=b.offer_starts_at||null,offerEnd=b.offer_ends_at||null;
 if(name.length<2||name.length>180||!['Jackets','Bags','Accessories','Footwear','Apparel'].includes(category))return res.status(400).json({error:'Enter a valid product name and category.'});
 for(const [label,value] of [['price',price],['compare-at price',compare],['offer price',offer]])if(value!==null&&(!Number.isInteger(value)||value<0||value>100000000))return res.status(400).json({error:'Enter a valid '+label+'.'});
 if(offer!==null&&price!==null&&offer>price)return res.status(400).json({error:'The special offer price cannot be higher than the regular price.'});
 if(offerStart&&offerEnd&&new Date(offerEnd)<=new Date(offerStart))return res.status(400).json({error:'The offer end time must be after its start time.'});
 let r;
 if(req.method==='PUT'){
  if(!productId)return res.status(400).json({error:'Product id is required.'});
  r=await db.query("UPDATE atelier_products SET name=$1,category=$2,style=$3,leather_type=$4,description=$5,price_pkr=$6,price_status=$7,published=$8,sku=$9,slug=$10,stock_status=$11,tryon_enabled=$12,compare_at_pkr=$13,offer_price_pkr=$14,offer_starts_at=$15,offer_ends_at=$16,product_details=$17::jsonb,product_status=CASE WHEN product_status='sold' THEN 'sold' WHEN $8 THEN 'active' ELSE 'draft' END,updated_at=NOW(),updated_by=$18 WHERE id=$19 AND workspace_id=$20 AND archived_at IS NULL RETURNING id,name,category,price_pkr,published,sku,slug",[name,category,String(b.style||'').slice(0,100),String(b.leather_type||'').slice(0,100),String(b.description||'').slice(0,3000),price,price===null?'quotation_required':'indicative',!!b.published,String(b.sku||'').slice(0,80)||null,String(b.slug||'').toLowerCase().slice(0,180)||null,String(b.stock_status||'availability_to_confirm'),!!b.tryon_enabled,compare,offer,offerStart,offerEnd,JSON.stringify(b.product_details||{}),req.user.id,productId,w.id]);
  if(!r.rows[0])return res.status(404).json({error:'Product not found.'});
 }else{
  r=await db.query("INSERT INTO atelier_products(workspace_id,name,category,style,leather_type,description,image_url,price_pkr,price_status,published,sku,slug,stock_status,tryon_enabled,product_details,product_status,compare_at_pkr,offer_price_pkr,offer_starts_at,offer_ends_at,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false,$14::jsonb,$15,$16,$17,$18,$19,$20) RETURNING id,name,category,price_pkr,published,sku,slug",[w.id,name,category,String(b.style||'').slice(0,100),String(b.leather_type||'').slice(0,100),String(b.description||'').slice(0,3000),String(b.image_url||'').slice(0,1000),price,price===null?'quotation_required':'indicative',!!b.published,String(b.sku||'').slice(0,80)||null,String(b.slug||'').toLowerCase().slice(0,180)||null,String(b.stock_status||'availability_to_confirm'),JSON.stringify(b.product_details||{}),b.published?'active':'draft',compare,offer,offerStart,offerEnd,req.user.id]);
 }
 await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[w.id,req.user.id,req.method==='PUT'?'product.updated':'product.created','product',r.rows[0].id]);
 return res.status(req.method==='PUT'?200:201).json({product:r.rows[0]});
}