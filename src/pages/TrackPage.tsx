import { useState, useEffect } from 'react'
import { Search, Watch, Activity, Percent, Store, Check, Bell, MessageSquare, Plus } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function TrackPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [productData, setProductData] = useState<any>(null)
  
  // Form state
  const [brand, setBrand] = useState('')
  const [modelName, setModelName] = useState('')
  const [targetPrice, setTargetPrice] = useState<string>('')
  const [alertTypes, setAlertTypes] = useState<string[]>(['price_drop'])
  const [channels, setChannels] = useState<string[]>(['email'])
  const [saving, setSaving] = useState(false)
  const [scrapeError, setScrapeError] = useState(false)

  const loadingMessages = [
    "Connecting to retailer...",
    "Extracting product data...",
    "Fetching live price..."
  ]

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % loadingMessages.length)
      }, 1200)
      return () => clearInterval(interval)
    }
  }, [loading])

  const handleFetch = async () => {
    if (!url) return
    setLoading(true)
    setLoadingStep(0)
    setProductData(null)
    setScrapeError(false)

    try {
      const res = await axios.post('/api/scrape-product', { url })
      if (res.data.success) {
        setProductData(res.data.data)
        setBrand(res.data.data.brand || '')
        setModelName(res.data.data.name || '')
      }
    } catch (err: any) {
      console.warn('Scraping failed:', err.response?.data?.error)
      setScrapeError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleStartTracking = async () => {
    if (!productData) return
    if (!modelName.trim()) { toast.error('Please enter a watch name'); return }
    setSaving(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('Please log in first'); return }
      
      const priceToSave = productData?.price || 0
      
      const result = await axios.post('/api/watches', {
        product_url: url,
        retailer: productData?.retailer || 'other',
        brand: brand || productData?.brand || null,
        model_name: modelName,
        image_url: productData?.imageUrl || null,
        current_price: priceToSave,
        stock_status: productData?.stockStatus || 'unknown',
        target_price: targetPrice ? parseFloat(targetPrice) : null,
        rule_types: alertTypes,
        channels
      }, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })

      if (result.data.success) {
        toast.success('Watch tracking started successfully!')
        navigate('/dashboard')
      } else {
        throw new Error(result.data.error)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save watch')
    } finally {
      setSaving(false)
    }
  }

  const toggleAlertType = (type: string) => {
    if (alertTypes.includes(type)) {
      setAlertTypes(alertTypes.filter(t => t !== type))
    } else {
      setAlertTypes([...alertTypes, type])
    }
  }

  const toggleChannel = (channel: string) => {
    if (channels.includes(channel)) {
      if (channels.length === 1) return toast.error('At least one notification channel is required')
      setChannels(channels.filter(c => c !== channel))
    } else {
      setChannels([...channels, channel])
    }
  }

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'in_stock': return { label: 'In Stock', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' }
      case 'low_stock': return { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' }
      case 'out_of_stock': return { label: 'Out of Stock', color: 'bg-red-500/10 text-red-400 border border-red-500/20' }
      default: return { label: 'Unknown Stock', color: 'bg-[#333] text-text-muted border border-[#444]' }
    }
  }

  return (
    <PageTransition>
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <h1 className="text-3xl font-display font-bold">Track a Watch</h1>
        
        {/* Step 1: URL Input */}
        <div className="card p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-4 mb-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-text-muted" />
              </div>
              <input
                type="url"
                className="input-field w-full pl-12 py-4 text-lg"
                placeholder="Paste product URL here..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                disabled={loading}
              />
            </div>
            <button 
              onClick={handleFetch} 
              disabled={!url || loading}
              className="btn-primary py-4 px-8 text-lg whitespace-nowrap disabled:opacity-50 flex items-center justify-center min-w-[160px]"
            >
              {loading ? <Activity className="h-6 w-6 animate-spin" /> : 'Fetch Details'}
            </button>
          </div>
        </div>

        {scrapeError && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-white font-semibold mb-2">Couldn't fetch this product</h3>
            <p className="text-[#666] text-sm mb-4">
              This URL might be unsupported or temporarily blocked. Try a direct product page URL.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => {setScrapeError(false); handleFetch()}} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition">
                Try Again
              </button>
              <button onClick={() => { setUrl(''); setScrapeError(false); }} className="px-4 py-2 border border-border text-text-muted rounded-lg hover:bg-[#111] transition">
                Use Different URL
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-4">
            <div className="h-2 w-full bg-black rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-in-out" 
                style={{ width: `${((loadingStep + 1) / 3) * 100}%` }}
              ></div>
            </div>
            <p className="text-center text-primary font-medium transition-all duration-300">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        )}

        {/* Product Scraped Result & Config */}
        {productData && !loading && !scrapeError && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
            
            <div className="card p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStockLabel(productData.stockStatus).color}`}>
                  {getStockLabel(productData.stockStatus).label}
                </span>
              </div>
              
              <div className="w-full md:w-48 h-48 bg-black rounded-xl border border-border flex items-center justify-center p-4 shrink-0">
                {productData.imageUrl ? (
                  <img src={productData.imageUrl} alt="Watch" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Watch className="h-16 w-16 text-border" />
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-sm text-text-muted font-medium mb-2">
                  <Store className="h-4 w-4" /> {productData.retailer}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Brand</label>
                    <input type="text" value={brand} onChange={e => setBrand(e.target.value)} className="input-field w-full py-2" placeholder="e.g. Titan" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Model Name *</label>
                    <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} className="input-field w-full py-2" placeholder="e.g. Neo Splash Blue" />
                  </div>
                </div>

                <div className="p-4 bg-[#111] rounded-xl border border-border/50 inline-block">
                  <div className="text-sm text-text-muted mb-1">Current Price</div>
                  <div className="text-3xl font-mono font-bold text-white">
                    {productData.price ? `₹${productData.price.toLocaleString('en-IN')}` : 'Not found'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6 md:p-8">
              <div className="flex items-start gap-4 mb-8">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Configure Alert</h2>
                  <p className="text-text-muted mt-1">Set your conditions and how you want to be notified.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pl-0 md:pl-14">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                      <Percent className="h-4 w-4" /> Trigger Condition
                    </h3>
                    <div className="space-y-3">
                      <div 
                        onClick={() => toggleAlertType('price_drop')}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${alertTypes.includes('price_drop') ? 'bg-primary/5 border-primary text-white' : 'bg-black border-border text-text-muted hover:border-text-muted'}`}
                      >
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border ${alertTypes.includes('price_drop') ? 'bg-primary border-primary' : 'border-text-muted'}`}>
                          {alertTypes.includes('price_drop') && <Check className="h-3 w-3 text-black font-bold" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${alertTypes.includes('price_drop') ? 'text-white' : ''}`}>Target Price Drop</p>
                        </div>
                      </div>
                      
                      {alertTypes.includes('price_drop') && (
                        <div className="ml-10 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">₹</span>
                          <input 
                            type="number" 
                            placeholder="Enter target price..."
                            className="input-field w-full pl-8"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                          />
                        </div>
                      )}

                      <div 
                        onClick={() => toggleAlertType('restock')}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${alertTypes.includes('restock') ? 'bg-primary/5 border-primary text-white' : 'bg-black border-border text-text-muted hover:border-text-muted'}`}
                      >
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border ${alertTypes.includes('restock') ? 'bg-primary border-primary' : 'border-text-muted'}`}>
                          {alertTypes.includes('restock') && <Check className="h-3 w-3 text-black font-bold" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${alertTypes.includes('restock') ? 'text-white' : ''}`}>Back in Stock</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Notification Channels
                    </h3>
                    <div className="space-y-3">
                      <div 
                        onClick={() => toggleChannel('email')}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${channels.includes('email') ? 'bg-primary/5 border-primary text-white' : 'bg-black border-border text-text-muted hover:border-text-muted'}`}
                      >
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border ${channels.includes('email') ? 'bg-primary border-primary' : 'border-text-muted'}`}>
                          {channels.includes('email') && <Check className="h-3 w-3 text-black font-bold" />}
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <Bell className="h-5 w-5" />
                          <p className={`font-medium ${channels.includes('email') ? 'text-white' : ''}`}>Email</p>
                        </div>
                      </div>

                      <div 
                        onClick={() => toggleChannel('whatsapp')}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-colors ${channels.includes('whatsapp') ? 'bg-emerald-500/10 border-emerald-500 text-white' : 'bg-black border-border text-text-muted hover:border-text-muted'}`}
                      >
                        <div className={`h-5 w-5 rounded-md flex items-center justify-center border ${channels.includes('whatsapp') ? 'bg-emerald-500 border-emerald-500' : 'border-text-muted'}`}>
                          {channels.includes('whatsapp') && <Check className="h-3 w-3 text-black font-bold" />}
                        </div>
                        <div className="flex-1 flex items-center gap-3">
                          <MessageSquare className="h-5 w-5" />
                          <p className={`font-medium ${channels.includes('whatsapp') ? 'text-white' : ''}`}>WhatsApp</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-border flex justify-end pl-0 md:pl-14">
                <button 
                  onClick={handleStartTracking}
                  disabled={saving || !modelName.trim()}
                  className="btn-primary py-4 px-8 text-lg w-full md:w-auto flex items-center justify-center gap-2"
                >
                  {saving ? <Activity className="h-5 w-5 animate-spin" /> : <><Plus className="h-5 w-5" /> Start Tracking</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
