CREATE TABLE IF NOT EXISTS atelier_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES saas_workspaces(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'post' CHECK (content_type IN ('post','page_section','gallery')),
  title TEXT NOT NULL,
  body TEXT,
  image_key TEXT,
  image_alt TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  placement TEXT NOT NULL DEFAULT 'journal',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS atelier_content_workspace_status_idx
  ON atelier_content_items(workspace_id, status, content_type, placement, sort_order, created_at DESC);