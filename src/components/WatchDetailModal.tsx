import { useEffect, useState } from 'react'
import { X, ExternalLink, Activity, Clock, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { PriceHistoryChart } from './PriceHistoryChart'
import { Skeleton } from './Skeleton'
import { motion } from 'framer-motion'

interface Props {
  watchId: string
  onClose: () => void
}

export function WatchDetailModal({ watchId, onClose }: Props) {
  const [watch, setWatch] = useState<any>(null)
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWatchDetails()
    // Lock body scroll when panel is open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [watchId])

  const fetchWatchDetails = async () => {
    setLoading(true)
    const { data: watchData } = await supabase.from('watches').select('*').eq('id', watchId).single()
    if (watchData) setWatch(watchData)
    const { data: rulesData } = await supabase.from('alert_rules').select('*').eq('watch_id', watchId)
    if (rulesData) setRules(rulesData)
    setLoading(false)
  }

  const handleRuleToggle = async (ruleId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    setRules(rules.map(r => r.id === ruleId ? { ...r, active: newStatus } : r))
    await supabase.from('alert_rules').update({ active: newStatus }).eq('id', ruleId)
  }

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return 'Never'
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  const stockLabel = (status: string) => {
    if (!status) return 'Unknown'
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const stockColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'low_stock': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'out_of_stock': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Side panel — uses its own scroll, body scroll is locked */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed inset-y-0 right-0 w-full md:w-[78vw] lg:w-[58vw] max-w-3xl z-50 flex flex-col"
        style={{ background: '#0d0d0d', borderLeft: '1px solid #1a1a1a' }}
      >
        {/* Sticky header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0d0d0d]/95 backdrop-blur sticky top-0 z-10">
          <h2 className="text-xl font-bold">Watch Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content — this div scrolls, not the page */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-6 space-y-8">
            {loading ? (
              <div className="space-y-6">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : watch ? (
              <>
                {/* Watch header */}
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="h-28 w-28 shrink-0 bg-white rounded-xl p-2 border border-border flex items-center justify-center">
                    {watch.image_url ? (
                      <img src={watch.image_url} className="h-full w-full object-contain" alt={watch.model_name} />
                    ) : (
                      <span className="text-3xl">⌚</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                        {watch.retailer}
                      </span>
                      {watch.brand && (
                        <span className="text-sm text-text-muted">{watch.brand}</span>
                      )}
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${stockColor(watch.stock_status)}`}>
                        {stockLabel(watch.stock_status)}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold leading-snug">{watch.model_name}</h1>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-mono font-bold text-primary">
                        ₹{watch.current_price?.toLocaleString('en-IN')}
                      </span>
                      {watch.original_price && watch.original_price > watch.current_price && (
                        <>
                          <span className="text-base text-text-muted line-through">
                            ₹{watch.original_price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-emerald-400 font-bold">
                            {Math.round((1 - watch.current_price / watch.original_price) * 100)}% off
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price History Chart — given explicit height so it renders correctly */}
                <div className="rounded-xl border border-[#1a1a1a] bg-black p-5">
                  <div style={{ height: 280, width: '100%' }}>
                    <PriceHistoryChart
                      watchId={watchId}
                      targetPrice={rules.find(r => r.rule_type === 'price_drop')?.target_price}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Alert Rules */}
                  <div className="card p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-primary" /> Alert Rules
                    </h3>
                    {rules.length === 0 ? (
                      <p className="text-sm text-text-muted">No rules configured.</p>
                    ) : (
                      <div className="space-y-3">
                        {rules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-black">
                            <div>
                              <p className="font-bold text-sm capitalize">{rule.rule_type.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-text-muted">
                                {rule.rule_type === 'price_drop' && rule.target_price
                                  ? `Target: ₹${rule.target_price.toLocaleString('en-IN')}`
                                  : rule.rule_type === 'price_drop'
                                  ? `Min Drop: ${rule.min_drop_pct}%`
                                  : rule.rule_type === 'restock'
                                  ? 'When back in stock'
                                  : 'Any price/stock change'}
                              </p>
                            </div>
                            <button
                              className={`w-11 h-6 rounded-full p-1 transition-colors ${rule.active ? 'bg-primary' : 'bg-surface border border-border'}`}
                              onClick={() => handleRuleToggle(rule.id, rule.active)}
                              aria-label={rule.active ? 'Disable rule' : 'Enable rule'}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tracking Health */}
                  <div className="card p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-blue-400" /> Tracking Health
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center pb-3 border-b border-border/50">
                        <span className="text-text-muted flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Last Scraped
                        </span>
                        <span className="font-medium">{timeAgo(watch.last_scraped_at)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-border/50">
                        <span className="text-text-muted">Tracking Status</span>
                        <span className="flex items-center gap-2 text-emerald-400">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                          </span>
                          Active
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-border/50">
                        <span className="text-text-muted">Currency</span>
                        <span className="font-medium">{watch.currency || 'INR'}</span>
                      </div>
                      <a
                        href={watch.product_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm mt-2"
                      >
                        View on {watch.retailer} <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-text-muted p-12">Watch not found</div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
