import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { Bell, Activity, Tag, Store, Percent, Watch as WatchIcon, Settings, X, Edit2, Trash2, Moon, Mail, MessageSquare, ExternalLink, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AlertRule, Watch, AlertLog } from '@/types/database'

export default function AlertsPage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [rules, setRules] = useState<(AlertRule & { watch: Watch })[]>([])
  const [history, setHistory] = useState<(AlertLog & { watch: Watch, rule: AlertRule })[]>([])
  const [userPrefs, setUserPrefs] = useState<any>({ quiet_hours: false, notification_prefs: { email: true, whatsapp: false, push: false } })
  const [globalDropPct, setGlobalDropPct] = useState(10)

  // Edit Drawer State
  const [editRule, setEditRule] = useState<(AlertRule & { watch: Watch }) | null>(null)
  
  // History Filter
  const [historyFilter, setHistoryFilter] = useState('all') // all, price_drop, restock

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch user prefs
    const { data: profile } = await supabase.from('users').select('*').eq('id', user?.id).single()
    if (profile) setUserPrefs(profile)

    // Fetch Active Watches (we need them to join rules manually if supabase doesn't support nested joins easily, but we can try nested)
    const { data: rulesData } = await supabase
      .from('alert_rules')
      .select(`
        *,
        watch:watches(*)
      `)
      // @ts-ignore - Supabase type inference for nested joins sometimes fails
      .eq('watch.user_id', user?.id)
      .order('created_at', { ascending: false })
      
    // Filter out rules where watch is null (inner join simulation)
    const validRules = (rulesData || []).filter(r => r.watch !== null)
    setRules(validRules as any)

    // Fetch history
    const { data: historyData } = await supabase
      .from('alert_log')
      .select(`
        *,
        watch:watches(*),
        rule:alert_rules(*)
      `)
      // @ts-ignore
      .eq('watch.user_id', user?.id)
      .order('triggered_at', { ascending: false })
      .limit(50)

    const validHistory = (historyData || []).filter(h => h.watch !== null)
    setHistory(validHistory as any)

    setLoading(false)
  }

  const handleUpdatePrefs = async (key: string, value: any) => {
    if (!user) return
    const newPrefs = { ...userPrefs, [key]: value }
    setUserPrefs(newPrefs)
    await supabase.from('users').update({ [key]: value }).eq('id', user.id)
    toast.success('Settings updated')
  }

  const handleUpdateChannels = async (channel: string) => {
    if (!user) return
    const currentChannels = userPrefs.notification_prefs || { email: true, whatsapp: false, push: false }
    const newChannels = { ...currentChannels, [channel]: !currentChannels[channel] }
    const newPrefs = { ...userPrefs, notification_prefs: newChannels }
    setUserPrefs(newPrefs)
    await supabase.from('users').update({ notification_prefs: newChannels }).eq('id', user.id)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return
    await supabase.from('alert_rules').delete().eq('id', id)
    setRules(rules.filter(r => r.id !== id))
    toast.success('Alert deleted')
  }

  const saveEditRule = async () => {
    if (!editRule) return
    await supabase.from('alert_rules').update({
      target_price: editRule.target_price,
      min_drop_pct: editRule.min_drop_pct,
      channels: editRule.channels,
      active: editRule.active
    }).eq('id', editRule.id)
    
    setRules(rules.map(r => r.id === editRule.id ? editRule : r))
    setEditRule(null)
    toast.success('Alert updated')
  }

  const getRuleIcon = (type: string) => {
    switch(type) {
      case 'price_drop': return <Tag className="h-4 w-4 text-green-500" />
      case 'restock': return <Store className="h-4 w-4 text-blue-500" />
      case 'low_stock': return <Percent className="h-4 w-4 text-amber-500" />
      default: return <Activity className="h-4 w-4 text-purple-500" />
    }
  }

  const getRuleLabel = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
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

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Your Alerts</h1>
          <p className="text-text-muted">Manage price and restock alerts for your tracked watches</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full font-bold flex items-center gap-2 w-max">
          <Bell className="h-4 w-4" />
          All Active: {rules.filter(r => r.active).length} alerts
        </div>
      </div>

      {/* Alert Cards Grid */}
      <h2 className="text-xl font-bold mb-4">Active Alert Rules</h2>
      {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {[1, 2, 3].map(i => <div key={i} className="h-48 card animate-pulse bg-surface/50"></div>)}
         </div>
      ) : rules.length === 0 ? (
        <div className="card p-8 text-center text-text-muted mb-12 border-dashed">
          <Bell className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p>You don't have any active alerts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {rules.map(rule => {
            const lastLog = history.find(h => h.rule_id === rule.id);
            const triggeredToday = lastLog && new Date(lastLog.triggered_at).toDateString() === new Date().toDateString();

            return (
              <div key={rule.id} className={`card p-5 flex flex-col ${!rule.active ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-14 w-14 rounded-lg bg-black shrink-0 flex items-center justify-center p-1 border border-border">
                    {rule.watch?.image_url ? (
                      <img src={rule.watch.image_url} alt="watch" className="h-full w-full object-contain" />
                    ) : <WatchIcon className="h-6 w-6 text-text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] uppercase font-bold text-primary border border-primary/30 px-2 py-0.5 rounded-full mb-1 inline-block">
                        {rule.watch?.retailer}
                      </span>
                      <div className="flex items-center gap-1">
                        {rule.channels.includes('email') && <Mail className="h-3 w-3 text-text-muted" />}
                        {rule.channels.includes('whatsapp') && <MessageSquare className="h-3 w-3 text-text-muted" />}
                      </div>
                    </div>
                    <h3 className="font-bold text-sm truncate" title={rule.watch?.model_name || ''}>
                      {rule.watch?.model_name}
                    </h3>
                  </div>
                </div>

                <div className="bg-black/50 p-3 rounded-lg border border-border/50 flex-1 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getRuleIcon(rule.rule_type)}
                    <span className="font-bold text-sm">{getRuleLabel(rule.rule_type)}</span>
                  </div>
                  {rule.rule_type === 'price_drop' && (
                    <p className="text-xs text-text-muted">
                      Target: {rule.target_price ? `≤ ₹${rule.target_price.toLocaleString()}` : `Drop ≥ ${rule.min_drop_pct}%`}
                    </p>
                  )}
                  {rule.rule_type === 'restock' && (
                    <p className="text-xs text-text-muted">Notify when back in stock</p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="text-xs font-medium">
                    {triggeredToday ? (
                      <span className="text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Triggered Today</span>
                    ) : (
                      <span className="text-text-muted flex items-center gap-1">
                        {rule.active && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                        {rule.active ? 'Watching...' : 'Paused'}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditRule(rule)}
                      className="p-1.5 hover:bg-surface rounded border border-transparent hover:border-border transition-colors text-text-muted hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 hover:bg-red-950 rounded border border-transparent hover:border-red-900 transition-colors text-text-muted hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History Table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Recent History</h2>
        <select 
          className="bg-surface border border-border rounded-lg text-sm px-3 py-1.5 focus:outline-none"
          value={historyFilter}
          onChange={e => setHistoryFilter(e.target.value)}
        >
          <option value="all">All Alerts</option>
          <option value="price_drop">Price Drops</option>
          <option value="restock">Restocks</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted bg-black/40">
              <th className="p-4 font-medium">Watch</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Change</th>
              <th className="p-4 font-medium">Time</th>
              <th className="p-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {history.filter(h => historyFilter === 'all' || h.rule?.rule_type === historyFilter).map(log => {
              const saving = log.old_value && log.new_value && log.old_value > log.new_value 
                ? log.old_value - log.new_value 
                : 0;
              
              return (
                <tr key={log.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-black rounded p-1"><img src={log.watch?.image_url || ''} className="h-full w-full object-contain" /></div>
                      <span className="font-bold truncate max-w-[150px] md:max-w-[200px]" title={log.watch?.model_name || ''}>{log.watch?.model_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 bg-surface px-2 py-1 rounded text-xs font-bold border border-border">
                      {getRuleIcon(log.rule?.rule_type || 'any_change')} {getRuleLabel(log.rule?.rule_type || 'Unknown')}
                    </span>
                  </td>
                  <td className="p-4">
                    {saving > 0 ? (
                      <div>
                        <span className="text-primary font-bold">₹{log.new_value?.toLocaleString()}</span>
                        <span className="text-text-muted text-xs ml-2 line-through">₹{log.old_value?.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="p-4 text-text-muted text-xs">{timeAgo(log.triggered_at)}</td>
                  <td className="p-4 text-right">
                    <a 
                      href={log.watch?.product_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-white font-bold text-xs"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              )
            })}
            {history.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-text-muted">No alerts triggered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Drawer (Slide-in) */}
      {editRule && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setEditRule(null)}></div>
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#111111] border-l border-[#1F1F1F] z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold">Edit Alert</h2>
              <button onClick={() => setEditRule(null)} className="p-2 hover:bg-surface rounded-full transition-colors"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="flex items-center gap-3 mb-6 p-4 bg-black rounded-xl border border-border">
                <div className="h-12 w-12 bg-surface rounded"><img src={editRule.watch.image_url || ''} className="h-full w-full object-contain" /></div>
                <div className="flex-1 truncate">
                  <p className="text-xs text-primary font-bold">{editRule.watch.retailer}</p>
                  <p className="font-bold truncate text-sm">{editRule.watch.model_name}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Status</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditRule({...editRule, active: true})}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${editRule.active ? 'bg-primary text-black border-primary' : 'bg-transparent border-border'}`}
                  >Active</button>
                  <button 
                    onClick={() => setEditRule({...editRule, active: false})}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${!editRule.active ? 'bg-surface text-white border-border' : 'bg-transparent border-border'}`}
                  >Paused</button>
                </div>
              </div>

              {editRule.rule_type === 'price_drop' && (
                <div>
                  <label className="block text-sm font-bold mb-2">Target Price (₹)</label>
                  <input 
                    type="number" 
                    value={editRule.target_price || ''}
                    onChange={e => setEditRule({...editRule, target_price: e.target.value ? parseFloat(e.target.value) : null})}
                    className="input-field w-full"
                    placeholder="Enter target price"
                  />
                  
                  <div className="my-4 text-center text-text-muted text-xs">OR</div>

                  <label className="block text-sm font-bold mb-2">Minimum Drop %</label>
                  <input 
                    type="range" 
                    min="1" max="50" 
                    value={editRule.min_drop_pct || 10}
                    onChange={e => setEditRule({...editRule, min_drop_pct: parseInt(e.target.value)})}
                    className="w-full accent-primary"
                  />
                  <div className="text-right text-xs mt-1 text-text-muted">{editRule.min_drop_pct}%</div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">Channels</label>
                <div className="flex flex-col gap-2">
                  {['email', 'whatsapp', 'push'].map(ch => (
                    <label key={ch} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editRule.channels.includes(ch)}
                        onChange={(e) => {
                          const newCh = e.target.checked 
                            ? [...editRule.channels, ch]
                            : editRule.channels.filter(c => c !== ch)
                          setEditRule({...editRule, channels: newCh})
                        }}
                        className="accent-primary h-4 w-4"
                      />
                      <span className="capitalize font-medium">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-border bg-black">
              <button onClick={saveEditRule} className="btn-primary w-full py-3">Save Changes</button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
