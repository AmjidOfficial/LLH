ALTER TABLE tryon_sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE tryon_guest_sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE tryon_sessions
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

UPDATE tryon_guest_sessions
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS tryon_sessions_expires_at_idx ON tryon_sessions(expires_at);
CREATE INDEX IF NOT EXISTS tryon_guest_sessions_expires_at_idx ON tryon_guest_sessions(expires_at);

CREATE TABLE IF NOT EXISTS tryon_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_hash, window_start)
);

CREATE INDEX IF NOT EXISTS tryon_rate_limits_window_idx ON tryon_rate_limits(window_start);