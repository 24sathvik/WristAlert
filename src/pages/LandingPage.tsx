import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LineChart, Smartphone, Store, ArrowRight } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import { useAuthStore } from '@/store/useAuthStore'

export default function LandingPage() {
  const { user, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard')
    }
  }, [user, isLoading, navigate])
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium tracking-wide">Live tracking across 50+ stores</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 max-w-4xl mx-auto leading-tight">
            Never Miss a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Watch Deal</span> Again
          </h1>
          
          <p className="text-xl text-text-muted mb-10 max-w-2xl mx-auto">
            Get instant WhatsApp and email alerts the moment your dream watch drops in price or comes back in stock.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group animated-border">
              Start Tracking Free
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-sm text-text-muted">No credit card required</p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-black/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card p-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                  <LineChart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Auto Price Tracking</h3>
                <p className="text-text-muted">
                  We monitor prices 24/7 across multiple retailers. Set a target price and we'll notify you the second it drops.
                </p>
              </div>
              
              <div className="card p-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                  <Smartphone className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">WhatsApp Alerts</h3>
                <p className="text-text-muted">
                  Don't let emails get lost in spam. Get lightning-fast notifications straight to your WhatsApp.
                </p>
              </div>
              
              <div className="card p-8">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                  <Store className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Indian Stores</h3>
                <p className="text-text-muted">
                  Built specifically for the Indian market, supporting local authorized dealers and major e-commerce platforms.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </PageTransition>
  )
}
