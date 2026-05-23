import { Link } from 'react-router-dom'
import { Watch, Bell, User as UserIcon, Settings, LogOut, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useEffect } from 'react'

function LiveTicker() {
  const [, setSeconds] = useState(new Date().getSeconds());
  useEffect(() => {
    const id = setInterval(() => setSeconds(new Date().getSeconds()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-xs text-[#444] mr-4 hidden md:flex">
      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <span className="font-mono">LIVE</span>
    </div>
  );
}

export default function Navbar() {
  const { user, signOut } = useAuthStore()
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Watch className="h-8 w-8 text-primary" />
              <span className="text-white font-display font-bold text-2xl tracking-tight">The Watch Pulse</span>
            </Link>
          </div>
          
          {user ? (
            <>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <Link to="/dashboard" className="text-text-primary hover:text-primary px-3 py-2 rounded-md font-medium transition-colors">Dashboard</Link>
                  <Link to="/track" className="text-text-primary hover:text-primary px-3 py-2 rounded-md font-medium transition-colors">Track</Link>
                  <Link to="/alerts" className="text-text-primary hover:text-primary px-3 py-2 rounded-md font-medium transition-colors">Alerts</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <LiveTicker />
                <button className="text-text-muted hover:text-primary transition-colors">
                  <Bell className="h-6 w-6" />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 focus:outline-none"
                  >
                    <div className="h-8 w-8 rounded-full bg-surface border border-primary/50 flex items-center justify-center text-primary font-display font-bold">
                      {user.email?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
                    </div>
                  </button>
                  
                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-glow bg-surface border border-border py-1 overflow-hidden">
                      <div className="px-4 py-3 text-sm text-text-muted border-b border-border truncate">
                        {user.email}
                      </div>
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-3 text-sm text-text-primary hover:bg-black hover:text-primary transition-colors">
                        <UserCircle className="h-4 w-4" /> My Profile
                      </Link>
                      <Link to="/settings" className="flex items-center gap-2 px-4 py-3 text-sm text-text-primary hover:bg-black hover:text-primary transition-colors">
                        <Settings className="h-4 w-4" /> App Settings
                      </Link>
                      <button 
                        onClick={() => {
                          signOut()
                          setShowDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-black transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-text-primary hover:text-primary font-medium transition-colors">Log in</Link>
              <Link to="/signup" className="btn-primary">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
