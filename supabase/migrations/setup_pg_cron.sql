-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This sets up pg_cron to call the scrape-watches Edge Function every 5 minutes

-- Step 1: Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Schedule the scrape-watches Edge Function every 5 minutes
-- Replace 'YOUR_SUPABASE_PROJECT_REF' with your actual project ref (e.g. mlzmrnsnxefptvdhrna)
-- Replace 'YOUR_SERVICE_ROLE_KEY' with your actual service role key

SELECT cron.schedule(
  'scrape-watches-every-5-min',           -- job name
  '*/5 * * * *',                          -- every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://mlzmrnsnxefptvdhrna.supabase.co/functions/v1/scrape-watches',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sem1ybnNueGVmcHR2ZGhydG5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ0NzY5NCwiZXhwIjoyMDk1MDIzNjk0fQ.7ObhXAu-oHZSwarjWwFliGm_GSOXGQvA4vk5iuhoAK4"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Step 4: Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'scrape-watches-every-5-min';
