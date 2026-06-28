import React from 'react'
import { BRANCHES } from '../services/api'

const navItems = [
  { id: 'dashboard', icon: 'dashboard', label: 'Inicio' },
  { id: 'pos', icon: 'point_of_sale', label: 'Venta' },
  { id: 'inventory', icon: 'inventory_2', label: 'Stock' },
  { id: 'crm', icon: 'group', label: 'Clientes' },
  { id: 'warehouses', icon: 'warehouse', label: 'Almacenes', adminOnly: true },
  { id: 'reports', icon: 'analytics', label: 'Cortes', adminOnly: true },
  { id: 'expenses', icon: 'payments', label: 'Gastos' },
  { id: 'services', icon: 'build', label: 'Servicios', adminOnly: true },
  { id: 'quotes', icon: 'request_quote', label: 'Cotizaciones' },
  { id: 'users', icon: 'group_add', label: 'Usuarios', adminOnly: true },
]

function Sidebar({ activeScreen, setActiveScreen, onLogout, user, userProfile, isVendedor, activeBranch, setActiveBranch, darkMode, toggleDarkMode }) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false)
  const isAdmin = userProfile?.role === 'admin'
  const canAccess = (item) => {
    if (item.adminOnly && !isAdmin) return false
    return true
  }

  const handleNavClick = (itemId) => {
    setActiveScreen(itemId)
    setShowMobileMenu(false)
  }

  return (
    <>
      {/* Sidebar Desktop (Izquierda) */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-surface-container-lowest flex-col py-6 px-4 shrink-0 shadow-2xl z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 group">
          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-primary/30 shadow-[0_0_15px_rgba(255,146,56,0.2)] group-hover:scale-105 transition-transform">
            <img src="/images/logo_nando.jpg" alt="Nando" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-headline font-black text-on-surface uppercase tracking-tighter leading-none">Nando<br/><span className="text-primary text-[10px] tracking-[4px]">Cloud OS</span></h1>
        </div>

        {/* Branch Selector */}
        <div className="mb-8 w-full">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1 block px-2">Sucursal</label>
          {isAdmin || userProfile?.role === 'staff' || userProfile?.multi_branch ? (
            <select 
              value={activeBranch} 
              onChange={e => setActiveBranch(e.target.value)}
              className="w-full bg-surface-container-high border border-white/10 rounded-md py-2 px-3 text-xs font-bold text-primary focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              {BRANCHES.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          ) : (
            <div className="bg-surface-container-high/50 border border-white/5 rounded-md py-2 px-3 text-xs font-black text-slate-300 uppercase flex items-center gap-2">
               <span className="material-symbols-outlined text-xs">store</span> {activeBranch}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 w-full space-y-2">
          {navItems.map(item => {
            if (!canAccess(item)) return null;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 group outline-none ${isActive ? 'bg-primary text-background shadow-[0_0_20px_rgba(255,146,56,0.3)]' : 'text-slate-400 hover:bg-white/5 hover:text-on-surface'}`}
              >
                <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className="text-sm font-bold uppercase tracking-widest">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="mt-auto border-t border-white/5 pt-4">
          {user && (
            <div className="flex flex-col gap-1 px-3 mb-4 opacity-70">
              <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">account_circle</span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-primary">{userProfile?.role || 'Staff'}</span>
              </div>
              <span className="text-[10px] truncate font-mono">{user.email}</span>
            </div>
          )}
          
          <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-on-surface/60 hover:bg-primary/10 hover:text-primary transition-all mb-2">
            <span className="material-symbols-outlined text-[20px]">{darkMode ? 'light_mode' : 'nightlight'}</span>
            <span className="text-xs font-black uppercase tracking-widest">{darkMode ? 'Modo Claro' : 'Modo Obscuro'}</span>
          </button>
          
          <button onClick={onLogout} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-error/60 hover:bg-error/10 hover:text-error transition-all">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container border-b border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <img src="/images/logo_nando.jpg" alt="Nando" className="w-8 h-8 rounded object-contain" />
          <span className="font-bold text-primary text-sm">Nando</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">{darkMode ? 'light_mode' : 'nightlight'}</span>
          </button>
          <button onClick={() => setShowMobileMenu(true)} className="p-2 rounded-lg hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="lg:hidden fixed inset-0 bg-black/90 z-50 pt-14" onClick={() => setShowMobileMenu(false)}>
          <div className="bg-surface-container p-4" onClick={e => e.stopPropagation()}>
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">{user.email?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{user.email}</p>
                  <p className="text-xs text-slate-400">{userProfile?.role}</p>
                </div>
              </div>
            )}
            
            {/* Branch Selector (Mobile) */}
            {(isAdmin || userProfile?.role === 'staff' || userProfile?.multi_branch) && (
              <div className="mb-4 pb-4 border-b border-white/10">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1 block">Sucursal</label>
                <select
                  value={activeBranch}
                  onChange={e => setActiveBranch(e.target.value)}
                  className="w-full bg-surface-container-high border border-white/10 rounded-md py-2 px-3 text-xs font-bold text-primary focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Mobile Nav Items */}
            <nav className="space-y-1">
              {navItems.map(item => {
                if (!canAccess(item)) return null;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl ${isActive ? 'bg-primary text-background' : 'text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined">{item.icon}</span>
                    <span className="font-bold">{item.label}</span>
                  </button>
                )
              })}
            </nav>
            
            {/* Logout Button */}
            <button 
              onClick={() => { onLogout(); setShowMobileMenu(false) }}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-error mt-4"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-bold">Cerrar Sesión</span>
            </button>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowMobileMenu(false)}
              className="w-full py-3 mt-2 text-center text-slate-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-white/10 flex items-center justify-around px-2 pb-safe z-40">
        {navItems.map(item => {
          if (!canAccess(item)) return null;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 ${isActive ? 'text-primary' : 'text-slate-500'}`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
              <span className="text-[8px] font-black uppercase">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}

export default Sidebar