import { Resend } from 'resend';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY || '');
const watiToken = process.env.WATI_API_TOKEN || '';
const watiAccount = process.env.WATI_ACCOUNT_ID || '';

// Initialize Firebase Admin safely
if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface NotificationPayload {
  watch_id: string;
  rule_id: string;
  model_name: string;
  old_price: number | null;
  new_price: number | null;
  savings_pct: number;
  product_url: string;
  stock_status: string;
  channels: string[];
  user_id: string;
}

export async function dispatchNotification(payload: NotificationPayload) {
  const { user_id, channels, model_name, old_price, new_price, savings_pct, product_url, watch_id, rule_id } = payload;
  
  // Fetch user profile
  const { data: user } = await supabase.from('users').select('*').eq('id', user_id).single();
  if (!user) {
    console.warn(`User ${user_id} not found, skipping notification`);
    return;
  }

  const logDelivery = async (channel: string) => {
    await supabase.from('alert_log').insert({
      watch_id,
      rule_id,
      triggered_at: new Date().toISOString(),
      old_value: old_price,
      new_value: new_price,
      delivered_at: new Date().toISOString(),
      channel
    });
  };

  // 1. Email
  if (channels.includes('email') && user.email) {
    try {
      await resend.emails.send({
        from: 'alerts@wristalert.in',
        to: user.email,
        subject: `⬇️ Price Drop: ${model_name} is now ₹${new_price}`,
        html: `
          <div style="background-color: #0A0A0A; color: #F0F0F0; padding: 20px; font-family: sans-serif;">
            <h2 style="color: #00FF7F;">WristAlert Update</h2>
            <p><strong>${model_name}</strong> just dropped in price!</p>
            <p>Old Price: ₹${old_price} <br/> New Price: <strong>₹${new_price}</strong></p>
            <p>You save: ${savings_pct}%</p>
            <a href="${product_url}" style="background-color: #00FF7F; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;">Buy Now</a>
          </div>
        `
      });
      await logDelivery('email');
    } catch (err) {
      console.error("Email dispatch failed:", err);
    }
  }

  // 2. WhatsApp
  if (channels.includes('whatsapp') && user.whatsapp_number) {
    if (watiToken && watiAccount) {
      try {
        await axios.post(`https://live-mt-server.wati.io/${watiAccount}/api/v1/sendTemplateMessage`, {
          whatsappNumber: user.whatsapp_number,
          template_name: 'wristalert_price_drop',
          broadcast_name: 'price_drop',
          parameters: [
            { name: '1', value: model_name },
            { name: '2', value: old_price?.toString() || 'Unknown' },
            { name: '3', value: new_price?.toString() || 'Unknown' },
            { name: '4', value: savings_pct.toString() },
            { name: '5', value: product_url }
          ]
        }, { headers: { Authorization: `Bearer ${watiToken}` } });
        await logDelivery('whatsapp');
      } catch (err: any) {
        console.error("WhatsApp dispatch failed:", err.response?.data || err.message);
      }
    } else {
      console.warn("WhatsApp skipped: WATI credentials not configured");
      await logDelivery('whatsapp_pending');
    }
  }

  // 3. Push Notification (FCM)
  if (channels.includes('push') && user.fcm_token) {
    if (admin.apps.length) {
      try {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: {
            title: 'WristAlert Price Drop!',
            body: `${model_name} dropped to ₹${new_price}!`
          },
          data: { watch_id, product_url }
        });
        await logDelivery('push');
      } catch (err) {
        console.error("Push dispatch failed:", err);
      }
    } else {
      console.warn("Push skipped: Firebase Admin not configured");
    }
  }
}
