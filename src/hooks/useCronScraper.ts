import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSyncStore } from '@/store/useSyncStore'

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STORAGE_KEY = 'twp_last_scrape'

async function triggerScrape() {
  const { setSyncing, setLastSync } = useSyncStore.getState()
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    setSyncing(true)
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
      const now = Date.now()
      localStorage.setItem(STORAGE_KEY, now.toString())
      setLastSync(now)
    } else {
      console.warn('[CronScraper] Scrape returned:', res.status)
    }
  } catch (e) {
    console.warn('[CronScraper] Scrape error:', e)
  } finally {
    useSyncStore.getState().setSyncing(false)
  }
}

export function useCronScraper(isAuthenticated: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { setNextSyncIn, setLastSync } = useSyncStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Restore last sync time from localStorage
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    if (stored > 0) setLastSync(stored)

    const msSinceLast = Date.now() - (stored || 0)

    // Run immediately if overdue
    if (msSinceLast > SCRAPE_INTERVAL_MS) {
      triggerScrape()
    }

    // Update countdown every second
    countdownRef.current = setInterval(() => {
      const lastScrape = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      const elapsed = Date.now() - lastScrape
      const remaining = Math.max(0, Math.floor((SCRAPE_INTERVAL_MS - elapsed) / 1000))
      setNextSyncIn(remaining)

      // Trigger scrape when countdown hits 0
      if (remaining === 0 && !useSyncStore.getState().isSyncing) {
        triggerScrape()
      }
    }, 1000)

    // Fallback interval every 5 min in case countdown logic misses
    intervalRef.current = setInterval(triggerScrape, SCRAPE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isAuthenticated, setNextSyncIn, setLastSync])
}
