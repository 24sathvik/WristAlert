import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, MessageSquare, Watch } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [watchUrl, setWatchUrl] = useState('')
  const navigate = useNavigate()

  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handleFinish = () => {
    toast.success("You're all set!")
    navigate('/dashboard')
  }

  const renderStep1 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold mb-2">Welcome to WristAlert</h2>
      <p className="text-text-muted mb-8">Let's get your profile set up.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">What should we call you?</label>
          <input 
            type="text" 
            className="input-field w-full text-lg py-4" 
            placeholder="e.g. James Bond"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
        </div>
        <button 
          onClick={handleNext}
          disabled={!displayName.trim()}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">WhatsApp Alerts</h2>
      </div>
      <p className="text-text-muted mb-8">Get instant notifications when prices drop.</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Add your WhatsApp number</label>
          <div className="flex">
            <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-border bg-black text-text-muted">
              +91
            </span>
            <input 
              type="tel" 
              className="input-field w-full rounded-l-none text-lg py-4" 
              placeholder="98765 43210"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => {
              if(!whatsapp) return
              toast.success("Test message sent!")
              handleNext()
            }}
            className="btn-primary flex-1 py-4 text-lg"
          >
            Send Test Message
          </button>
          <button 
            onClick={handleNext}
            className="px-6 py-4 rounded-xl font-medium text-text-muted hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <Watch className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Track Your First Watch</h2>
      </div>
      <p className="text-text-muted mb-8">Paste a link from Amazon, Flipkart, HMT, or Titan.</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Product URL</label>
          <input 
            type="url" 
            className="input-field w-full text-lg py-4" 
            placeholder="https://amazon.in/..."
            value={watchUrl}
            onChange={(e) => setWatchUrl(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => {
              if(watchUrl) toast.success("Tracking started!")
              handleFinish()
            }}
            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" /> Start Tracking
          </button>
          <button 
            onClick={handleFinish}
            className="px-6 py-4 rounded-xl font-medium text-text-muted hover:text-white transition-colors"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`text-sm font-medium transition-colors duration-300 ${
                  step >= i ? 'text-primary' : 'text-text-muted'
                }`}
              >
                Step {i}
              </div>
            ))}
          </div>
          <div className="h-2 w-full bg-surface rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="card p-8 sm:p-12 min-h-[400px] flex flex-col justify-center">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  )
}
