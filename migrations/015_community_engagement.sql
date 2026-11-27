CREATE TABLE IF NOT EXISTS atelier_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES atelier_content_items(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','love')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,content_id,visitor_key)
);
CREATE INDEX IF NOT EXISTS atelier_post_reactions_content_idx ON atelier_post_reactions(workspace_id,content_id);
CREATE TABLE IF NOT EXISTS atelier_post_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES atelier_content_items(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id,content_id,visitor_key)
);
CREATE TABLE IF NOT EXISTS atelier_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES atelier_content_items(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderated_by TEXT
);
CREATE INDEX IF NOT EXISTS atelier_post_comments_moderation_idx ON atelier_post_comments(workspace_id,status,created_at DESC);
CREATE TABLE IF NOT EXISTS atelier_customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  product_id UUID REFERENCES atelier_products(id) ON DELETE SET NULL,
  visitor_key TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  moderated_at TIMESTAMPTZ,
  moderated_by TEXT
);
CREATE INDEX IF NOT EXISTS atelier_customer_reviews_moderation_idx ON atelier_customer_reviews(workspace_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS atelier_customer_reviews_product_idx ON atelier_customer_reviews(workspace_id,product_id,status);
CREATE TABLE IF NOT EXISTS atelier_post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES atelier_content_items(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS atelier_post_shares_content_idx ON atelier_post_shares(workspace_id,content_id);