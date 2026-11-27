import { db } from 'hatchable';
export const access = 'public';
export const methods = ['GET','POST'];
const clean=(v,n)=>String(v||'').trim().slice(0,n);
function validKey(v){return /^[a-zA-Z0-9_-]{12,80}$/.test(String(v||''));}
export default async function(req,res){
 const slug=clean(req.query?.store||req.body?.store,80).toLowerCase();
 const w=(await db.query("SELECT id FROM saas_workspaces WHERE slug=$1 AND status='active'",[slug])).rows[0];
 if(!w)return res.status(404).json({error:'Store not found.'});
 const wid=w.id,b=req.body||{};
 if(req.method==='GET'){
  const contentId=clean(req.query?.content_id,60),productId=clean(req.query?.product_id,60);
  if(contentId){
   const item=(await db.query("SELECT id FROM atelier_content_items WHERE id=$1 AND workspace_id=$2 AND status='published' AND archived_at IS NULL",[contentId,wid])).rows[0];
   if(!item)return res.status(404).json({error:'Post not found.'});
   const visitorKey=clean(req.query?.visitor_key,80),[counts,comments,mine]=await Promise.all([
    db.query("SELECT (SELECT COUNT(*)::int FROM atelier_post_reactions WHERE workspace_id=$1 AND content_id=$2 AND reaction='like') AS likes,(SELECT COUNT(*)::int FROM atelier_post_reactions WHERE workspace_id=$1 AND content_id=$2 AND reaction='love') AS loves,(SELECT COUNT(*)::int FROM atelier_post_saves WHERE workspace_id=$1 AND content_id=$2) AS saves,(SELECT COUNT(*)::int FROM atelier_post_shares WHERE workspace_id=$1 AND content_id=$2) AS shares",[wid,contentId]),
    db.query("SELECT id,customer_name,body,created_at FROM atelier_post_comments WHERE workspace_id=$1 AND content_id=$2 AND status='approved' ORDER BY created_at DESC LIMIT 30",[wid,contentId]),
    validKey(visitorKey)?db.query("SELECT r.reaction,EXISTS(SELECT 1 FROM atelier_post_saves s WHERE s.workspace_id=$1 AND s.content_id=$2 AND s.visitor_key=$3) AS saved FROM (SELECT 1) q LEFT JOIN atelier_post_reactions r ON r.workspace_id=$1 AND r.content_id=$2 AND r.visitor_key=$3",[wid,contentId,visitorKey]):Promise.resolve({rows:[{reaction:null,saved:false}]})
   ]);
   return res.json({counts:counts.rows[0],comments:comments.rows,my_reaction:mine.rows[0]?.reaction||null,saved:!!mine.rows[0]?.saved});
  }
  const reviews=await db.query("SELECT r.id,r.customer_name,r.rating,r.title,r.body,r.created_at,r.product_id,p.name AS product_name FROM atelier_customer_reviews r LEFT JOIN atelier_products p ON p.id=r.product_id WHERE r.workspace_id=$1 AND r.status='approved' AND ($2::uuid IS NULL OR r.product_id=$2) ORDER BY r.created_at DESC LIMIT 50",[wid,productId||null]);
  const avg=await db.query("SELECT ROUND(AVG(rating)::numeric,1) AS average_rating,COUNT(*)::int AS review_count FROM atelier_customer_reviews WHERE workspace_id=$1 AND status='approved' AND ($2::uuid IS NULL OR product_id=$2)",[wid,productId||null]);
  return res.json({reviews:reviews.rows,summary:avg.rows[0]});
 }
 const action=clean(b.action,24),key=clean(b.visitor_key,80);
 if(!validKey(key))return res.status(400).json({error:'Refresh the page and try again.'});
 if(action==='react'){
  const id=clean(b.content_id,60),reaction=['like','love'].includes(b.reaction)?b.reaction:'like';
  const item=(await db.query("SELECT id FROM atelier_content_items WHERE id=$1 AND workspace_id=$2 AND status='published' AND archived_at IS NULL",[id,wid])).rows[0];
  if(!item)return res.status(404).json({error:'Post not found.'});
  const old=(await db.query("SELECT reaction FROM atelier_post_reactions WHERE workspace_id=$1 AND content_id=$2 AND visitor_key=$3",[wid,id,key])).rows[0];
  if(old?.reaction===reaction)await db.query("DELETE FROM atelier_post_reactions WHERE workspace_id=$1 AND content_id=$2 AND visitor_key=$3",[wid,id,key]);
  else await db.query("INSERT INTO atelier_post_reactions(workspace_id,content_id,visitor_key,reaction) VALUES($1,$2,$3,$4) ON CONFLICT(workspace_id,content_id,visitor_key) DO UPDATE SET reaction=EXCLUDED.reaction,created_at=NOW()",[wid,id,key,reaction]);
  return res.json({ok:true});
 }
 if(action==='save'||action==='share'){
  const id=clean(b.content_id,60);
  const item=(await db.query("SELECT id FROM atelier_content_items WHERE id=$1 AND workspace_id=$2 AND status='published' AND archived_at IS NULL",[id,wid])).rows[0];
  if(!item)return res.status(404).json({error:'Post not found.'});
  if(action==='save'){
   const old=(await db.query("SELECT id FROM atelier_post_saves WHERE workspace_id=$1 AND content_id=$2 AND visitor_key=$3",[wid,id,key])).rows[0];
   if(old)await db.query("DELETE FROM atelier_post_saves WHERE id=$1",[old.id]);
   else await db.query("INSERT INTO atelier_post_saves(workspace_id,content_id,visitor_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[wid,id,key]);
  }else await db.query("INSERT INTO atelier_post_shares(workspace_id,content_id,visitor_key) VALUES($1,$2,$3)",[wid,id,key]);
  return res.json({ok:true});
 }
 if(action==='comment'){
  const id=clean(b.content_id,60),name=clean(b.customer_name,80),body=clean(b.body,1200);
  if(name.length<2||body.length<2)return res.status(400).json({error:'Add your name and a comment.'});
  const item=(await db.query("SELECT id FROM atelier_content_items WHERE id=$1 AND workspace_id=$2 AND status='published' AND archived_at IS NULL",[id,wid])).rows[0];
  if(!item)return res.status(404).json({error:'Post not found.'});
  await db.query("INSERT INTO atelier_post_comments(workspace_id,content_id,visitor_key,customer_name,body,status) VALUES($1,$2,$3,$4,$5,'pending')",[wid,id,key,name,body]);
  return res.status(201).json({ok:true,message:'Thanks! Your comment is waiting for admin approval.'});
 }
 if(action==='review'){
  const name=clean(b.customer_name,80),title=clean(b.title,140),body=clean(b.body,2000),rating=Number(b.rating),productId=clean(b.product_id,60)||null;
  if(name.length<2||title.length<2||body.length<5||!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:'Please add your name, title, feedback and a star rating from 1 to 5.'});
  if(productId){const p=(await db.query("SELECT id FROM atelier_products WHERE id=$1 AND workspace_id=$2 AND archived_at IS NULL",[productId,wid])).rows[0];if(!p)return res.status(404).json({error:'Product not found.'});}
  await db.query("INSERT INTO atelier_customer_reviews(workspace_id,product_id,visitor_key,customer_name,rating,title,body,status) VALUES($1,$2,$3,$4,$5,$6,$7,'pending')",[wid,productId,key,name,rating,title,body]);
  return res.status(201).json({ok:true,message:'Thank you. Your review will appear after admin approval.'});
 }
 return res.status(400).json({error:'Unknown community action.'});
}