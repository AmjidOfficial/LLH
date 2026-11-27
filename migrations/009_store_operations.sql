ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS quantity_on_hand integer NOT NULL DEFAULT 0;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS quantity_reserved integer NOT NULL DEFAULT 0;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS product_status text NOT NULL DEFAULT 'draft';
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS offer_price_pkr integer;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS offer_starts_at timestamptz;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS sold_at timestamptz;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE atelier_products ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE atelier_products ADD CONSTRAINT atelier_products_quantity_nonnegative CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND sold_count >= 0) NOT VALID;
ALTER TABLE atelier_products ADD CONSTRAINT atelier_products_offer_nonnegative CHECK (offer_price_pkr IS NULL OR offer_price_pkr >= 0) NOT VALID;
CREATE INDEX IF NOT EXISTS atelier_products_workspace_status_idx ON atelier_products(workspace_id, product_status, published);
CREATE TABLE IF NOT EXISTS atelier_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 campaign_type text NOT NULL CHECK (campaign_type IN ('offer','announcement')),
 title text NOT NULL,
 body text,
 discount_percent integer,
 coupon_code text,
 starts_at timestamptz,
 ends_at timestamptz,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','paused','expired','archived')),
 placement text NOT NULL DEFAULT 'site',
 created_by text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atelier_campaigns_workspace_status_idx ON atelier_campaigns(workspace_id,status,campaign_type,starts_at,ends_at);