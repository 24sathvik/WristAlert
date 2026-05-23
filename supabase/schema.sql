-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  whatsapp_number text,
  notification_prefs jsonb DEFAULT '{"email":true,"whatsapp":false,"push":false}',
  created_at timestamptz DEFAULT now()
);

-- WATCHES TABLE
CREATE TABLE IF NOT EXISTS watches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  product_url text NOT NULL,
  retailer text,
  brand text,
  model_name text,
  image_url text,
  current_price numeric,
  original_price numeric,
  currency text DEFAULT 'INR',
  stock_status text CHECK(stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- PRICE SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS price_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  watch_id uuid REFERENCES watches(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  stock_status text,
  scraped_at timestamptz DEFAULT now()
);

-- ALERT RULES TABLE
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  watch_id uuid REFERENCES watches(id) ON DELETE CASCADE,
  rule_type text CHECK(rule_type IN ('price_drop', 'restock', 'low_stock', 'any_change')),
  target_price numeric,
  min_drop_pct numeric DEFAULT 10,
  channels jsonb DEFAULT '["email"]',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ALERT LOG TABLE
CREATE TABLE IF NOT EXISTS alert_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  watch_id uuid REFERENCES watches(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES alert_rules(id) ON DELETE SET NULL,
  triggered_at timestamptz DEFAULT now(),
  old_value numeric,
  new_value numeric,
  delivered_at timestamptz,
  channel text
);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users can only read and write their own profile"
ON users FOR ALL
USING (auth.uid() = id);

CREATE POLICY "Users can only read and write their own watches"
ON watches FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can only read and write snapshots for their watches"
ON price_snapshots FOR ALL
USING (EXISTS (SELECT 1 FROM watches WHERE watches.id = price_snapshots.watch_id AND watches.user_id = auth.uid()));

CREATE POLICY "Users can only read and write their own alert rules"
ON alert_rules FOR ALL
USING (EXISTS (SELECT 1 FROM watches WHERE watches.id = alert_rules.watch_id AND watches.user_id = auth.uid()));

CREATE POLICY "Users can only read their own alert logs"
ON alert_log FOR SELECT
USING (EXISTS (SELECT 1 FROM watches WHERE watches.id = alert_log.watch_id AND watches.user_id = auth.uid()));

-- SUPABASE REALTIME
-- You might need to execute this via the Supabase Dashboard as it modifies publication.
-- BEGIN;
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime;
-- COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE watches;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_log;
