CREATE TABLE IF NOT EXISTS saas_platform_admins (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO saas_platform_admins(email,role,status)
VALUES ('amjid.bisconni@gmail.com','super_admin','active')
ON CONFLICT(email) DO UPDATE SET role='super_admin',status='active';
INSERT INTO saas_platform_admins(email,role,status)
VALUES ('amjid.psh@gmail.com','super_admin','active')
ON CONFLICT(email) DO UPDATE SET role='super_admin',status='active';