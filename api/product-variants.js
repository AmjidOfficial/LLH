import { db } from 'hatchable';
import { isSuperAdmin } from 'lib/access.js';
export const access = 'user';
export const methods = ['GET','PUT'];
async function context(req,res){
  const slug=String(req.query?.store||req.body?.store||'').trim().toLowerCase();
  const productId=String(req.query?.product_id||req.body?.product_id||'');
  const w=(await db.query('SELECT id,owner_user_id FROM saas_workspaces WHERE slug=$1 AND status=$2',[slug,'active'])).rows[0];
  if(!w){res.status(404).json({error:'Store not found.'});return null;}
  const p=(await db.query('SELECT id FROM atelier_products WHERE id=$1 AND workspace_id=$2 AND archived_at IS NULL',[productId,w.id])).rows[0];
  if(!p){res.status(404).json({error:'Product not found.'});return null;}
  const superAdmin=await isSuperAdmin(req.user.id);
  const m=(await db.query('SELECT role FROM saas_memberships WHERE workspace_id=$1 AND user_id=$2 AND status=$3',[w.id,req.user.id,'active'])).rows[0];
  if(!superAdmin&&w.owner_user_id!==req.user.id&&(!m||!['owner','admin','manager'].includes(m.role))){res.status(403).json({error:'You cannot manage product variants.'});return null;}
  return {workspaceId:w.id,productId};
}
export default async function(req,res){
  const c=await context(req,res);if(!c)return;
  if(req.method==='GET'){
    const rows=(await db.query('SELECT id,sku,size_label,colour_label,material_finish,price_pkr,stock_quantity,stock_status FROM atelier_product_variants WHERE workspace_id=$1 AND product_id=$2 ORDER BY colour_label,size_label',[c.workspaceId,c.productId])).rows;
    return res.json({variants:rows});
  }
  const variants=req.body?.variants;
  if(!Array.isArray(variants)||variants.length>100)return res.status(400).json({error:'Variants must be a JSON array with no more than 100 rows.'});
  const clean=[];
  for(const v of variants){
    const size=String(v.size_label||'').trim().slice(0,40),colour=String(v.colour_label||'').trim().slice(0,60);
    const qty=Number(v.stock_quantity),price=v.price_pkr===''||v.price_pkr==null?null:Number(v.price_pkr);
    if(!size||!colour||!Number.isInteger(qty)||qty<0||qty>100000||price!==null&&(!Number.isInteger(price)||price<0||price>100000000))return res.status(400).json({error:'Each variant needs a size, colour, whole-number stock quantity and valid optional price.'});
    clean.push({sku:String(v.sku||'').trim().slice(0,80)||null,size_label:size,colour_label:colour,material_finish:String(v.material_finish||'').trim().slice(0,100)||null,price_pkr:price,stock_quantity:qty,stock_status:qty>0?'in_stock':'out_of_stock'});
  }
  const ops=[{sql:'DELETE FROM atelier_product_variants WHERE workspace_id=$1 AND product_id=$2',params:[c.workspaceId,c.productId]}];
  for(const v of clean)ops.push({sql:'INSERT INTO atelier_product_variants(workspace_id,product_id,sku,size_label,colour_label,material_finish,price_pkr,stock_quantity,stock_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',params:[c.workspaceId,c.productId,v.sku,v.size_label,v.colour_label,v.material_finish,v.price_pkr,v.stock_quantity,v.stock_status]});
  await db.transaction(ops);
  const total=clean.reduce((s,v)=>s+v.stock_quantity,0);
  await db.query("UPDATE atelier_products SET quantity_on_hand=$1,stock_status=CASE WHEN $1>0 THEN 'in_stock' ELSE 'out_of_stock' END,product_status=CASE WHEN $1>0 AND product_status='out_of_stock' THEN 'active' WHEN $1=0 AND product_status='active' THEN 'out_of_stock' ELSE product_status END,tryon_enabled=CASE WHEN $1>0 THEN tryon_enabled ELSE false END,updated_at=NOW(),updated_by=$2 WHERE id=$3 AND workspace_id=$4",[total,req.user.id,c.productId,c.workspaceId]);
  return res.json({ok:true,variants:clean.length,total_stock:total});
}