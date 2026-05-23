import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  try {
    // We expect this edge function to be invoked via pg_cron periodically
    console.log("Starting scheduled scrape job")
    
    // Hit the backend scraping endpoint
    const backendUrl = Deno.env.get('BACKEND_URL') || 'http://localhost:3000'
    const secret = Deno.env.get('CRON_SECRET') || 'dev-secret'
    
    const response = await fetch(`${backendUrl}/api/internal/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    
    return new Response(
      JSON.stringify({ success: true, message: "Scrape job completed", data }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Scrape job failed:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
