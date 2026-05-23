import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSyncStore } from '@/store/useSyncStore'

const SCRAPE_INTERVAL_MS = 5 * 60 * 1000  // 5 minutes
const MIN_RETRY_DELAY_MS = 60 * 1000       // don't retry more often than 1 min on failure
const STORAGE_KEY = 'twp_last_scrape'

// Export for manual trigger from dashboard
export const SCRAPE_COMPLETE_EVENT = 'wristalert:scrape-complete'

let _isFiring = false  // module-level guard to prevent parallel fires

async function triggerScrape() {
  if (_isFiring) return
  _isFiring = true

  const { setSyncing, setLastSync } = useSyncStore.getState()
  setSyncing(true)

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.warn('[CronScraper] No session, skipping scrape')
      return
    }

    console.log('[CronScraper] 🔄 Triggering scrape...')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000) // 55s client timeout

    const res = await fetch('/api/internal/cron-scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      console.log('[CronScraper] ✅ Done:', data.message)
      const now = Date.now()
      localStorage.setItem(STORAGE_KEY, now.toString())
      setLastSync(now)
      // Notify dashboard to refresh data
      window.dispatchEvent(new CustomEvent(SCRAPE_COMPLETE_EVENT))
    } else {
      const txt = await res.text()
      console.warn('[CronScraper] ❌ Error:', res.status, txt)
      // On failure, set last scrape to 1 min ago so retry waits 1 min, not 5 min
      const retryAt = Date.now() - (SCRAPE_INTERVAL_MS - MIN_RETRY_DELAY_MS)
      localStorage.setItem(STORAGE_KEY, retryAt.toString())
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') console.warn('[CronScraper] Fetch error:', e.message)
    const retryAt = Date.now() - (SCRAPE_INTERVAL_MS - MIN_RETRY_DELAY_MS)
    localStorage.setItem(STORAGE_KEY, retryAt.toString())
  } finally {
    setSyncing(false)
    _isFiring = false
  }
}

export function useCronScraper(isAuthenticated: boolean) {
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { setNextSyncIn, setLastSync } = useSyncStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Restore persisted last-sync time
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    if (stored > 0) setLastSync(stored)

    // Run immediately if overdue
    const msSinceLast = Date.now() - (stored || 0)
    if (msSinceLast >= SCRAPE_INTERVAL_MS) {
      triggerScrape()
    }

    // Tick every second: update countdown, fire when due
    countdownRef.current = setInterval(() => {
      const last = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      const elapsed = Date.now() - last
      const remaining = Math.max(0, Math.floor((SCRAPE_INTERVAL_MS - elapsed) / 1000))
      setNextSyncIn(remaining)

      if (remaining === 0 && !useSyncStore.getState().isSyncing && !_isFiring) {
        triggerScrape()
      }
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isAuthenticated, setNextSyncIn, setLastSync])
}
