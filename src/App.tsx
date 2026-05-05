import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, Component, ReactNode } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { Toaster } from 'sonner'

import AuthPage from './pages/AuthPage'
import UserDashboard from './pages/UserDashboard'
import OBDashboard from './pages/OBDashboard'
import NotFound from './pages/NotFound'

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 min-h-screen flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-500 rounded-3xl flex items-center justify-center text-4xl mb-8 shadow-2xl shadow-red-500/20">
            ⚠️
          </div>
          <h1 className="text-white font-black text-2xl mb-4">Waduh, Ada Kendala!</h1>
          <div className="max-w-xs w-full bg-slate-800 rounded-2xl p-4 mb-8">
            <pre className="text-red-400 text-[10px] overflow-auto text-left font-mono whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            Refresh Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  if (loading || (session && role === null)) {
    return (
      <div className="bg-slate-200 min-h-screen w-full flex justify-center">
        <div className="w-full max-w-[430px] bg-slate-900 min-h-screen shadow-2xl flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 bg-amber-500 rounded-2xl animate-bounce flex items-center justify-center shadow-xl shadow-amber-500/20">
              <span className="text-3xl">🍔</span>
            </div>
          </div>
          <p className="mt-8 font-black text-xs text-slate-400 uppercase tracking-[0.4em] animate-pulse">Menyiapkan Meja...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="bg-slate-200 min-h-screen w-full flex justify-center selection:bg-amber-200 selection:text-amber-900">
        <div className="w-full max-w-[430px] bg-slate-50 min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
          <Toaster position="top-center" richColors toastOptions={{ className: 'mx-auto max-w-[400px]' }} />
          <ErrorBoundary>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>
    </Router>
  )
}

export default App
