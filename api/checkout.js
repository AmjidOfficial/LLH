import { db, auth } from 'hatchable';
import { randomUUID } from 'node:crypto';
export const access = 'public';
export const methods = ['POST'];
export default async function(req,res){
 const b=req.body||{},signedInUser=await auth.getUser(req),slug=String(b.store||'').trim().toLowerCase(),name=String(b.customer_name||'').trim(),phone=String(b.customer_phone||'').trim(),email=String(b.customer_email||'').trim().toLowerCase(),items=Array.isArray(b.items)?b.items:[];
 if(!/^[a-z0-9-]{2,50}$/.test(slug))return res.status(400).json({error:'Store is required.'});
 if(name.length<2||name.length>120||phone.length<7||phone.length>30)return res.status(400).json({error:'Please enter a valid name and phone number.'});
 if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>180))return res.status(400).json({error:'Please enter a valid email address.'});
 if(!items.length||items.length>30)return res.status(400).json({error:'Your cart is empty or has too many items.'});
 if(!['cash_on_delivery','bank_transfer'].includes(b.payment_method))return res.status(400).json({error:'Choose cash on delivery or bank transfer.'});
 const w=(await db.query('SELECT w.id,s.currency,s.published FROM saas_workspaces w JOIN saas_storefronts s ON s.workspace_id=w.id WHERE w.slug=$1 AND w.status=$2',[slug,'active'])).rows[0];
 if(!w||!w.published)return res.status(404).json({error:'Store not found or not published.'});
 const clean=[];let subtotal=0;
 for(const item of items){
  const pid=String(item.product_id||''),qty=Number(item.quantity);
  if(!Number.isInteger(qty)||qty<1||qty>20)return res.status(400).json({error:'Each quantity must be between 1 and 20.'});
  const p=(await db.query("SELECT id,name,sku,price_pkr,price_status,offer_price_pkr,offer_starts_at,offer_ends_at,product_status FROM atelier_products WHERE id=$1 AND workspace_id=$2 AND published=true AND product_status NOT IN ('sold','archived') AND COALESCE((product_details->>'is_demo')::boolean,false)=false",[pid,w.id])).rows[0];
  if(!p)return res.status(400).json({error:'A product in your cart is no longer available.'});
  let unit=p.price_pkr;
  const now=Date.now(),starts=p.offer_starts_at?new Date(p.offer_starts_at).getTime():0,ends=p.offer_ends_at?new Date(p.offer_ends_at).getTime():Infinity;
  if(Number.isInteger(p.offer_price_pkr)&&p.offer_price_pkr>=0&&now>=starts&&now<ends)unit=p.offer_price_pkr;
  if(!Number.isInteger(unit)||unit<0)return res.status(409).json({error:'A product needs a confirmed online price. Please contact the store for a quote.'});
  subtotal+=unit*qty;clean.push({product_id:p.id,product_name:p.name,sku:p.sku,quantity:qty,unit_price_pkr:unit,line_total_pkr:unit*qty,selected_options:item.options||{}});
 }
 if(subtotal>50000000)return res.status(400).json({error:'Order total is above the allowed limit.'});
 const orderId=randomUUID(),orderNumber='LLH-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+orderId.slice(0,6).toUpperCase(),address=b.shipping_address&&typeof b.shipping_address==='object'?b.shipping_address:{};
 if(String(address.city||'').trim().length<2||String(address.address||'').trim().length<5)return res.status(400).json({error:'Please add your delivery city and full address.'});
 const statements=[
  {sql:'INSERT INTO commerce_orders(id,workspace_id,order_number,customer_user_id,customer_name,customer_email,customer_phone,shipping_address,subtotal_pkr,shipping_pkr,total_pkr,currency,payment_method,customer_note) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,0,$9,$10,$11,$12)',params:[orderId,w.id,orderNumber,signedInUser?.id||null,name,email||null,phone,JSON.stringify(address),subtotal,w.currency,b.payment_method,String(b.customer_note||'').slice(0,1000)]},
  ...clean.map(x=>({sql:'INSERT INTO commerce_order_items(workspace_id,order_id,product_id,product_name,sku,quantity,unit_price_pkr,line_total_pkr,selected_options) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',params:[w.id,orderId,x.product_id,x.product_name,x.sku,x.quantity,x.unit_price_pkr,x.line_total_pkr,JSON.stringify(x.selected_options)]})),
  {sql:'SELECT reserve_order_inventory($1,$2)',params:[orderId,w.id]},
  {sql:'INSERT INTO saas_audit_logs(workspace_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',params:[w.id,'order.placed','order',orderId,JSON.stringify({order_number:orderNumber,total_pkr:subtotal})]}
 ];
 try{await db.transaction(statements)}catch(e){if(String(e.message||'').toLowerCase().includes('insufficient stock')||String(e.message||'').toLowerCase().includes('unavailable product'))return res.status(409).json({error:'One or more items are no longer in stock. Please refresh your bag.'});throw e}
 return res.status(201).json({ok:true,order:{id:orderId,order_number:orderNumber,subtotal_pkr:subtotal,shipping_pkr:0,total_pkr:subtotal,currency:w.currency,payment_status:'pending',order_status:'placed',shipping_note:'Delivery charge will be confirmed by the store.'}});
}