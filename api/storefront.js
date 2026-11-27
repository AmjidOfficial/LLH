import { db, storage } from 'hatchable';
export const access = 'public';
export const methods = ['GET'];
export default async function(req,res){
 const slug=String(req.query?.store||'').trim().toLowerCase();
 if(!/^[a-z0-9-]{2,50}$/.test(slug))return res.status(400).json({error:'A valid store slug is required.'});
 const w=(await db.query('SELECT w.id,w.name,w.slug,s.display_name,s.description,s.logo_url,s.primary_colour,s.accent_colour,s.currency,s.whatsapp_phone,s.business_address,s.map_url,s.facebook_url,s.published FROM saas_workspaces w JOIN saas_storefronts s ON s.workspace_id=w.id WHERE w.slug=$1 AND w.status=$2',[slug,'active'])).rows[0];
 if(!w||!w.published)return res.status(404).json({error:'This storefront is not published.'});
 const [p,c,content]=await Promise.all([
  db.query("SELECT id,name,category,style,leather_type,description,image_url,price_pkr,compare_at_pkr,offer_price_pkr,offer_starts_at,offer_ends_at,price_status,sku,slug,stock_status,tryon_enabled,product_status,quantity_on_hand,product_details FROM atelier_products WHERE workspace_id=$1 AND published=true AND product_status='active' AND product_status<>'sold' AND product_status<>'archived' AND COALESCE((product_details->>'is_demo')::boolean,false)=false AND image_url IS NOT NULL ORDER BY created_at DESC LIMIT 100",[w.id]),
  db.query("SELECT id,campaign_type,title,body,discount_percent,coupon_code,starts_at,ends_at,placement FROM atelier_campaigns WHERE workspace_id=$1 AND status IN ('active','scheduled') AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) ORDER BY created_at DESC LIMIT 20",[w.id]),
  db.query("SELECT id,content_type,title,body,image_key,image_alt,tags,placement,is_pinned,sort_order FROM atelier_content_items WHERE workspace_id=$1 AND status='published' AND archived_at IS NULL AND (starts_at IS NULL OR starts_at<=NOW()) AND (ends_at IS NULL OR ends_at>NOW()) ORDER BY is_pinned DESC,sort_order ASC,created_at DESC LIMIT 100",[w.id])
 ]);
 const products=await Promise.all(p.rows.map(async x=>({...x,image_url:x.image_url?.startsWith('storage:')?await storage.url(x.image_url.slice(8),{ttl:3600}):x.image_url})));
 const items=await Promise.all(content.rows.map(async x=>({...x,image_url:x.image_key?await storage.url(x.image_key,{ttl:3600}):null})));
 return res.json({store:w,products,campaigns:c.rows,content:items});
}