import React, { useState, useEffect } from 'react'
import { fetchData, postData } from '../services/api'

function Expenses({ activeBranch }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  
  const [newExpense, setNewExpense] = useState({ concept: '', amount: '', category: 'Otros' })
  const [isSaving, setIsSaving] = useState(false)

  const CATEGORIES = ['Alimentación', 'Servicios', 'Mantenimiento', 'Sueldos/Bonos', 'Gastos Médicos', 'Artículos Limpieza', 'Flete/Acarreo', 'Otros']

  useEffect(() => {
    let active = true
    const loadExpenses = async () => {
      try {
        setLoading(true)
        const data = await fetchData('Gastos', activeBranch)
        if (active) {
            const sorted = Array.isArray(data) ? data.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)) : []
            setExpenses(sorted)
        }
      } catch (err) {
        console.error("Expenses Load Error:", err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadExpenses()
    return () => { active = false }
  }, [activeBranch])

  const handleAddExpense = async () => {
    if (!newExpense.concept || !newExpense.amount) return alert('Por favor, indica concepto e importe.')
    setIsSaving(true)
    try {
      const expenseData = {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        date: new Date().toLocaleString('es-MX'),
        timestamp: new Date().getTime(),
        branch: activeBranch
      }
      const res = await postData('Gastos', expenseData)
      if (res.success) {
        setShowAddModal(false)
        setNewExpense({ concept: '', amount: '', category: 'Otros' })
        // Refresh local state
        const updatedData = await fetchData('Gastos', activeBranch)
        if (Array.isArray(updatedData)) {
            const sorted = updatedData.sort((a,b) => b.timestamp - a.timestamp)
            setExpenses(sorted)
        }
      }
    } catch (e) {
      alert('Error al registrar gasto')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="p-8 h-full flex flex-col items-center justify-center gap-6 animate-pulse">
      <div className="w-20 h-20 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-headline font-bold text-primary tracking-widest uppercase">Cargando Egresos...</h3>
        <p className="text-slate-500 text-sm italic">Obteniendo movimientos en la Nube ({activeBranch})</p>
      </div>
    </div>
  )

  const totalExpenses = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

  return (
    <div className="p-8 space-y-8 duration-500">
      
      {/* Modal Agregar Gasto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
            <div className="p-4 bg-surface-container-high border-b border-white/10 flex justify-between items-center">
              <h3 className="font-headline font-black text-on-surface uppercase tracking-widest text-xs">Registrar Nuevo Gasto</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                 <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Concepto / Motivo</label>
                 <input 
                   className="w-full input-industrial py-3 text-sm" 
                   placeholder="Ej. Comida para el personal" 
                   value={newExpense.concept}
                   onChange={e => setNewExpense({...newExpense, concept: e.target.value})}
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Categoría</label>
                   <select 
                      className="w-full input-industrial py-3 text-xs"
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                   >
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Importe ($ MXN)</label>
                   <input 
                     type="number"
                     className="w-full input-industrial py-3 text-sm font-bold text-error" 
                     placeholder="0.00" 
                     value={newExpense.amount}
                     onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                   />
                 </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-high border-t border-white/10 flex gap-2">
              <button onClick={handleAddExpense} disabled={isSaving} className="flex-1 btn-primary py-4 font-black uppercase text-xs">
                {isSaving ? 'Guardando...' : 'Confirmar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-md py-4 border-b border-white/10 z-10">
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface">Caja Chica y Egresos</h2>
          <p className="text-slate-400 text-sm mt-1">Sincronizado con sucursal: <span className="text-error font-bold font-mono">{activeBranch}</span></p>
        </div>
        <div className="flex gap-4">
          <button 
             onClick={() => setShowAddModal(true)}
             className="bg-error-container/20 text-error border border-error/20 px-6 py-2 rounded-lg text-sm font-bold hover:bg-error hover:text-white transition-all flex items-center gap-2"
          >
            Registrar Gasto <span className="material-symbols-outlined text-[18px]">money_off</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="surface-workbench p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-9xl text-error">trending_down</span>
          </div>
          <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mb-2">Total de Gastos (Esta Sucursal)</p>
          <h3 className="text-5xl font-headline font-black text-error">${totalExpenses.toLocaleString('es-MX', {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="surface-workbench p-6 rounded-xl border border-white/5 space-y-4">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Distribución sugerida</h4>
             <div className="space-y-4">
                {CATEGORIES.slice(0, 3).map(c => (
                    <div key={c} className="flex items-center justify-between">
                       <span className="text-xs text-slate-400">{c}</span>
                       <div className="h-1 flex-1 mx-4 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-error/50" style={{ width: '15%' }}></div>
                       </div>
                       <span className="text-xs font-bold">$0.00</span>
                    </div>
                ))}
             </div>
        </div>
      </div>

      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container-high/10">
             <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Historial de Salidas de Efectivo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4">Concepto / Motivo</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-body">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-error/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">{exp.date}</td>
                    <td className="px-6 py-4 font-bold text-on-surface text-sm uppercase">{exp.concept}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-surface-container-highest text-[10px] font-black uppercase text-slate-500 border border-white/5">{exp.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-headline font-bold text-error">-${parseFloat(exp.amount).toFixed(2)}</p>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan="4" className="py-20 text-center opacity-20 uppercase font-black tracking-[10px] text-sm">Sin gastos</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  )
}

export default Expenses
