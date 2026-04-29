import React, { useState, useEffect } from 'react'
import { fetchData, db } from '../services/api'
import { collection, query, where, getDocs } from 'firebase/firestore'

function Reports({ activeBranch, isAdmin }) {
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let active = true
    const loadReports = async () => {
      try {
        setLoading(true)
        const [salesData, expData] = await Promise.all([
          fetchData('Ventas', activeBranch),
          fetchData('Gastos', activeBranch)
        ])
        if (active) {
            setSales(Array.isArray(salesData) ? salesData.sort((a,b) => b.timestamp - a.timestamp) : [])
            setExpenses(Array.isArray(expData) ? expData : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadReports()
    return () => { active = false }
  }, [activeBranch])

  if (loading) return <div className="p-20 text-center animate-pulse text-xs font-black uppercase tracking-widest text-primary">Generando Reportes...</div>

  const totalSales = sales.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
  const totalExp = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
  const cashNet = totalSales - totalExp

  const filtered = sales.filter(s => (s.orderId||'').toLowerCase().includes(searchTerm.toLowerCase()) || (s.client||'').toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
           <h2 className="text-2xl font-headline font-black text-on-surface uppercase">Cortes y Reportes</h2>
           <p className="text-slate-400 text-[10px] uppercase font-black">Historial de <span className="text-primary">{activeBranch}</span></p>
        </div>
        <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar venta # o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </header>

      {/* Resumen de Corte en móviles/escritorio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <div className="surface-workbench p-6 rounded-2xl border border-white/5 border-b-primary shadow-lg">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Ventas Brutas</p>
            <h3 className="text-3xl font-headline font-black text-emerald-400">${totalSales.toFixed(2)}</h3>
         </div>
         <div className="surface-workbench p-6 rounded-2xl border border-white/5 border-b-error shadow-lg">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Egresos (Caja Chica)</p>
            <h3 className="text-3xl font-headline font-black text-error">-${totalExp.toFixed(2)}</h3>
         </div>
         <div className="surface-workbench p-6 rounded-2xl border border-white/10 bg-primary/5 shadow-2xl">
            <p className="text-[10px] text-primary/50 font-black uppercase mb-1 italic">Efectivo Neto (Corte)</p>
            <h3 className="text-3xl font-headline font-black text-primary animate-in fade-in zoom-in duration-500">${cashNet.toFixed(2)}</h3>
         </div>
      </div>

      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="hidden md:table w-full text-left">
               <thead>
                  <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                     <th className="px-6 py-4">Orden / Fecha</th>
                     <th className="px-6 py-4">Cliente / Artículos</th>
                     <th className="px-6 py-4 text-center">Método</th>
                     <th className="px-6 py-4 text-right">Monto Total</th>
                     <th className="px-6 py-4 text-center">Ticket</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {filtered.map(s => (
                     <tr key={s.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-4">
                           <p className="text-sm font-bold text-primary">{s.orderId}</p>
                           <p className="text-[9px] text-slate-500 font-mono italic">{s.date}</p>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                           <p className="text-xs font-bold text-on-surface uppercase truncate">{s.client}</p>
                           <p className="text-[10px] text-slate-500 truncate">{s.itemsSummary || 'Varios productos'}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className="text-[10px] font-black uppercase text-slate-500 border border-white/5 px-2 py-1 rounded">{s.paymentMethod}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-headline font-black text-sm text-emerald-400">
                           ${parseFloat(s.total).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button onClick={() => setSelectedTicket(s)} className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-all mx-auto"><span className="material-symbols-outlined text-[18px]">receipt_long</span></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>

            {/* Versión móvil (Lista compacta) */}
            <div className="md:hidden divide-y divide-white/5">
                {filtered.map(s => (
                   <div key={s.id} onClick={() => setSelectedTicket(s)} className="p-4 flex items-center justify-between active:bg-white/5 transition-colors cursor-pointer">
                      <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-primary">{s.orderId}</span>
                            <span className="text-[8px] bg-white/5 px-1 rounded font-black text-slate-500 uppercase">{s.paymentMethod}</span>
                         </div>
                         <p className="text-[10px] text-on-surface uppercase font-bold truncate">{s.client}</p>
                         <p className="text-[9px] text-slate-500 italic mt-0.5">{s.date.split(',')[1]}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                         <p className="text-sm font-headline font-black text-emerald-400 tracking-tighter">${parseFloat(s.total).toFixed(2)}</p>
                         <span className="material-symbols-outlined text-[16px] text-slate-600">chevron_right</span>
                      </div>
                   </div>
                ))}
            </div>
         </div>
      </div>

      {/* Modal de Ticket (Version móvil-friendly) */}
      {selectedTicket && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white text-black max-w-sm w-full rounded-2xl p-6 lg:p-8 font-mono shadow-2xl flex flex-col">
               <div className="text-center mb-6">
                  <h1 className="font-black text-xl tracking-tighter">VULCANIZADORA NANDO</h1>
                  <p className="text-[8px] uppercase font-bold text-slate-400">{activeBranch}</p>
               </div>
               <div className="border-y border-dashed border-slate-200 py-3 mb-6 space-y-1 text-[10px] uppercase">
                  <div className="flex justify-between"><span>Venta:</span><span className="font-black">{selectedTicket.orderId}</span></div>
                  <div className="flex justify-between"><span>Fecha:</span><span>{selectedTicket.date}</span></div>
                  <div className="flex justify-between"><span>Cliente:</span><span className="truncate max-w-[120px]">{selectedTicket.client}</span></div>
               </div>
               <div className="space-y-2 mb-6 flex-1 min-h-[100px] overflow-y-auto pr-2">
                  {(selectedTicket.itemsList || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-bold">
                         <span className="truncate pr-4">{item.qty}x {item.name}</span>
                         <span>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                  ))}
               </div>
               <div className="border-t-2 border-black pt-4 mb-8">
                   <div className="flex justify-between text-xs font-bold mb-1 text-slate-500"><span>Subtotal:</span><span>${parseFloat(selectedTicket.subtotal || 0).toFixed(2)}</span></div>
                   <div className="flex justify-between text-lg font-black tracking-tighter"><span>TOTAL MXN:</span><span>${parseFloat(selectedTicket.total).toFixed(2)}</span></div>
                   <p className="text-[8px] mt-2 text-center text-slate-400 font-bold uppercase">Pagado con {selectedTicket.paymentMethod}</p>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setSelectedTicket(null)} className="flex-1 bg-slate-100 text-slate-400 py-4 text-[10px] font-black uppercase rounded-lg">Cerrar</button>
                  <a href={`https://wa.me/52${selectedTicket.phone || ''}?text=Hola+${selectedTicket.client},+aquí+tienes+tu+ticket+de+Vulcanizadora+Nando:+https://vulcanizadora-nando.web.app`} target="_blank" className="flex-1 bg-emerald-500 text-white py-4 text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-2">Compartir <span className="material-symbols-outlined text-[16px]">share</span></a>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}

export default Reports
