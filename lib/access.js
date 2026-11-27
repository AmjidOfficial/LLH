import { db } from 'hatchable';
export async function isSuperAdmin(userId){
  if(!userId)return false;
  const r=await db.query(
    "SELECT 1 FROM users u JOIN saas_platform_admins a ON lower(a.email)=lower(u.email) WHERE u.id=$1 AND a.role='super_admin' AND a.status='active' LIMIT 1",
    [userId]
  );
  return !!r.rows[0];
}