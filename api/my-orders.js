import { db } from 'hatchable';
export const access = 'user';
export const methods = ['GET'];
export default async function(req,res){
  const r=await db.query('SELECT id,workspace_id,order_number,customer_name,subtotal_pkr,shipping_pkr,total_pkr,currency,payment_method,payment_status,order_status,created_at FROM commerce_orders WHERE customer_user_id=$1 ORDER BY created_at DESC LIMIT 50',[req.user.id]);
  return res.json({orders:r.rows});
}