import { useState, useEffect } from 'react'
import { User, ShieldAlert, Download, Mail, CheckCircle2, Bell } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import toast from 'react-hot-toast'
import PageTransition from '@/components/PageTransition'

export default function UserProfile() {
  const { user } = useAuthStore()
  const [displayName, setDisplayName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [stats, setStats] = useState({ watches: 0, alerts: 0 })
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchStats()
    }
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase.from('users').select('*').eq('id', user?.id).single()
    if (data) {
      setDisplayName(data.raw_user_meta_data?.full_name || user?.email?.split('@')[0] || '')
      setWhatsapp(data.whatsapp_number || '')
    }
  }

  const fetchStats = async () => {
    const { count: wCount } = await supabase.from('watches').select('*', { count: 'exact', head: true }).eq('user_id', user?.id)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: aCount } = await supabase.from('alert_log')
      .select('*', { count: 'exact', head: true })
      .gte('triggered_at', thirtyDaysAgo)
    setStats({ watches: wCount || 0, alerts: aCount || 0 })
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await supabase.from('users').update({ whatsapp_number: whatsapp }).eq('id', user?.id)
      await supabase.auth.updateUser({ data: { full_name: displayName } })
      toast.success('Profile saved!')
    } catch (e) {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  const exportData = async () => {
    try {
      const { data: watches } = await supabase.from('watches').select('*, alert_rules(*), price_snapshots(*)').eq('user_id', user?.id)
      const blob = new Blob([JSON.stringify(watches, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thewatchpulse_export_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported successfully')
    } catch (e) {
      toast.error('Export failed')
    }
  }

  return (
    <PageTransition>
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-8">
        
        {/* PROFILE HEADER */}
        <div className="flex flex-col md:flex-row items-center gap-6 p-8 card bg-gradient-to-br from-[#111] to-black border-[#222]">
          <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-black text-4xl font-display font-bold shadow-glow">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-display font-bold mb-1">{displayName}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2 text-text-muted text-sm mb-3">
              <Mail className="h-4 w-4" /> {user?.email}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              {stats.watches > 0 && <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md border border-primary/20">Active Member</span>}
              <span className="text-xs text-text-muted">Joined {new Date(user?.created_at || '').toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            {/* PERSONAL INFO */}
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field w-full bg-black" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">Email</label>
                  <input type="email" disabled value={user?.email || ''} className="input-field w-full opacity-50 bg-black cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1">WhatsApp (+91)</label>
                  <input type="text" placeholder="9876543210" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="input-field w-full bg-black" />
                </div>
                <button onClick={saveProfile} disabled={saving} className="w-full btn-primary py-3 mt-2">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            {/* DANGER ZONE */}
            <div className="card p-6 border-red-500/30 bg-red-500/5">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-500"><ShieldAlert className="h-5 w-5" /> Danger Zone</h3>
              <div className="space-y-4">
                <button onClick={exportData} className="w-full btn-outline border-border hover:bg-[#111] py-3 flex items-center justify-center gap-2 text-sm">
                  <Download className="h-4 w-4" /> Export My Data (JSON)
                </button>
                <div className="p-4 bg-black rounded-xl border border-red-500/20">
                  <p className="text-xs text-text-muted mb-3">To delete your account, type "DELETE MY ACCOUNT" below.</p>
                  <input 
                    type="text" 
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="w-full bg-[#111] border border-border rounded-lg px-4 py-2 text-white mb-3 text-sm focus:border-red-500 focus:outline-none" 
                  />
                  <button 
                    disabled={deleteConfirm !== 'DELETE MY ACCOUNT'}
                    className="w-full bg-red-600/20 text-red-500 border border-red-500/50 font-bold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 hover:text-white transition"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* NOTIFICATION CHANNELS */}
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Channels</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">Email</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-primary font-bold"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                </div>
                <div className={`p-4 rounded-xl border flex items-center justify-between ${whatsapp ? 'border-primary/20 bg-primary/5' : 'border-border bg-black'}`}>
                  <div>
                    <p className="font-bold text-sm">WhatsApp</p>
                    <p className="text-xs text-text-muted">{whatsapp ? `+91 ${whatsapp}` : 'Not set up'}</p>
                  </div>
                  {whatsapp ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-bold"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                  ) : (
                    <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded">Setup required</span>
                  )}
                </div>
              </div>
            </div>

            {/* ACCOUNT STATS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-6 text-center">
                <p className="text-4xl font-mono font-bold text-primary mb-1">{stats.watches}</p>
                <p className="text-xs text-text-muted font-bold uppercase tracking-widest">Watches</p>
              </div>
              <div className="card p-6 text-center">
                <p className="text-4xl font-mono font-bold text-primary mb-1">{stats.alerts}</p>
                <p className="text-xs text-text-muted font-bold uppercase tracking-widest">Alerts (30d)</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  )
}
