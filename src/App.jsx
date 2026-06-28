import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import POS from './components/POS'
import Inventory from './components/Inventory'
import CRM from './components/CRM'
import Reports from './components/Reports'
import Login from './components/Login'
import Expenses from './components/Expenses'
import ServicesManagement from './components/ServicesManagement'
import Quotes from './components/Quotes'
import Warehouses from './components/Warehouses'
import UsersManagement from './components/UsersManagement'
import { logout as authLogout } from './supabase-auth'

function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [activeBranch, setActiveBranch] = useState('Rojo Gomez')
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState({ role: 'staff' }) // Default safe role
  const [loading, setLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true // Default to dark mode
  })

  const handleScreenChange = (newScreen) => {
    if (newScreen !== activeScreen) {
      setIsTransitioning(true)
      setTimeout(() => {
        setActiveScreen(newScreen)
        setIsTransitioning(false)
      }, 300)
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('darkMode', JSON.stringify(newMode))
      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return newMode
    })
  }

  // Apply saved theme on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Check for existing Supabase session on mount
  useEffect(() => {
    const handleStorage = () => {
      const targetScreen = localStorage.getItem('targetScreen')
      if (targetScreen) {
        setActiveScreen(targetScreen)
        localStorage.removeItem('targetScreen')
      }
    }
    window.addEventListener('storage', handleStorage)
    handleStorage()
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const storedUser = localStorage.getItem('supabaseUser')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserProfile({
          role: userData.role || 'staff',
          email: userData.email,
          branch: userData.branch || 'Rojo Gomez',
          multi_branch: userData.multi_branch === true
        })
        if (userData.branch) {
          setActiveBranch(userData.branch)
        }
      } catch (e) {
        console.error('Error parsing stored user:', e)
      }
    }
    setLoading(false)
  }, [])

  const handleLoginComplete = () => {
    // Re-check stored user after login
    const storedUser = localStorage.getItem('supabaseUser')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserProfile({
          role: userData.role || 'staff',
          email: userData.email,
          branch: userData.branch || 'Rojo Gomez',
          multi_branch: userData.multi_branch === true
        })
        if (userData.branch) {
          setActiveBranch(userData.branch)
        }
      } catch (e) {
        console.error('Error parsing stored user:', e)
      }
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    authLogout()
    localStorage.removeItem('supabaseUser')
    setUser(null)
    setUserProfile({ role: 'staff' })
    setActiveBranch('Rojo Gomez')
  }

  const renderScreen = () => {
    const isAdmin = userProfile.role === 'admin'
    const isVendedor = userProfile.role === 'vendedor'
    switch (activeScreen) {
      case 'dashboard': return <Dashboard activeBranch={activeBranch} />
      case 'pos': return <POS activeBranch={activeBranch} isAdmin={isAdmin} isVendedor={isVendedor} />
      case 'inventory': return <Inventory activeBranch={activeBranch} isAdmin={isAdmin} isVendedor={isVendedor} />
      case 'crm': return <CRM activeBranch={activeBranch} isAdmin={isAdmin} isVendedor={isVendedor} />
      case 'warehouses': return <Warehouses activeBranch={activeBranch} isAdmin={isAdmin} />
      case 'reports': return <Reports activeBranch={activeBranch} isAdmin={isAdmin} />
      case 'expenses': return <Expenses activeBranch={activeBranch} isAdmin={isAdmin} />
      case 'services': return <ServicesManagement activeBranch={activeBranch} isAdmin={isAdmin} />
      case 'quotes': return <Quotes activeBranch={activeBranch} isAdmin={isAdmin} isVendedor={isVendedor} />
      case 'users': return <UsersManagement activeBranch={activeBranch} isAdmin={isAdmin} />
      default: return <Dashboard activeBranch={activeBranch} />
    }
  }

if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '2s' }}>
            {/* Llanta exterior */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/30" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
            {/* Rayos de la llanta */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = i * 45
              const rad = (angle * Math.PI) / 180
              const x1 = 50 + 15 * Math.cos(rad)
              const y1 = 50 + 15 * Math.sin(rad)
              const x2 = 50 + 38 * Math.cos(rad)
              const y2 = 50 + 38 * Math.sin(rad)
              return (
                <line 
                  key={i} 
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2} 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  className="text-primary"
                />
              )
            })}
            {/* Centro */}
            <circle cx="50" cy="50" r="12" fill="currentColor" className="text-surface-container-low" />
            <circle cx="50" cy="50" r="6" fill="currentColor" className="text-primary" />
          </svg>
        </div>
        <h1 className="text-xl font-headline font-bold text-on-surface uppercase tracking-widest">Cargando...</h1>
      </div>
    )
  }

  // Si no está autenticado, siempre renderiza la pantalla Login
  if (!user) {
    return <Login onLoginComplete={handleLoginComplete} />
  }

  // Aplicación Principal Protegida
  return (
    <Router>
      <div className={`flex flex-col lg:flex-row min-h-screen w-full overflow-hidden text-on-surface ${darkMode ? 'dark bg-background' : 'bg-background'}`}>
        <Sidebar 
          activeScreen={activeScreen} 
          setActiveScreen={handleScreenChange} 
          onLogout={handleLogout} 
          user={user} 
          userProfile={userProfile}
          isVendedor={userProfile.role === 'vendedor'}
          activeBranch={activeBranch}
          setActiveBranch={setActiveBranch}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />
        <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-0 scrollbar-hide">
          {isTransitioning ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: '1s' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/30" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50" />
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = i * 45
                    const rad = (angle * Math.PI) / 180
                    const x1 = 50 + 15 * Math.cos(rad)
                    const y1 = 50 + 15 * Math.sin(rad)
                    const x2 = 50 + 38 * Math.cos(rad)
                    const y2 = 50 + 38 * Math.sin(rad)
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary" />
                    )
                  })}
                  <circle cx="50" cy="50" r="12" fill="currentColor" className="text-surface-container-low" />
                  <circle cx="50" cy="50" r="6" fill="currentColor" className="text-primary" />
                </svg>
              </div>
            </div>
          ) : renderScreen()}
        </main>
      </div>
    </Router>
  )
}

export default App
