import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Setup Redis & Queue (safe to fail in local dev without Redis)
const redisUrl = process.env.REDIS_URL || '';
let scrapeQueue: Queue | null = null;
try {
  const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  scrapeQueue = new Queue('scrapeQueue', { connection: redisConnection });
} catch (e) {
  console.warn('Redis unavailable, skipping queue setup');
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
// Use service role key if available (bypasses RLS), otherwise fall back to anon + user JWT
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY || '';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    // Fetch user's watches
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data, error } = await supabase
      .from('watches')
      .select(`*, price_snapshots(price, stock_status, scraped_at), alert_rules(id, rule_type, target_price, active, channels)`)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Verify Auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Create an authenticated Supabase client — uses user JWT so auth.uid() works in RLS
  // If we have a service role key, use it to bypass RLS entirely (more reliable)
  const keyToUse = supabaseServiceKey && supabaseServiceKey !== 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE'
    ? supabaseServiceKey
    : supabaseAnonKey;

  const supabase = createClient(supabaseUrl, keyToUse, {
    global: {
      headers: keyToUse === supabaseAnonKey
        ? { Authorization: `Bearer ${token}` }  // user JWT → RLS uses auth.uid()
        : {}
    }
  });

  // Verify token & get user
  const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await verifyClient.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  const userId = user.id;

    product_url, retailer, brand, model_name, image_url,
    current_price, target_price, rule_types, channels, stock_status
  } = req.body;

  if (!product_url) return res.status(400).json({ success: false, error: 'Product URL is required' });

  try {
    // 0. Ensure user exists in public.users to satisfy foreign key constraints
    await supabase.from('users')
      .upsert({ id: userId, email: user.email })
      .select()
      .single()
      .catch(e => console.warn('User upsert failed:', e.message));

    // 1. Insert Watch
    const { data: watch, error: watchError } = await supabase
      .from('watches')
      .insert({
        user_id: userId,
        product_url,
        retailer: retailer || 'other',
        brand: brand || null,
        model_name: model_name || 'Unknown Watch',
        image_url: image_url || null,
        current_price: parseFloat(current_price) || 0,
        original_price: parseFloat(current_price) || 0,
        stock_status: stock_status || 'unknown',
        currency: 'INR',
        last_scraped_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (watchError) {
      console.error('[Watch Insert Error]', JSON.stringify(watchError));
      return res.status(500).json({ success: false, error: `DB error: ${watchError.message}` });
    }

    // 2. Insert First Price Snapshot
    await supabase.from('price_snapshots').insert({
      watch_id: watch.id,
      price: parseFloat(current_price) || 0,
      stock_status: stock_status || 'unknown',
      scraped_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.warn('[Snapshot Insert]', error.message); });

    // 3. Insert Alert Rules
    if (rule_types && rule_types.length > 0) {
      const rules = rule_types.map((type: string) => ({
        watch_id: watch.id,
        rule_type: type,
        target_price: type === 'price_drop' ? (target_price ? parseFloat(target_price) : null) : null,
        min_drop_pct: 10,
        channels: channels || ['email'],
        active: true,
      }));
      const { error: ruleError } = await supabase.from('alert_rules').insert(rules);
      if (ruleError) console.warn('[Alert Rules Insert]', ruleError.message);
    }

    // 4. Queue immediate first scrape (best-effort)
    if (scrapeQueue) {
      await scrapeQueue.add('scrape-watch', { watchId: watch.id, url: product_url }, { delay: 0 })
        .catch(e => console.warn('Redis queue failed:', e.message));
    }

    return res.status(201).json({ success: true, data: watch });
  } catch (error: any) {
    console.error('[Save Watch Unexpected Error]', error);
    return res.status(500).json({ success: false, error: error.message || 'Unexpected error saving watch' });
  }
}
