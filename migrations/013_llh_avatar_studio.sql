CREATE TABLE IF NOT EXISTS llh_avatar_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id text,
  guest_token_hash text,
  person_image_id text NOT NULL,
  avatar_image_id text,
  active_job_id text,
  active_job_type text,
  status text NOT NULL DEFAULT 'photo_uploaded',
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_id uuid,
  variant_id uuid,
  result_url text,
  consent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS llh_avatar_sessions_expiry_idx ON llh_avatar_sessions(expires_at);
CREATE INDEX IF NOT EXISTS llh_avatar_sessions_user_idx ON llh_avatar_sessions(user_id, created_at DESC);