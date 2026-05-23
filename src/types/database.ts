export interface UserPrefs {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
}

export interface User {
  id: string;
  email: string;
  whatsapp_number?: string;
  notification_prefs: UserPrefs;
  created_at: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export interface Watch {
  id: string;
  user_id: string;
  product_url: string;
  retailer: string | null;
  brand: string | null;
  model_name: string | null;
  image_url: string | null;
  current_price: number | null;
  original_price: number | null;
  currency: string;
  stock_status: StockStatus;
  last_scraped_at: string | null;
  created_at: string;
}

export interface PriceSnapshot {
  id: string;
  watch_id: string;
  price: number;
  stock_status: string | null;
  scraped_at: string;
}

export type RuleType = 'price_drop' | 'restock' | 'low_stock' | 'any_change';

export interface AlertRule {
  id: string;
  watch_id: string;
  rule_type: RuleType;
  target_price: number | null;
  min_drop_pct: number;
  channels: string[];
  active: boolean;
  created_at: string;
}

export interface AlertLog {
  id: string;
  watch_id: string;
  rule_id: string | null;
  triggered_at: string;
  old_value: number | null;
  new_value: number | null;
  delivered_at: string | null;
  channel: string | null;
}
