import React, { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { Activity, Watch as WatchIcon, Trash2, BellRing, TrendingDown, RefreshCw, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import PageTransition from '@/components/PageTransition'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import type { Watch, PriceSnapshot } from '@/types/database'
import { WatchDetailModal } from '@/components/WatchDetailModal'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface EnrichedWatch extends Watch {
  snapshots: PriceSnapshot[]
}

interface FeedEvent {
  id: string
  timestamp: string
  type: 'price_drop' | 'restock' | 'new_track' | 'other'
  title: string
  description: string
  icon: React.ReactNode
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const [watches, setWatches] = useState<EnrichedWatch[]>([])
  const [activeAlertsCount, setActiveAlertsCount] = useState(0)
  const [alertsSentCount, setAlertsSentCount] = useState(0)
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])

  // Calculated Stats
  function useCountUp(target: number, duration = 1000) {
    const [val, setVal] = useState(0);
    useEffect(() => {
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        setVal(Math.floor(start));
        if (start >= target) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    }, [target, duration]);
    return val;
  }

  const animatedWatchesCount = useCountUp(watches.length);
  const animatedActiveAlerts = useCountUp(activeAlertsCount);
  const animatedAlertsSent = useCountUp(alertsSentCount);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setLoading(true)
      
      // Fetch Watches
      const { data: watchesData, error: watchesError } = await supabase
        .from('watches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (watchesError) {
        toast.error('Failed to load watches')
      }

      // Fetch Snapshots for these watches
      let allSnapshots: PriceSnapshot[] = []
      if (watchesData && watchesData.length > 0) {
        const watchIds = watchesData.map(w => w.id)
        const { data: snapshotsData } = await supabase
          .from('price_snapshots')
          .select('*')
          .in('watch_id', watchIds)
          .order('scraped_at', { ascending: false })
          
        allSnapshots = snapshotsData || []
      }

      // Enrich watches with their snapshots (last 7)
      const enriched: EnrichedWatch[] = (watchesData || []).map(w => ({
        ...w,
        snapshots: allSnapshots.filter(s => s.watch_id === w.id).slice(0, 7).reverse() // reverse to show chronological order left-to-right
      }))
      setWatches(enriched)

      // Fetch Active Alerts Count
      if (watchesData && watchesData.length > 0) {
        const watchIds = watchesData.map(w => w.id)
        const { count: alertsCount } = await supabase
          .from('alert_rules')
          .select('*', { count: 'exact', head: true })
          .in('watch_id', watchIds)
          .eq('active', true)
        setActiveAlertsCount(alertsCount || 0)

        // Fetch Alert Logs (Last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const { data: logsData, count: logsCount } = await supabase
          .from('alert_log')
          .select('*', { count: 'exact' })
          .in('watch_id', watchIds)
          .gte('triggered_at', thirtyDaysAgo.toISOString())
          .order('triggered_at', { ascending: false })
          .limit(20)
        
        setAlertsSentCount(logsCount || 0)

        // Build Activity Feed
        const events: FeedEvent[] = []
        
        // Add new tracks to feed
        watchesData.forEach(w => {
          events.push({
            id: `track-${w.id}`,
            timestamp: w.created_at,
            type: 'new_track',
            title: w.model_name || 'New Watch',
            description: `Started tracking on ${w.retailer || 'Store'}`,
            icon: <Plus className="h-4 w-4 text-primary" />
          })
        })

        // Add alert logs to feed
        ;(logsData || []).forEach(log => {
          const watch = watchesData.find(w => w.id === log.watch_id)
          const isDrop = log.old_value && log.new_value && log.new_value < log.old_value
          events.push({
            id: log.id,
            timestamp: log.triggered_at,
            type: isDrop ? 'price_drop' : 'restock',
            title: watch?.model_name || 'Watch Alert',
            description: isDrop ? `Price dropped to ${formatCurrency(log.new_value || 0)}` : 'Item is back in stock',
            icon: isDrop ? <TrendingDown className="h-4 w-4 text-primary" /> : <RefreshCw className="h-4 w-4 text-primary" />
          })
        })

        // Sort events chronologically, newest first
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setFeedEvents(events.slice(0, 50)) // Keep top 50
      }

      setLoading(false)
    }

    fetchData()

    // Setup Realtime Subscriptions
    const watchSubscription = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watches', filter: `user_id=eq.${user.id}` },
        () => {
          // Simplest approach: refetch data on change
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alert_log' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(watchSubscription)
    }
  }, [user])

  const handleDeleteWatch = async (id: string) => {
    if(!confirm("Are you sure you want to stop tracking this watch?")) return
    const { error } = await supabase.from('watches').delete().eq('id', id)
    if(error) toast.error("Failed to delete watch")
    else {
      toast.success("Watch removed")
      setWatches(w => w.filter(watch => watch.id !== id))
    }
  }

  // Stock badge colors
  const getStockColor = (status: string) => {
    switch(status) {
      case 'in_stock': return 'bg-primary text-black'
      case 'low_stock': return 'bg-amber-500 text-black'
      case 'out_of_stock': return 'bg-red-500 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getStockLabel = (status: string) => {
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <PageTransition>
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <Link to="/track" className="btn-primary py-2 flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Add Watch
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6 border-border/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <WatchIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Watches Tracked</p>
                <p className="text-3xl font-mono font-bold">{animatedWatchesCount}</p>
              </div>
            </div>
          </div>
          
          <div className="card p-6 border-border/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <BellRing className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Active Alerts</p>
                <p className="text-3xl font-mono font-bold">{animatedActiveAlerts}</p>
              </div>
            </div>
          </div>

          <div className="card p-6 border-border/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Activity className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-muted">Alerts Sent (30d)</p>
                <p className="text-3xl font-mono font-bold">{animatedAlertsSent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Watched Watches Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Tracked Watches</h2>
            </div>

            {loading ? (
              <motion.div 
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {[1, 2, 3, 4].map(i => (
                  <motion.div key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="card p-5 h-64 animate-pulse flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="h-16 w-16 bg-primary/10 rounded-xl"></div>
                      <div className="h-6 w-20 bg-primary/10 rounded-full"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-3/4 bg-primary/10 rounded"></div>
                      <div className="h-4 w-1/2 bg-primary/10 rounded"></div>
                    </div>
                    <div className="h-10 w-full bg-primary/10 rounded mt-4"></div>
                  </motion.div>
                ))}
              </motion.div>
            ) : watches.length === 0 ? (
              <div className="card p-12 text-center border-dashed">
                <WatchIcon className="h-12 w-12 mx-auto text-text-muted mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">No watches tracked yet</h3>
                <p className="text-text-muted mb-6">Add your first watch to start tracking its price.</p>
                <Link to="/track" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Start Tracking
                </Link>
              </div>
            ) : (
              <motion.div 
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {watches.map(watch => {
                  const discount = watch.original_price && watch.current_price 
                    ? watch.original_price - watch.current_price 
                    : 0
                  const discountPct = watch.original_price && watch.current_price && watch.original_price > 0
                    ? Math.round((discount / watch.original_price) * 100)
                    : 0

                  const chartData = watch.snapshots.length > 1 
                    ? watch.snapshots 
                    : [{ price: watch.current_price || 0 }, { price: watch.current_price || 0 }]

                  return (
                    <motion.div
                      key={watch.id}
                      variants={{
                        hidden: { opacity: 0, y: 24, scale: 0.97 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
                      }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      className="card p-5 group flex flex-col cursor-pointer"
                      onClick={() => setSelectedWatchId(watch.id)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        {watch.image_url ? (
                          <img src={watch.image_url} alt="watch" className="h-16 w-16 object-cover rounded-xl bg-black" />
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-black flex items-center justify-center border border-border">
                            <WatchIcon className="h-8 w-8 text-text-muted" />
                          </div>
                        )}
                        
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStockColor(watch.stock_status)}`}>
                            {getStockLabel(watch.stock_status)}
                          </span>
                          {watch.retailer && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30 text-primary uppercase tracking-wider bg-primary/5">
                              {watch.retailer}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-white leading-tight mb-1 line-clamp-2" title={watch.model_name || 'Unknown Model'}>
                          {watch.model_name || 'Unknown Model'}
                        </h3>
                        {watch.brand && <p className="text-sm text-text-muted">{watch.brand}</p>}
                      </div>

                      <div className="mt-4 mb-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-primary">
                          {formatCurrency(watch.current_price || 0, watch.currency)}
                        </span>
                        {watch.original_price && watch.original_price > (watch.current_price || 0) && (
                          <span className="text-sm text-text-muted line-through">
                            {formatCurrency(watch.original_price, watch.currency)}
                          </span>
                        )}
                      </div>

                      {discount > 0 && (
                        <div className="mb-4">
                          <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                            Save {formatCurrency(discount, watch.currency)} ({discountPct}%)
                          </span>
                        </div>
                      )}

                      <div className="h-10 w-full mb-4 opacity-70 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <Line 
                              type="monotone" 
                              dataKey="price" 
                              stroke="#00FF7F" 
                              strokeWidth={2} 
                              dot={false}
                              isAnimationActive={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border/50">
                        <button className="flex-1 bg-surface border border-border text-xs font-bold py-2 rounded-lg hover:bg-black transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedWatchId(watch.id); }}>
                          View Details
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteWatch(watch.id); }}
                          className="bg-surface border border-border text-red-500 p-2 rounded-lg hover:bg-red-950 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </div>

          {/* Right Column: Real-time Activity Feed */}
          <div className="lg:col-span-1">
            <div className="card bg-black h-full min-h-[500px] flex flex-col">
              <div className="p-5 border-b border-border flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  Live Activity
                </h3>
              </div>
              
              <div className="flex-1 p-5 overflow-y-auto max-h-[600px] space-y-6">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-primary/10 shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-primary/10 rounded"></div>
                        <div className="h-3 w-1/2 bg-primary/10 rounded"></div>
                      </div>
                    </div>
                  ))
                ) : feedEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-text-muted mt-10">
                    <Activity className="h-10 w-10 mb-4 opacity-20" />
                    <p className="text-sm">Activity will appear here as prices change and alerts trigger.</p>
                  </div>
                ) : (
                  feedEvents.map((event, i) => (
                    <div key={`${event.id}-${i}`} className="flex gap-4 group">
                      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <p className="text-sm font-bold text-white truncate">{event.title}</p>
                          <span className="text-[10px] text-text-muted whitespace-nowrap">{timeAgo(event.timestamp)}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{event.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {selectedWatchId && (
          <WatchDetailModal 
            watchId={selectedWatchId} 
            onClose={() => setSelectedWatchId(null)} 
          />
        )}
      </div>
    </PageTransition>
  )
}


