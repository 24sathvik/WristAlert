import { useState, useEffect, useRef } from 'react'
import { Bell, Globe, Layout, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'

export default function AppSettings() {
  const { user } = useAuthStore()
  const [prefs, setPrefs] = useState({
    minDropPct: 10,
    quietHours: false,
    quietFrom: '23:00',
    quietTo: '08:00',
    alertCap: 'no_limit',
    currency: 'INR',
    chartRange: '30d',
    cardSize: 'comfortable',
    emailDigest: 'instant',
    whatsappFormat: 'full'
  })
  const [saveStatus, setSaveStatus] = useState('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (user) fetchPrefs()
  }, [user])

  const fetchPrefs = async () => {
    const { data } = await supabase.from('users').select('notification_prefs').eq('id', user?.id).single()
    if (data?.notification_prefs) {
      setPrefs({ ...prefs, ...data.notification_prefs })
    }
  }

  const handlePrefChange = (key: string, value: any) => {
    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    
    // Debounce auto-save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('Saving...')
      try {
        await supabase.from('users').update({ notification_prefs: newPrefs }).eq('id', user?.id)
        setSaveStatus('Saved ✓')
        setTimeout(() => setSaveStatus(''), 2000)
      } catch (e) {
        setSaveStatus('Error')
      }
    }, 800)
  }

  const forceScrape = async () => {
    toast.promise(
      // We assume cron endpoint still works or edge function
      fetch('/api/cron/scrape', { method: 'POST' }).then(r => { if(!r.ok) throw new Error() }),
      { loading: 'Scraping...', success: 'Global scrape triggered', error: 'Scrape failed' }
    )
  }

  return (
    <PageTransition>
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold">App Settings</h1>
          {saveStatus && <span className={`text-sm font-bold px-3 py-1 rounded-full ${saveStatus === 'Saved ✓' ? 'bg-primary/20 text-primary' : 'text-text-muted'}`}>{saveStatus}</span>}
        </div>

        <div className="space-y-6">
          {/* ALERT PREFS */}
          <div className="card p-6 border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Alert Preferences</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Alert me when price drops by at least {prefs.minDropPct}%</label>
                <input 
                  type="range" min="1" max="50" 
                  value={prefs.minDropPct}
                  onChange={(e) => handlePrefChange('minDropPct', parseInt(e.target.value))}
                  className="w-full accent-primary" 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold">Quiet Hours</p>
                  <p className="text-xs text-text-muted">Pause alerts during sleep</p>
                </div>
                <button 
                  onClick={() => handlePrefChange('quietHours', !prefs.quietHours)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${prefs.quietHours ? 'bg-primary' : 'bg-[#333]'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${prefs.quietHours ? 'translate-x-6' : ''}`} />
                </button>
              </div>
              {prefs.quietHours && (
                <div className="flex gap-4 p-4 bg-black rounded-xl border border-border">
                  <div className="flex-1">
                    <label className="text-xs text-text-muted">From</label>
                    <input type="time" value={prefs.quietFrom} onChange={e => handlePrefChange('quietFrom', e.target.value)} className="input-field w-full py-2" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-muted">To</label>
                    <input type="time" value={prefs.quietTo} onChange={e => handlePrefChange('quietTo', e.target.value)} className="input-field w-full py-2" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Alert Frequency Cap</label>
                <select value={prefs.alertCap} onChange={e => handlePrefChange('alertCap', e.target.value)} className="input-field w-full py-2">
                  <option value="no_limit">No limit (Instant)</option>
                  <option value="1_per_hour">Max 1 alert per watch per hour</option>
                  <option value="3_per_day">Max 3 alerts per watch per day</option>
                </select>
              </div>
            </div>
          </div>

          {/* SCRAPING PREFS */}
          <div className="card p-6 border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Scraping & Sync</h3>
            <div className="space-y-4">
              <div className="p-4 bg-black rounded-xl border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">Check Frequency</p>
                  <p className="text-xs text-text-muted">Every 5 minutes via Supabase Edge Functions</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary font-bold">Active</span>
                </div>
              </div>
              <button onClick={forceScrape} className="w-full btn-outline py-3 flex items-center justify-center gap-2 hover:bg-[#111]">
                <RefreshCw className="h-4 w-4" /> Force Refresh All Now
              </button>
            </div>
          </div>

          {/* DISPLAY PREFS */}
          <div className="card p-6 border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Layout className="h-5 w-5 text-primary" /> Display Preferences</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency Display</label>
                <input type="text" disabled value="INR (₹)" className="input-field w-full py-2 opacity-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Default Chart Range</label>
                <select value={prefs.chartRange} onChange={e => handlePrefChange('chartRange', e.target.value)} className="input-field w-full py-2">
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Dashboard Card Size</label>
                <select value={prefs.cardSize} onChange={e => handlePrefChange('cardSize', e.target.value)} className="input-field w-full py-2">
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
