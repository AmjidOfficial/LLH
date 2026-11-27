import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','POST','PATCH','DELETE'];
async function context(req,res){
 const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase();
 const w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
 if(!w){res.status(404).json({error:'Store not found.'});return null;}
 const superAdmin=await isSuperAdmin(req.user.id);
 const m=(await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[w.id,req.user.id,'active'])).rows[0];
 if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role))){res.status(403).json({error:'You do not have permission to manage this store.'});return null;}
 return {workspaceId:w.id,superAdmin};
}
export default async function(req,res){
 const c=await context(req,res);if(!c)return;
 const wid=c.workspaceId;
 if(req.method==='GET'){
  const [stats,products,campaigns,movements]=await Promise.all([
   db.query("SELECT COUNT(*)::int AS total_products,COUNT(*) FILTER(WHERE published AND archived_at IS NULL)::int AS published_products,COUNT(*) FILTER(WHERE product_status='sold')::int AS sold_products,COUNT(*) FILTER(WHERE quantity_on_hand<=2 AND product_status<>'archived')::int AS low_stock,COALESCE(SUM(quantity_on_hand),0)::int AS units_in_stock FROM atelier_products WHERE workspace_id=$1",[wid]),
   db.query("SELECT id,name,category,sku,price_pkr,compare_at_pkr,published,stock_status,tryon_enabled,quantity_on_hand,quantity_reserved,sold_count,product_status,offer_price_pkr,offer_starts_at,offer_ends_at,image_url,product_details FROM atelier_products WHERE workspace_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 250",[wid]),
   db.query("SELECT id,campaign_type,title,body,discount_percent,coupon_code,starts_at,ends_at,status,placement,created_at FROM atelier_campaigns WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100",[wid]),
   db.query("SELECT id,product_id,sku,variant,quantity_change,reason,created_at FROM atelier_inventory_movements WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100",[wid])
  ]);
  const orders=await db.query("SELECT COUNT(*)::int AS total_orders,COUNT(*) FILTER(WHERE order_status='placed')::int AS new_orders,COALESCE(SUM(total_pkr) FILTER(WHERE payment_status='paid'),0)::bigint AS paid_revenue_pkr FROM commerce_orders WHERE workspace_id=$1",[wid]);
  return res.json({stats:stats.rows[0],orders:orders.rows[0],products:products.rows,campaigns:campaigns.rows,movements:movements.rows});
 }
 const b=req.body||{};
 if(req.method==='DELETE'){
  if(String(b.action||'')!=='campaign'||!b.id)return res.status(400).json({error:'A campaign ID is required.'});
  const r=await db.query("UPDATE atelier_campaigns SET status='archived',updated_at=NOW() WHERE id=$1 AND workspace_id=$2 RETURNING id",[String(b.id),wid]);
  if(!r.rows[0])return res.status(404).json({error:'Campaign not found.'});
  await db.query('INSERT INTO saas_audit_logs(workspace_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[wid,req.user.id,'campaign.archived','campaign',String(b.id)]);
  return res.json({ok:true,archived:true});
 }
 if(req.method==='POST'){
  const action=String(b.action||'');
  if(action==='stock'){
   const id=String(b.product_id||''),delta=Number(b.quantity_change),reason=String(b.reason||'stock_adjustment').slice(0,100);
   if(!id||!Number.isInteger(delta)||delta===0||Math.abs(delta)>100000)return res.status(400).json({error:'Enter a valid stock adjustment.'});
   const p=(await db.query('SELECT id,sku,quantity_on_hand,product_status FROM atelier_products WHERE id=$1 AND workspace_id=$2',[id,wid])).rows[0];
   if(!p)return res.status(404).json({error:'Product not found.'});
   const next=p.quantity_on_hand+delta;if(next<0)return res.status(409).json({error:'Stock cannot go below zero.'});
   await db.query('UPDATE atelier_products SET quantity_on_hand=$1,product_status=CASE WHEN product_status=\'sold\' AND $1>0 THEN \'active\' WHEN $1=0 THEN \'out_of_stock\' WHEN product_status IN (\'draft\',\'archived\') THEN product_status ELSE \'active\' END,stock_status=CASE WHEN $1>0 THEN \'in_stock\' ELSE \'out_of_stock\' END,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND workspace_id=$4',[next,req.user.id,id,wid]);
   await db.query('INSERT INTO atelier_inventory_movements(workspace_id,product_id,sku,quantity_change,reason) VALUES($1,$2,$3,$4,$5)',[wid,id,p.sku||'UNASSIGNED',delta,reason]);
   return res.json({ok:true,quantity_on_hand:next});
  }
  if(action==='out-of-stock'){
   const id=String(b.product_id||'');
   if(!id)return res.status(400).json({error:'Product ID is required.'});
   const p=(await db.query('SELECT id,sku,quantity_on_hand FROM atelier_products WHERE id=$1 AND workspace_id=$2',[id,wid])).rows[0];
   if(!p)return res.status(404).json({error:'Product not found.'});
   await db.query("UPDATE atelier_products SET quantity_on_hand=0,stock_status='out_of_stock',product_status='out_of_stock',published=false,tryon_enabled=false,updated_at=NOW(),updated_by=$1 WHERE id=$2 AND workspace_id=$3",[req.user.id,id,wid]);
   if(Number(p.quantity_on_hand)>0)await db.query("INSERT INTO atelier_inventory_movements(workspace_id,product_id,sku,quantity_change,reason) VALUES($1,$2,$3,$4,'marked_out_of_stock')",[wid,id,p.sku||'UNASSIGNED',-Number(p.quantity_on_hand)]);
   return res.json({ok:true,quantity_on_hand:0,product_status:'out_of_stock'});
  }
  if(action==='sold'){
   const id=String(b.product_id||''),qty=Number(b.quantity||1);
   if(!id||!Number.isInteger(qty)||qty<1||qty>10000)return res.status(400).json({error:'Enter a valid sold quantity.'});
   const p=(await db.query('SELECT id,sku,quantity_on_hand,sold_count FROM atelier_products WHERE id=$1 AND workspace_id=$2',[id,wid])).rows[0];
   if(!p)return res.status(404).json({error:'Product not found.'});
   if(p.quantity_on_hand<qty)return res.status(409).json({error:'Not enough stock to mark this quantity as sold.'});
   const remaining=p.quantity_on_hand-qty;
   await db.query("UPDATE atelier_products SET quantity_on_hand=$1,sold_count=sold_count+$2,product_status=CASE WHEN $1=0 THEN 'sold' ELSE 'active' END,stock_status=CASE WHEN $1=0 THEN 'sold' ELSE 'in_stock' END,sold_at=CASE WHEN $1=0 THEN NOW() ELSE sold_at END,published=CASE WHEN $1=0 THEN false ELSE published END,tryon_enabled=CASE WHEN $1=0 THEN false ELSE tryon_enabled END,updated_at=NOW(),updated_by=$3 WHERE id=$4 AND workspace_id=$5",[remaining,qty,req.user.id,id,wid]);
   await db.query('INSERT INTO atelier_inventory_movements(workspace_id,product_id,sku,quantity_change,reason) VALUES($1,$2,$3,$4,$5)',[wid,id,p.sku||'UNASSIGNED',-qty,'marked_sold']);
   return res.json({ok:true,quantity_on_hand:remaining,sold_count:p.sold_count+qty,product_status:remaining===0?'sold':'active'});
  }
  if(action==='campaign'){
   const type=String(b.campaign_type||''),title=String(b.title||'').trim(),discount=b.discount_percent==null||b.discount_percent===''?null:Number(b.discount_percent);
   if(!['offer','announcement'].includes(type)||title.length<3||title.length>140)return res.status(400).json({error:'Enter a valid campaign type and title.'});
   if(discount!==null&&(!Number.isInteger(discount)||discount<1||discount>90))return res.status(400).json({error:'Discount must be between 1 and 90 percent.'});
   const status=['draft','scheduled','active','paused'].includes(b.status)?b.status:'draft';
   const r=await db.query('INSERT INTO atelier_campaigns(workspace_id,campaign_type,title,body,discount_percent,coupon_code,starts_at,ends_at,status,placement,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[wid,type,title,String(b.body||'').slice(0,2000)||null,discount,String(b.coupon_code||'').trim().slice(0,40)||null,b.starts_at||null,b.ends_at||null,status,String(b.placement||'site').slice(0,40),req.user.id]);
   return res.status(201).json({campaign:r.rows[0]});
  }
  return res.status(400).json({error:'Unknown admin action.'});
 }
 if(req.method==='PATCH'){
  const id=String(b.id||''),action=String(b.action||'');
  if(action==='campaign'){
   if(!id)return res.status(400).json({error:'Campaign ID is required.'});
   const current=(await db.query('SELECT id FROM atelier_campaigns WHERE id=$1 AND workspace_id=$2',[id,wid])).rows[0];
   if(!current)return res.status(404).json({error:'Campaign not found.'});
   const title=String(b.title||'').trim(),body=String(b.body||'').slice(0,2000);
   const status=['draft','scheduled','active','paused','archived'].includes(b.status)?b.status:null;
   const type=['offer','announcement'].includes(b.campaign_type)?b.campaign_type:null;
   const discount=b.discount_percent==null||b.discount_percent===''?null:Number(b.discount_percent);
   if(b.discount_percent!==undefined&&discount!==null&&(!Number.isInteger(discount)||discount<1||discount>90))return res.status(400).json({error:'Discount must be between 1 and 90 percent.'});
   const r=await db.query("UPDATE atelier_campaigns SET title=COALESCE($1,title),body=CASE WHEN $2::boolean THEN $3 ELSE body END,campaign_type=COALESCE($4,campaign_type),status=COALESCE($5,status),discount_percent=CASE WHEN $6::boolean THEN $7 ELSE discount_percent END,coupon_code=CASE WHEN $8::boolean THEN $9 ELSE coupon_code END,starts_at=CASE WHEN $10::boolean THEN $11::timestamptz ELSE starts_at END,ends_at=CASE WHEN $12::boolean THEN $13::timestamptz ELSE ends_at END,placement=COALESCE($14,placement),updated_at=NOW() WHERE id=$15 AND workspace_id=$16 RETURNING id,title,body,campaign_type,status,discount_percent,coupon_code,starts_at,ends_at,placement",[title||null,b.body!==undefined,body,type,status,b.discount_percent!==undefined,discount,b.coupon_code!==undefined,String(b.coupon_code||'').trim().slice(0,40)||null,b.starts_at!==undefined,b.starts_at||null,b.ends_at!==undefined,b.ends_at||null,['site','homepage','offers'].includes(b.placement)?b.placement:null,id,wid]);
   return res.json({campaign:r.rows[0]});
  }
  if(action==='product-status'){
   const status=String(b.product_status||'');
   if(!id||!['draft','active','out_of_stock','archived'].includes(status))return res.status(400).json({error:'Invalid product status.'});
   const r=await db.query("UPDATE atelier_products SET product_status=$1,published=CASE WHEN $1='active' THEN true ELSE false END,tryon_enabled=CASE WHEN $1='active' AND quantity_on_hand>0 THEN tryon_enabled ELSE false END,archived_at=CASE WHEN $1='archived' THEN NOW() ELSE NULL END,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND workspace_id=$4 AND product_status<>'sold' RETURNING id,product_status,published,tryon_enabled",[status,req.user.id,id,wid]);
   if(!r.rows[0])return res.status(404).json({error:'Product not found or sold. Restore stock before reactivating a sold product.'});
   return res.json({product:r.rows[0]});
  }
 }
 return res.status(405).json({error:'Method not supported.'});
}