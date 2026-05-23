import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STORAGE_KEY = 'twp_last_scrape'

async function triggerScrape() {
  try {
    // Get current session token to authorize the API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    console.log('[CronScraper] Triggering scheduled scrape...')
    const res = await fetch('/api/internal/cron-scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    })

    if (res.ok) {
      const data = await res.json()
      console.log('[CronScraper] Scrape completed:', data.message)
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } else {
      console.warn('[CronScraper] Scrape returned:', res.status)
    }
  } catch (e) {
    console.warn('[CronScraper] Scrape error:', e)
  }
}

/**
 * useCronScraper — runs a background scrape every 5 minutes while the
 * user is logged in and the tab is open. Falls back gracefully if the
 * API is unreachable.  No Vercel Pro / pg_cron required.
 */
export function useCronScraper(isAuthenticated: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    // On mount: run immediately if last scrape was > 5 min ago (or never)
    const lastScrape = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    const msSinceLast = Date.now() - lastScrape
    if (msSinceLast > SCRAPE_INTERVAL_MS) {
      triggerScrape()
    }

    // Then run every 5 minutes
    intervalRef.current = setInterval(triggerScrape, SCRAPE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isAuthenticated])
}
