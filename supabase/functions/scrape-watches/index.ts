import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (_req) => {
  try {
    console.log("[scrape-watches] Starting scheduled scrape job via pg_cron")

    // Your deployed Vercel URL — set this in Supabase Edge Function secrets as VERCEL_URL
    const vercelUrl = Deno.env.get('VERCEL_URL') || ''
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || ''

    if (!vercelUrl) {
      throw new Error('VERCEL_URL environment variable is not set in Supabase Edge Function secrets')
    }

    const response = await fetch(`${vercelUrl}/api/internal/cron-scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Vercel responded with ${response.status}: ${JSON.stringify(data)}`)
    }

    console.log("[scrape-watches] Scrape job completed:", data.message)

    return new Response(
      JSON.stringify({ success: true, message: "Scrape job completed", data }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[scrape-watches] Scrape job failed:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
