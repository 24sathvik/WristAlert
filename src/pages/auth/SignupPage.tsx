import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Watch } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created! Please check your email to verify.')
      navigate('/onboarding')
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <Watch className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-2xl font-bold text-center">Create an Account</h2>
          <p className="text-text-muted mt-2 text-center text-sm">Start tracking watch prices today.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="input-field w-full" 
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="input-field w-full" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirmPassword">Confirm Password</label>
            <input 
              id="confirmPassword"
              type="password" 
              className="input-field w-full" 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-primary w-full py-3 mt-4"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-text-muted">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
