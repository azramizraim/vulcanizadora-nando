import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import POS from './components/POS'
import Inventory from './components/Inventory'
import CRM from './components/CRM'
import Reports from './components/Reports'
import Login from './components/Login'
import Expenses from './components/Expenses'

function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [activeBranch, setActiveBranch] = useState('Rojo Gomez')
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState({ role: 'staff' }) // Default safe role
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)
      
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'Usuarios', currentUser.uid))
          if (userDoc.exists()) {
            const profile = userDoc.data()
            setUserProfile(profile)
            if (profile.role === 'staff' && profile.branch) {
              setActiveBranch(profile.branch)
            }
          } else {
            // New user? Default to staff
            const defaultProfile = { role: 'staff', email: currentUser.email, branch: 'Rojo Gomez' }
            await setDoc(doc(db, 'Usuarios', currentUser.uid), defaultProfile)
            setUserProfile(defaultProfile)
          }
        } catch (e) {
          console.error("Profile load error", e)
        }
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard activeBranch={activeBranch} />
      case 'pos': return <POS activeBranch={activeBranch} />
      case 'inventory': return <Inventory activeBranch={activeBranch} isAdmin={userProfile.role === 'admin'} />
      case 'crm': return <CRM activeBranch={activeBranch} isAdmin={userProfile.role === 'admin'} />
      case 'reports': return <Reports activeBranch={activeBranch} isAdmin={userProfile.role === 'admin'} />
      case 'expenses': return <Expenses activeBranch={activeBranch} isAdmin={userProfile.role === 'admin'} />
      default: return <Dashboard activeBranch={activeBranch} isAdmin={userProfile.role === 'admin'} />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 animate-pulse">
         <div className="w-16 h-16 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <h1 className="text-xl font-headline font-bold text-on-surface uppercase tracking-widest">Iniciando Servidor...</h1>
      </div>
    )
  }

  // Si no está autenticado, siempre renderiza la pantalla Login
  if (!user) {
    return <Login />
  }

  // Aplicación Principal Protegida
  return (
    <Router>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background w-full overflow-hidden text-on-surface">
        <Sidebar 
          activeScreen={activeScreen} 
          setActiveScreen={setActiveScreen} 
          onLogout={handleLogout} 
          user={user} 
          userProfile={userProfile}
          activeBranch={activeBranch}
          setActiveBranch={setActiveBranch}
        />
        <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-0 scrollbar-hide">
          {renderScreen()}
        </main>
      </div>
    </Router>
  )
}

export default App
