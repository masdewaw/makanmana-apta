import { AccountAccessContext } from './hooks/useAccountAccess'
import { ForcePasswordChange } from './components/organisms/ForcePasswordChange'
import { useOnline } from './hooks/useOnline'
import { OnboardingProvider } from './components/organisms/OnboardingProvider'
import { errorMessage, withTimeout } from './lib/errors'
import { queryClient } from './lib/query-client'
import { BrandLogo } from './components/molecules/BrandLogo'
import { profileService } from './api/profiles'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef, Component, ReactNode } from 'react'
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
          <h1 className="text-white font-semibold text-2xl mb-4">Waduh, Ada Kendala!</h1>
          <div className="max-w-xs w-full bg-slate-800 rounded-2xl p-4 mb-8">
            <pre className="text-red-400 text-[12px] overflow-auto text-left font-mono whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold uppercase tracking-normal text-xs hover:bg-red-500 hover:text-white transition-all active:scale-95"
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
  const online = useOnline()
  const wasOnline = useRef(online)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const identity = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    let revision = 0
    const acceptSession = (next: Session | null) => {
      if (!active) return
      revision++
      if (identity.current !== (next?.user.id ?? null)) {
        void queryClient.cancelQueries()
        queryClient.clear()
        identity.current = next?.user.id ?? null
      }
      setSession(next)
      setRole(null)
      setIsAdmin(false)
      setMustChangePassword(false)
      setAuthError(null)
      setLoading(!!next)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => acceptSession(next))
    const initialRevision = revision
    void withTimeout(supabase.auth.getSession()).then(({ data, error }) => {
      if (error) throw error
      if (active && revision === initialRevision) acceptSession(data.session)
    }).catch(error => {
      if (active && revision === initialRevision) { setAuthError(errorMessage(error)); setLoading(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [retry])

  useEffect(() => {
    if (online && !wasOnline.current && authError) setRetry(value => value + 1)
    wasOnline.current = online
  }, [online, authError])

  // Keep database calls outside the synchronous Auth event callback.
  useEffect(() => {
    if (!session) return
    if (!online) { setLoading(false); return }
    let active = true
    setLoading(true)
    void withTimeout(profileService.getRole(session.user.id)).then(({ data, error }) => {
      if (error) throw error
      if (data?.role !== 'user' && data?.role !== 'OB') throw new Error('Profil belum tersedia. Coba lagi atau hubungi pengelola.')
      if (active) { setRole(data.role); setIsAdmin(data.is_admin === true); setMustChangePassword(data.must_change_password === true); setAuthError(null) }
    }).catch(error => { if (active) setAuthError(errorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session, retry, online])

  if (authError || (!online && session && !role)) return (
    <div className="min-h-screen max-w-[430px] mx-auto bg-slate-50 p-6 flex flex-col justify-center gap-4" role="alert">
      <h1 className="text-xl font-bold">{online ? 'Belum bisa membuka akun' : 'Kamu sedang offline'}</h1>
      <p>{online ? authError : 'Tampilan aplikasi sudah tersedia. Sambungkan internet untuk memuat profil dan pesanan terbaru. Keranjangmu tetap tersimpan di perangkat ini.'}</p>
      <button disabled={!online} className="bg-emerald-500 rounded-xl p-3 text-white disabled:opacity-50" onClick={() => { setLoading(true); setAuthError(null); setRetry(value => value + 1) }}>Coba lagi</button>
      <button className="p-3" onClick={() => { void supabase.auth.signOut().then(({ error }) => { if (error) setAuthError(error.message); else { setSession(null); setRole(null); setAuthError(null); setLoading(false) } }) }}>Kembali ke login</button>
    </div>
  )

  if (loading || (session && role === null)) {
    return (
      <div className="bg-slate-200 min-h-screen w-full flex justify-center">
        <div className="w-full max-w-[430px] bg-slate-900 min-h-screen shadow-2xl flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl animate-bounce flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <BrandLogo iconOnly className="loading-brand" />
            </div>
          </div>
          <p className="mt-8 font-semibold text-xs text-slate-400 uppercase tracking-[0.4em] animate-pulse">Menyiapkan meja...</p>
        </div>
      </div>
    )
  }

  if (session && mustChangePassword) return <ForcePasswordChange />

  return (
    <AccountAccessContext.Provider value={{ isAdmin }}>
    <Router>
      <div className="bg-slate-200 min-h-screen w-full flex justify-center selection:bg-emerald-200 selection:text-emerald-900">
        <div className="mobile-shell w-full max-w-[430px] bg-slate-50 min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
          <Toaster position="top-center" richColors toastOptions={{ className: 'mx-auto max-w-[400px]' }} />
          <ErrorBoundary>
            <OnboardingProvider key={`${session?.user.id ?? "guest"}:${role}`} userId={session?.user.id ?? null} role={role === 'OB' ? 'ob' : 'user'}>
            <Routes>
              <Route 
                path="/auth" 
                element={!session ? <AuthPage /> : (role === 'OB' ? <Navigate to="/admin" /> : <Navigate to="/" />)} 
              />
              <Route 
                path="/" 
                element={
                  session ? (
                    role === 'OB' ? <Navigate to="/admin" /> : <UserDashboard key={session.user.id} session={session} />
                  ) : (
                    <Navigate to="/auth" />
                  )
                } 
              />
              <Route 
                path="/admin" 
                element={
                  session ? (
                    role === 'OB' ? <OBDashboard key={session.user.id} session={session} /> : <Navigate to="/" />
                  ) : (
                    <Navigate to="/auth" />
                  )
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </OnboardingProvider>
          </ErrorBoundary>
        </div>
      </div>
    </Router>
    </AccountAccessContext.Provider>
  )
}

export default App
