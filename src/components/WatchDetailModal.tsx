import { useEffect, useState } from 'react'
import { X, ExternalLink, Activity, Clock, Tag } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { PriceHistoryChart } from './PriceHistoryChart'
import { Skeleton } from './Skeleton'

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
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
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
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-full md:w-[80vw] lg:w-[60vw] max-w-4xl bg-[#111111] border-l border-[#1F1F1F] z-50 shadow-2xl flex flex-col overflow-y-auto">
        
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-[#111111]/90 backdrop-blur z-10">
          <h2 className="text-xl font-bold">Watch Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : watch ? (
            <>
              {/* Header Info */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="h-32 w-32 bg-white rounded-xl p-2 shrink-0 border border-border flex items-center justify-center">
                  <img src={watch.image_url || ''} className="h-full w-full object-contain" alt="" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                      {watch.retailer}
                    </span>
                    <span className="text-sm text-text-muted">{watch.brand}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${watch.stock_status === 'in_stock' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                      {watch.stock_status.replace('_', ' ')}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold mb-4">{watch.model_name}</h1>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-primary">₹{watch.current_price?.toLocaleString()}</span>
                    {watch.original_price && watch.original_price > watch.current_price && (
                      <span className="text-lg text-text-muted line-through">₹{watch.original_price.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="card p-6 bg-black">
                <PriceHistoryChart 
                  watchId={watchId} 
                  targetPrice={rules.find(r => r.rule_type === 'price_drop')?.target_price}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rules */}
                <div className="card p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Active Rules</h3>
                  {rules.length === 0 ? (
                    <p className="text-sm text-text-muted">No rules configured.</p>
                  ) : (
                    <div className="space-y-3">
                      {rules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-black">
                          <div>
                            <p className="font-bold text-sm capitalize">{rule.rule_type.replace('_', ' ')}</p>
                            <p className="text-xs text-text-muted">
                              {rule.rule_type === 'price_drop' && rule.target_price ? `Target: ₹${rule.target_price.toLocaleString()}` : ''}
                              {rule.rule_type === 'price_drop' && !rule.target_price ? `Min Drop: ${rule.min_drop_pct}%` : ''}
                              {rule.rule_type === 'restock' ? 'When available' : ''}
                            </p>
                          </div>
                          <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${rule.active ? 'bg-primary' : 'bg-surface border border-border'}`}
                            onClick={() => handleRuleToggle(rule.id, rule.active)}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Scrape Health */}
                <div className="card p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-blue-400" /> Scraping Health</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-text-muted flex items-center gap-2"><Clock className="h-4 w-4" /> Last Scraped</span>
                      <span className="font-medium">{timeAgo(watch.last_scraped_at)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-text-muted">Status</span>
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>
                        Healthy
                      </span>
                    </div>
                    <div className="pt-2">
                      <a 
                        href={watch.product_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn-primary w-full py-2 flex items-center justify-center gap-2"
                      >
                        Open on {watch.retailer} <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-text-muted p-12">Watch not found</div>
          )}
        </div>

      </div>
    </>
  )
}
