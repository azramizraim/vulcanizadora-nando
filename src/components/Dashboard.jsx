import React, { useState, useEffect } from 'react'
import { fetchData } from '../services/api'

function Dashboard({ activeBranch, isAdmin }) {
  const [sales, setSales] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    const loadAllData = async () => {
      try {
        setLoading(true)
        const [salesData, inventoryData] = await Promise.all([
          fetchData('Ventas', activeBranch),
          fetchData('Inventario', activeBranch)
        ])
        
        if (active) {
            setSales(Array.isArray(salesData) ? salesData : [])
            setInventory(Array.isArray(inventoryData) ? inventoryData : [])
        }
      } catch (err) {
        setError("Error al cargar datos del tablero")
      } finally {
        if (active) setLoading(false)
      }
    }
    loadAllData()
    return () => { active = true }
  }, [activeBranch])

  if (loading) return (
    <div className="p-8 h-full flex flex-col items-center justify-center gap-6 animate-pulse">
      <div className="w-20 h-20 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <h3 className="text-xl font-headline font-bold text-primary tracking-widest uppercase">Sincronizando Nube VNando...</h3>
    </div>
  )

  const dailyTotal = sales.reduce((acc, s) => acc + (parseFloat(s.total) || 0), 0)
  const criticalStock = inventory.filter(i => parseInt(i.qty) < 5)
  const totalItems = inventory.reduce((acc, i) => acc + (parseInt(i.qty) || 0), 0)

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl lg:text-3xl font-headline font-black text-on-surface uppercase tracking-tight">Panel Principal</h2>
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest italic tracking-widest">Sucursal: <span className="text-primary font-bold">{activeBranch}</span></p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="surface-workbench p-6 lg:p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-7xl lg:text-8xl text-emerald-400">monetization_on</span>
          </div>
          <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2">Ingreso Acumulado</p>
          <h3 className="text-3xl lg:text-5xl font-headline font-black text-emerald-400">${dailyTotal.toLocaleString('es-MX', {minimumFractionDigits: 0})}</h3>
        </div>

        <div className="surface-workbench p-6 lg:p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-7xl lg:text-8xl text-secondary">inventory_2</span>
          </div>
          <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2">Stock en Bodega</p>
          <h3 className="text-3xl lg:text-5xl font-headline font-black text-on-surface">{totalItems} <span className="text-xs text-slate-500 opacity-50">un</span></h3>
        </div>

        <div className="surface-workbench p-6 lg:p-8 rounded-2xl border-l-4 border-l-error relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-7xl lg:text-8xl text-error">warning</span>
          </div>
          <p className="text-slate-500 text-[9px] lg:text-[10px] font-black tracking-widest uppercase mb-2">Alertas Rojas</p>
          <h3 className={`text-3xl lg:text-5xl font-headline font-black ${criticalStock.length > 0 ? 'text-error animate-pulse' : 'text-on-surface opacity-50'}`}>
            {criticalStock.length}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Alertas Detalladas */}
        <div className="surface-workbench p-4 lg:p-6 rounded-2xl border border-white/5 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
             <h3 className="font-headline font-bold uppercase tracking-widest text-[10px] lg:text-sm flex items-center gap-2">
               <span className="material-symbols-outlined text-error text-lg lg:text-xl">error</span> Alertas Críticas
             </h3>
             <span className="text-[10px] font-black px-2 py-0.5 bg-error-container/20 text-error rounded">URGENTE</span>
          </div>
          
          <div className="space-y-2 lg:space-y-3">
             {criticalStock.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 lg:p-4 bg-white/5 rounded-xl border border-white/5 hover:border-error/30 transition-all">
                   <div className="flex items-center gap-3 lg:gap-4 overflow-hidden">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-surface-container-low p-1.5 border border-white/5 overflow-hidden shrink-0">
                         <img src={item.img} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-xs font-bold text-on-surface uppercase truncate">{item.name}</p>
                         <p className="text-[9px] text-slate-500 font-mono italic truncate"># {item.sku}</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-lg lg:text-xl font-headline font-black text-error leading-none">{item.qty}</p>
                      <p className="text-[8px] lg:text-[10px] text-slate-500 uppercase font-black uppercase">Unid.</p>
                   </div>
                </div>
             ))}
             {criticalStock.length === 0 && (
                <div className="py-20 text-center opacity-20">
                   <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                   <p className="uppercase font-black text-sm tracking-widest">Todo en orden por ahora</p>
                </div>
             )}
          </div>
        </div>

        {/* Resumen de Movimientos */}
        <div className="surface-workbench p-6 rounded-2xl border border-white/5 space-y-6">
           <div className="flex items-center justify-between border-b border-white/5 pb-4">
             <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Resumen de Operación</h3>
             <span className="text-[10px] font-black px-2 py-1 bg-primary/10 text-primary rounded">EN VIVO</span>
          </div>

          <div className="space-y-6 pt-4">
             <div className="flex justify-between items-center bg-surface-container-low p-6 rounded-2xl border border-white/5">
                <div>
                   <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Última Venta</p>
                   <p className="text-sm font-bold text-on-surface">{sales[0]?.itemsSummary || 'Sin movimientos aún'}</p>
                </div>
                <div className="text-right">
                   <p className="text-lg font-headline font-black text-primary">${parseFloat(sales[0]?.total || 0).toFixed(2)}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Ticket Promedio</p>
                   <p className="text-2xl font-headline font-black text-on-surface">${(dailyTotal / (sales.length || 1)).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black mb-2">Sucursal</p>
                   <p className="text-xl font-headline font-black text-primary truncate">{activeBranch}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
