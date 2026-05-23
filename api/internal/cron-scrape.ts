import { createClient } from '@supabase/supabase-js';
import { scrapeByMetadata } from '../utils/scrapers.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const cronSecret = process.env.CRON_SECRET || '';

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ success: false, error: 'Missing Supabase config' });
  }

  // Accept: CRON_SECRET, SERVICE_ROLE_KEY, or a valid user JWT
  let authorized = false;
  if (cronSecret && token === cronSecret) {
    authorized = true;
  } else if (serviceKey && token === serviceKey) {
    authorized = true;
  } else if (token) {
    try {
      const verifyClient = createClient(supabaseUrl, serviceKey);
      const { data: { user } } = await verifyClient.auth.getUser(token);
      if (user) authorized = true;
    } catch { /* ignore */ }
  }

  if (!authorized) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  console.log('[Cron] Starting scheduled scrape run...');

  try {
    const { data: watches, error: watchesError } = await supabase
      .from('watches')
      .select('*');

    if (watchesError) {
      return res.status(500).json({ success: false, error: watchesError.message });
    }

    if (!watches || watches.length === 0) {
      return res.status(200).json({ success: true, message: 'No watches to scrape.' });
    }

    console.log(`[Cron] Scraping ${watches.length} watches...`);

    const results: string[] = [];

    // Process each watch with timeout safety
    const promises = watches.map(async (watch: any) => {
      try {
        // 8s timeout per watch
        const scrapePromise = scrapeByMetadata(watch.product_url);
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Scrape timeout')), 8000)
        );

        const result = await Promise.race([scrapePromise, timeoutPromise]) as any;
        if (!result) return;

        const newPrice = result.price;
        const newStock = result.stockStatus || 'unknown';

        // Always save a snapshot even if nothing changed (proves tracking works)
        await supabase.from('price_snapshots').insert({
          watch_id: watch.id,
          price: newPrice ?? watch.current_price,
          stock_status: newStock,
          scraped_at: new Date().toISOString(),
        }).then(({ error }: any) => {
          if (error) console.warn('[Cron] Snapshot insert error:', error.message);
        });

        // Update watch if price or stock changed
        const priceChanged = newPrice && newPrice > 0 && newPrice !== watch.current_price;
        const stockChanged = newStock !== watch.stock_status;

        if (priceChanged || stockChanged) {
          await supabase.from('watches').update({
            current_price: newPrice ?? watch.current_price,
            stock_status: newStock,
            last_scraped_at: new Date().toISOString(),
          }).eq('id', watch.id);

          results.push(`${watch.model_name}: ₹${watch.current_price}→₹${newPrice} (${newStock})`);

          // Check alert rules
          const { data: rules } = await supabase
            .from('alert_rules')
            .select('*')
            .eq('watch_id', watch.id)
            .eq('active', true);

          if (rules && rules.length > 0) {
            for (const rule of rules) {
              let triggered = false;
              const dropPct = watch.current_price > 0
                ? ((watch.current_price - (newPrice ?? 0)) / watch.current_price) * 100
                : 0;

              if (rule.rule_type === 'price_drop') {
                if ((rule.target_price && (newPrice ?? 0) <= rule.target_price) ||
                    (rule.min_drop_pct && dropPct >= rule.min_drop_pct)) {
                  triggered = true;
                }
              } else if (rule.rule_type === 'restock') {
                if (['out_of_stock', 'low_stock'].includes(watch.stock_status) && newStock === 'in_stock') {
                  triggered = true;
                }
              } else if (rule.rule_type === 'any_change') {
                triggered = true;
              }

              if (triggered) {
                // Check idempotency (no duplicate alert within 1 hour)
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const { data: recentLog } = await supabase
                  .from('alert_log')
                  .select('id')
                  .eq('rule_id', rule.id)
                  .gte('triggered_at', oneHourAgo)
                  .limit(1);

                if (!recentLog || recentLog.length === 0) {
                  // Log the alert (notification dispatch done separately if env vars present)
                  await supabase.from('alert_log').insert({
                    watch_id: watch.id,
                    rule_id: rule.id,
                    user_id: watch.user_id,
                    alert_type: rule.rule_type,
                    old_value: watch.current_price,
                    new_value: newPrice,
                    triggered_at: new Date().toISOString(),
                  });
                }
              }
            }
          }
        } else {
          // Just mark last scraped
          await supabase.from('watches').update({
            last_scraped_at: new Date().toISOString(),
          }).eq('id', watch.id);
        }
      } catch (e: any) {
        console.error(`[Cron] Error scraping ${watch.product_url}:`, e.message);
      }
    });

    await Promise.allSettled(promises);

    console.log('[Cron] Finished. Changes:', results.length);
    return res.status(200).json({
      success: true,
      message: `Processed ${watches.length} watches. ${results.length} changes detected.`,
      changes: results,
    });

  } catch (error: any) {
    console.error('[Cron] Fatal:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
