import { createClient } from '@supabase/supabase-js';
import { scrapeByMetadata } from '../utils/scrapers.js';
import { dispatchNotification } from '../../workers/notificationDispatcher.js';

export default async function handler(req: any, res: any) {
  // CORS & Methods
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Security: check for Vercel Cron Secret or our Service Key
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SERVICE_ROLE_KEY;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && authHeader !== `Bearer ${serviceKey}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = serviceKey || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('[Cron] Starting scheduled scrape run...');

  try {
    // Fetch all active watches
    const { data: watches, error: watchesError } = await supabase
      .from('watches')
      .select('*');

    if (watchesError || !watches || watches.length === 0) {
      return res.status(200).json({ success: true, message: 'No watches found.' });
    }

    console.log(`[Cron] Found ${watches.length} watches. Scraping in parallel...`);

    // Process all in parallel to fit within Vercel timeout (10s hobby limit)
    const promises = watches.map(async (watch) => {
      try {
        const result = await scrapeByMetadata(watch.product_url);
        const newPrice = result.price;
        const newStock = result.stockStatus;

        if (newPrice && newPrice > 0) {
          const priceChanged = newPrice !== watch.current_price;
          const stockChanged = newStock !== watch.stock_status;

          if (priceChanged || stockChanged) {
            console.log(`[Cron] 🟢 Change detected for ${watch.model_name}: ₹${watch.current_price} -> ₹${newPrice} (${newStock})`);
            
            // 1. Save Snapshot
            await supabase.from('price_snapshots').insert({
              watch_id: watch.id,
              price: newPrice,
              stock_status: newStock,
              scraped_at: new Date().toISOString()
            });

            // 2. Update Watch
            await supabase.from('watches').update({
              current_price: newPrice,
              stock_status: newStock,
              last_scraped_at: new Date().toISOString()
            }).eq('id', watch.id);

            // 3. Evaluate Alerts
            const { data: rules } = await supabase
              .from('alert_rules')
              .select('*')
              .eq('watch_id', watch.id)
              .eq('active', true);

            if (rules && rules.length > 0) {
              const previousStock = watch.stock_status;
              const previousPrice = watch.current_price;

              for (const rule of rules) {
                let triggered = false;

                if (rule.rule_type === 'price_drop') {
                  const dropPct = previousPrice > 0 ? ((previousPrice - newPrice) / previousPrice) * 100 : 0;
                  if ((rule.target_price && newPrice <= rule.target_price) || (rule.min_drop_pct && dropPct >= rule.min_drop_pct)) {
                    triggered = true;
                  }
                } else if (rule.rule_type === 'restock') {
                  if ((previousStock === 'out_of_stock' || previousStock === 'low_stock') && newStock === 'in_stock') {
                    triggered = true;
                  }
                } else if (rule.rule_type === 'low_stock') {
                  if (newStock === 'low_stock') {
                    triggered = true;
                  }
                } else if (rule.rule_type === 'any_change') {
                  if (priceChanged || stockChanged) {
                    triggered = true;
                  }
                }

                if (triggered) {
                  // Idempotency: skip if triggered in last 1 hour
                  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                  const { data: recentLog } = await supabase
                    .from('alert_log')
                    .select('id')
                    .eq('rule_id', rule.id)
                    .gte('triggered_at', oneHourAgo)
                    .limit(1);

                  if (!recentLog || recentLog.length === 0) {
                    const savingsPct = watch.original_price && watch.original_price > newPrice 
                      ? Math.round(((watch.original_price - newPrice) / watch.original_price) * 100)
                      : 0;

                    // Send notifications synchronously to ensure Vercel completes it
                    await dispatchNotification({
                      watch_id: watch.id,
                      rule_id: rule.id,
                      model_name: watch.model_name || 'Watch',
                      old_price: previousPrice,
                      new_price: newPrice,
                      savings_pct: savingsPct,
                      product_url: watch.product_url,
                      stock_status: newStock || 'unknown',
                      channels: rule.channels,
                      user_id: watch.user_id
                    });
                  }
                }
              }
            }
          } else {
            // Just update last scraped
            await supabase.from('watches').update({
              last_scraped_at: new Date().toISOString()
            }).eq('id', watch.id);
          }
        }
      } catch (e: any) {
        console.error(`[Cron] Error scraping ${watch.product_url}:`, e.message);
      }
    });

    await Promise.allSettled(promises);
    console.log('[Cron] Finished scraping run.');
    return res.status(200).json({ success: true, message: `Processed ${watches.length} watches.` });

  } catch (error: any) {
    console.error('[Cron] Fatal Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
