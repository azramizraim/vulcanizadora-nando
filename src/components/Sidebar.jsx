import React from 'react'
import { BRANCHES } from '../services/api'

const navItems = [
  { id: 'dashboard', icon: 'dashboard', label: 'Inicio' },
  { id: 'pos', icon: 'point_of_sale', label: 'Venta' },
  { id: 'inventory', icon: 'inventory_2', label: 'Stock' },
  { id: 'crm', icon: 'group', label: 'Clientes' },
  { id: 'reports', icon: 'analytics', label: 'Cortes', adminOnly: true },
  { id: 'expenses', icon: 'payments', label: 'Gastos' },
]

function Sidebar({ activeScreen, setActiveScreen, onLogout, user, userProfile, activeBranch, setActiveBranch }) {
  return (
    <>
      {/* Sidebar Desktop (Izquierda) */}
      <aside className="hidden lg:flex w-64 border-r border-white/5 bg-surface-container-lowest flex-col py-6 px-4 shrink-0 shadow-2xl z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 group">
          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-primary/30 shadow-[0_0_15px_rgba(255,146,56,0.2)] group-hover:scale-105 transition-transform">
            <img src="https://raw.githubusercontent.com/mizraimmartinez/vulcanizadora-nando/main/Biblioteca/logo_nando.jpg" alt="Nando" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-headline font-black text-on-surface uppercase tracking-tighter leading-none">Nando<br/><span className="text-primary text-[10px] tracking-[4px]">Cloud OS</span></h1>
        </div>

        {/* Branch Selector */}
        <div className="mb-8 w-full">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1 block px-2">Sucursal</label>
          {userProfile?.role === 'admin' ? (
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
            if (item.adminOnly && userProfile?.role !== 'admin') return null;
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
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 py-3 px-4 rounded-xl text-error/60 hover:bg-error/10 hover:text-error transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-white/10 flex items-center justify-around px-2 pb-safe z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        {navItems.map(item => {
          if (item.adminOnly && userProfile?.role !== 'admin') return null;
          const isActive = activeScreen === item.id;
          return (
            <button
               key={item.id}
               onClick={() => setActiveScreen(item.id)}
               className={`flex flex-col items-center justify-center gap-1 transition-all flex-1 py-1 ${isActive ? 'text-primary' : 'text-slate-500'}`}
            >
              <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1 scale-110' : ''}`}>{item.icon}</span>
               <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
               {isActive && <div className="w-1 h-1 bg-primary rounded-full absolute top-1 shadow-[0_0_5px_var(--primary)]"></div>}
            </button>
          )
        })}
        {/* Branch Indicator for Staff OR Selector for Admin */}
        <button onClick={() => { if(userProfile?.role === 'admin') { 
            const nextIdx = (BRANCHES.indexOf(activeBranch) + 1) % BRANCHES.length;
            setActiveBranch(BRANCHES[nextIdx]);
          } }} 
          className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-slate-500 active:scale-95"
        >
             <span className="material-symbols-outlined text-[20px] text-slate-400">storefront</span>
             <span className="text-[8px] font-black uppercase tracking-tighter truncate max-w-[40px]">{activeBranch.split(' ')[0]}</span>
        </button>
      </nav>
    </>
  )
}

export default Sidebar
