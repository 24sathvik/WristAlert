import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import Navbar from '@/components/layout/Navbar'
import React, { Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Skeleton } from '@/components/Skeleton'
import { AnimatePresence } from 'framer-motion'
import WatchTickBackground from '@/components/WatchTickBackground'

// Lazy loaded pages for performance
const LandingPage = React.lazy(() => import('@/pages/LandingPage'))
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const SignupPage = React.lazy(() => import('@/pages/auth/SignupPage'))
const OnboardingPage = React.lazy(() => import('@/pages/auth/OnboardingPage'))
const DashboardPage = React.lazy(() => import('@/pages/DashboardPage'))
const TrackPage = React.lazy(() => import('@/pages/TrackPage'))
const AlertsPage = React.lazy(() => import('@/pages/AlertsPage'))
const UserProfilePage = React.lazy(() => import('@/pages/UserProfile'))
const AppSettingsPage = React.lazy(() => import('@/pages/AppSettings'))
const NotFoundPage = React.lazy(() => import('@/pages/NotFoundPage'))

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore()
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-text-primary flex flex-col relative">
        <WatchTickBackground />
        <Navbar />
        <main className="flex-1 overflow-y-auto flex flex-col z-10 relative">
          <ErrorBoundary>
            <Suspense fallback={<div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>}>
              <AnimatePresence mode="wait">
                <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/track" element={<ProtectedRoute><TrackPage /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppSettingsPage /></ProtectedRoute>} />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111111',
            color: '#F0F0F0',
            border: '1px solid #1F1F1F',
          },
          success: {
            iconTheme: {
              primary: '#00FF7F',
              secondary: '#111111',
            },
          },
        }} 
      />
    </BrowserRouter>
  )
}

export default App
