import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || '';
const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const scrapeQueue = new Queue('price-check', { connection: redisConnection });

export default async function handler(req: any, res: any) {
  // CORS internal
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Very basic auth to ensure only our python scraper calls this (in production you'd use a shared secret)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.SERVICE_ROLE_KEY}`) {
    // We are using the supabase service role key as a quick internal secret token
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { watch_id } = req.body;
  if (!watch_id) return res.status(400).json({ success: false, error: 'watch_id is required' });

  try {
    // Add job to trigger the alert engine to check the new snapshots
    await scrapeQueue.add('evaluate-price', { watchId: watch_id }, { delay: 0 });
    return res.status(200).json({ success: true, message: 'Enqueued evaluation job' });
  } catch (error: any) {
    console.error("Queue error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
