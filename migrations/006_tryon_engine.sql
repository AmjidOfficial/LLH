ALTER TABLE tryon_sessions ADD COLUMN IF NOT EXISTS provider_prediction_id TEXT;
ALTER TABLE tryon_sessions ADD COLUMN IF NOT EXISTS provider_error TEXT;
ALTER TABLE tryon_sessions ADD COLUMN IF NOT EXISTS credits_used INTEGER;
CREATE INDEX IF NOT EXISTS tryon_sessions_prediction_idx ON tryon_sessions(provider_prediction_id);