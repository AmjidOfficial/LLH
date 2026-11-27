CREATE TABLE IF NOT EXISTS tryon_guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES saas_workspaces(id),
  product_id uuid REFERENCES atelier_products(id),
  guest_token_hash text NOT NULL,
  source_photo_key text,
  result_photo_key text,
  status text NOT NULL DEFAULT 'awaiting_engine',
  engine_name text,
  consent_at timestamptz,
  request_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_prediction_id text,
  provider_error text,
  credits_used integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tryon_guest_sessions_token_idx ON tryon_guest_sessions(id,guest_token_hash);
CREATE INDEX IF NOT EXISTS tryon_guest_sessions_prediction_idx ON tryon_guest_sessions(provider_prediction_id);