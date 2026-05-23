import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { supabase } from '@/lib/supabaseClient'
import { Skeleton } from './Skeleton'

interface Props {
  watchId: string
  watchName?: string
  targetPrice?: number | null
  mini?: boolean
}

export function PriceHistoryChart({ watchId, watchName, targetPrice, mini = false }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | 'ALL'>('30D')

  useEffect(() => {
    fetchData()
  }, [watchId, timeRange])

  const fetchData = async () => {
    setLoading(true)
    
    let query = supabase.from('price_snapshots').select('*').eq('watch_id', watchId).order('scraped_at', { ascending: true })
    
    if (timeRange !== 'ALL') {
      const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 90
      const date = new Date()
      date.setDate(date.getDate() - days)
      query = query.gte('scraped_at', date.toISOString())
    }

    const { data: snapshots } = await query

    if (snapshots) {
      // Format data for Recharts
      const formatted = snapshots.map(s => {
        const date = new Date(s.scraped_at)
        return {
          ...s,
          formattedDate: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          fullDate: date.toLocaleString(),
          price: Number(s.price)
        }
      })
      setData(formatted)
    }
    setLoading(false)
  }

  const minPrice = data.length > 0 ? Math.min(...data.map(d => d.price)) : 0
  const maxPrice = data.length > 0 ? Math.max(...data.map(d => d.price)) : 0
  const lowestPrice = minPrice
  
  // Calculate whether labels will overlap (within 5% of chart's price range)
  const priceRange = maxPrice - lowestPrice;
  const overlapThreshold = priceRange * 0.05; // 5% of range
  const labelsWillOverlap = targetPrice && lowestPrice
    && Math.abs(targetPrice - lowestPrice) < overlapThreshold;

  const yDomain = [
    (dataMin: number) => Math.floor(Math.min(dataMin, lowestPrice || dataMin, targetPrice || dataMin) * 0.95),
    (dataMax: number) => Math.ceil(dataMax * 1.05)
  ]

  if (loading) {
    return <Skeleton className={`w-full ${mini ? 'h-16' : 'h-64'}`} />
  }

  if (data.length === 0) {
    return (
      <div className={`w-full flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-lg ${mini ? 'h-16' : 'h-64'}`}>
        No history available
      </div>
    )
  }

  if (mini) {
    return (
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="price" stroke="#00FF7F" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111111] border border-[#00FF7F] p-3 rounded-lg shadow-xl">
          <p className="text-text-muted text-xs mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-primary font-bold text-lg">₹{payload[0].value.toLocaleString()}</p>
          {payload[0].payload.stock_status !== 'in_stock' && (
            <p className="text-amber-500 text-xs mt-1">{payload[0].payload.stock_status.replace('_', ' ')}</p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{watchName ? `${watchName} History` : 'Price History'}</h3>
        <div className="flex bg-surface rounded-lg p-1">
          {['7D', '30D', '90D', 'ALL'].map(t => (
            <button
              key={t}
              onClick={() => setTimeRange(t as any)}
              className={`text-xs px-3 py-1 rounded-md font-bold transition-colors ${timeRange === t ? 'bg-[#1F1F1F] text-primary shadow-sm' : 'text-text-muted hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF7F" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00FF7F" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
            <XAxis dataKey="formattedDate" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} domain={yDomain as any} width={60} />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine 
              y={lowestPrice} 
              stroke="#00ff7f" 
              strokeDasharray="4 4" 
              strokeWidth={1.5}
              label={{ 
                value: `Lowest ₹${lowestPrice.toLocaleString('en-IN')}`, 
                position: labelsWillOverlap ? 'insideBottomLeft' : 'insideTopLeft', 
                fill: '#00ff7f', 
                fontSize: 11,
                fontWeight: 600,
                dy: labelsWillOverlap ? 16 : -6
              }} 
            />
            
            {targetPrice && (
              <ReferenceLine 
                y={targetPrice} 
                stroke="#f59e0b" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: `Target ₹${targetPrice.toLocaleString('en-IN')}`, 
                  position: 'insideTopRight', 
                  fill: '#f59e0b', 
                  fontSize: 11,
                  fontWeight: 600,
                  dy: labelsWillOverlap ? -6 : -6
                }} 
              />
            )}
            
            <Area type="monotone" dataKey="price" stroke="#00FF7F" strokeWidth={2} fillOpacity={1} fill="url(#greenGradient)" activeDot={{ r: 6, fill: '#00FF7F', stroke: '#000', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend below the chart */}
      <div className="flex items-center gap-6 mt-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-px border-t-2 border-dashed border-[#00ff7f]" />
          <span className="text-xs text-[#666]">Lowest: ₹{lowestPrice?.toLocaleString('en-IN')}</span>
        </div>
        {targetPrice && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-px border-t-2 border-dashed border-amber-400" />
            <span className="text-xs text-[#666]">Your target: ₹{targetPrice?.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
