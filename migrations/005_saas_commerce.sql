-- Multi-tenant commerce foundation for the Try-On Studio SaaS.
CREATE TABLE IF NOT EXISTS saas_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id TEXT,
  plan_key TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS saas_storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_colour TEXT NOT NULL DEFAULT '#241b15',
  accent_colour TEXT NOT NULL DEFAULT '#b47b4b',
  currency TEXT NOT NULL DEFAULT 'PKR',
  country_code TEXT NOT NULL DEFAULT 'PK',
  whatsapp_phone TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES saas_workspaces(id) ON DELETE CASCADE;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS compare_at_pkr INTEGER;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'availability_to_confirm';
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS tryon_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS product_details JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS atelier_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES atelier_products(id) ON DELETE CASCADE,
  sku TEXT,
  size_label TEXT,
  colour_label TEXT,
  material_finish TEXT,
  price_pkr INTEGER,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'availability_to_confirm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE atelier_enquiries ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES saas_workspaces(id) ON DELETE CASCADE;
ALTER TABLE atelier_mtm_orders ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES saas_workspaces(id) ON DELETE CASCADE;
ALTER TABLE atelier_inventory_movements ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES saas_workspaces(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS commerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_user_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal_pkr INTEGER NOT NULL DEFAULT 0,
  shipping_pkr INTEGER NOT NULL DEFAULT 0,
  discount_pkr INTEGER NOT NULL DEFAULT 0,
  total_pkr INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'placed',
  customer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,order_number)
);
CREATE TABLE IF NOT EXISTS commerce_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES atelier_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES atelier_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_pkr INTEGER NOT NULL CHECK (unit_price_pkr >= 0),
  line_total_pkr INTEGER NOT NULL CHECK (line_total_pkr >= 0),
  selected_options JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS commerce_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  user_id TEXT,
  session_key TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id IS NOT NULL OR session_key IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS tryon_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  user_id TEXT,
  product_id UUID REFERENCES atelier_products(id) ON DELETE SET NULL,
  source_photo_key TEXT,
  result_photo_key TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_engine',
  engine_name TEXT,
  consent_at TIMESTAMPTZ,
  fit_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'trial',
  billing_provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO saas_workspaces (name,slug,plan_key)
VALUES ('TOP Fashion Leather Garments','top-fashion-leather','founder')
ON CONFLICT (slug) DO NOTHING;
INSERT INTO saas_storefronts (workspace_id,display_name,description,whatsapp_phone)
SELECT id,'TOP Fashion Leather Garments','Genuine leather jackets, executive bags and bespoke craftsmanship in Peshawar, Pakistan.','923328884141'
FROM saas_workspaces WHERE slug='top-fashion-leather'
ON CONFLICT (workspace_id) DO NOTHING;
UPDATE atelier_products SET workspace_id=(SELECT id FROM saas_workspaces WHERE slug='top-fashion-leather') WHERE workspace_id IS NULL;
UPDATE atelier_enquiries SET workspace_id=(SELECT id FROM saas_workspaces WHERE slug='top-fashion-leather') WHERE workspace_id IS NULL;
UPDATE atelier_mtm_orders SET workspace_id=(SELECT id FROM saas_workspaces WHERE slug='top-fashion-leather') WHERE workspace_id IS NULL;
UPDATE atelier_inventory_movements SET workspace_id=(SELECT id FROM saas_workspaces WHERE slug='top-fashion-leather') WHERE workspace_id IS NULL;
CREATE INDEX IF NOT EXISTS saas_memberships_user_idx ON saas_memberships(user_id,workspace_id);
CREATE INDEX IF NOT EXISTS atelier_products_workspace_published_idx ON atelier_products(workspace_id,published);
CREATE INDEX IF NOT EXISTS commerce_orders_workspace_created_idx ON commerce_orders(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS commerce_order_items_order_idx ON commerce_order_items(order_id);
CREATE INDEX IF NOT EXISTS tryon_sessions_workspace_user_idx ON tryon_sessions(workspace_id,user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS saas_audit_workspace_created_idx ON saas_audit_logs(workspace_id,created_at DESC);