import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dispatchNotification } from './notificationDispatcher';

dotenv.config();

const redisUrl = process.env.REDIS_URL || '';
const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to check if current time is within quiet hours (23:00 - 08:00 IST)
function isQuietHours() {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false
  });
  const currentHour = parseInt(formatter.format(new Date()));
  return currentHour >= 23 || currentHour < 8;
}

const worker = new Worker('price-check', async job => {
  const { watchId } = job.data;
  console.log(`Processing price-check for watch: ${watchId}`);

  try {
    // 1. Fetch Watch and its latest 2 snapshots
    const { data: watch, error: watchError } = await supabase
      .from('watches')
      .select('*')
      .eq('id', watchId)
      .single();
    
    if (watchError || !watch) throw new Error("Watch not found");

    const { data: snapshots } = await supabase
      .from('price_snapshots')
      .select('*')
      .eq('watch_id', watchId)
      .order('scraped_at', { ascending: false })
      .limit(2);

    if (!snapshots || snapshots.length < 2) {
      console.log(`Not enough snapshots for watch ${watchId} to evaluate alerts.`);
      return;
    }

    const latest = snapshots[0];
    const previous = snapshots[1];

    // 2. Fetch Active Alert Rules
    const { data: rules } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('watch_id', watchId)
      .eq('active', true);

    if (!rules || rules.length === 0) return;

    // Fetch user quiet hour preference
    const { data: userPref } = await supabase.from('users').select('quiet_hours').eq('id', watch.user_id).single();
    const userQuietHours = userPref?.quiet_hours ?? false;

    // Evaluate each rule
    for (const rule of rules) {
      let triggered = false;

      if (rule.rule_type === 'price_drop') {
        const dropPct = previous.price > 0 ? ((previous.price - latest.price) / previous.price) * 100 : 0;
        if ((rule.target_price && latest.price <= rule.target_price) || (rule.min_drop_pct && dropPct >= rule.min_drop_pct)) {
          triggered = true;
        }
      } else if (rule.rule_type === 'restock') {
        if ((previous.stock_status === 'out_of_stock' || previous.stock_status === 'low_stock') && latest.stock_status === 'in_stock') {
          triggered = true;
        }
      } else if (rule.rule_type === 'low_stock') {
        if (latest.stock_status === 'low_stock') {
          triggered = true;
        }
      } else if (rule.rule_type === 'any_change') {
        if (latest.price !== previous.price || latest.stock_status !== previous.stock_status) {
          triggered = true;
        }
      }

      if (triggered) {
        // Idempotency Check (1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentLog } = await supabase
          .from('alert_log')
          .select('id')
          .eq('rule_id', rule.id)
          .gte('triggered_at', oneHourAgo)
          .limit(1);

        if (recentLog && recentLog.length > 0) {
          console.log(`Skipping rule ${rule.id} - triggered recently`);
          continue;
        }

        // Check Quiet Hours
        if (userQuietHours && isQuietHours()) {
          console.log(`Quiet hours active. Skipping notification for now.`);
          continue;
        }

        // Dispatch
        const savingsPct = watch.original_price && watch.original_price > latest.price 
          ? Math.round(((watch.original_price - latest.price) / watch.original_price) * 100)
          : 0;

        await dispatchNotification({
          watch_id: watch.id,
          rule_id: rule.id,
          model_name: watch.model_name || 'Watch',
          old_price: previous.price,
          new_price: latest.price,
          savings_pct: savingsPct,
          product_url: watch.product_url,
          stock_status: latest.stock_status || 'unknown',
          channels: rule.channels,
          user_id: watch.user_id
        });
      }
    }
  } catch (err: any) {
    console.error(`Error processing job ${job.id}:`, err.message);
  }
}, { connection: redisConnection });

worker.on('completed', job => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with ${err.message}`);
});

console.log("Alert Engine Worker started on 'price-check' queue...");
