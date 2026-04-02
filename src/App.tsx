import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Toaster } from 'sonner'

import AuthPage from './pages/AuthPage'
import UserDashboard from './pages/UserDashboard'
import OBDashboard from './pages/OBDashboard'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    if (data && !error) {
      setRole(data.role)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-800">Menyiapkan Meja...</p>
      </div>
    )
  }

  return (
    <Router>
      <div className="bg-slate-200 min-h-screen w-full flex justify-center selection:bg-amber-200 selection:text-amber-900">
        <div className="w-full max-w-[430px] bg-slate-50 min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
          <Toaster position="top-center" richColors toastOptions={{ className: 'mx-auto max-w-[400px]' }} />
          <Routes>
            <Route 
              path="/auth" 
              element={!session ? <AuthPage /> : (role === 'OB' ? <Navigate to="/admin" /> : <Navigate to="/" />)} 
            />
            <Route 
              path="/" 
              element={
                session ? (
                  role === 'OB' ? <Navigate to="/admin" /> : <UserDashboard session={session} />
                ) : (
                  <Navigate to="/auth" />
                )
              } 
            />
            <Route 
              path="/admin" 
              element={
                session ? (
                  role === 'OB' ? <OBDashboard session={session} /> : <Navigate to="/" />
                ) : (
                  <Navigate to="/auth" />
                )
              } 
            />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
