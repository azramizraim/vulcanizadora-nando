import React, { useState, useEffect } from 'react'
import { fetchData, postData } from '../services/api'

function CRM({ activeBranch }) {
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', type: 'Individual', balance: 0 })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    const loadClients = async () => {
      try {
        setLoading(true)
        const data = await fetchData('Clientes', activeBranch)
        if (active && Array.isArray(data)) setClients(data)
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadClients()
    return () => { active = false }
  }, [activeBranch])

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) return alert('Nombre y teléfono son obligatorios.')
    setIsSaving(true)
    try {
      const clientData = {
        ...newClient,
        branch: activeBranch,
        balance: parseFloat(newClient.balance || 0),
        orders: 0,
        timestamp: new Date().getTime()
      }
      const res = await postData('Clientes', clientData)
      if (res.success) {
        setShowAddModal(false)
        setNewClient({ name: '', phone: '', email: '', type: 'Individual', balance: 0 })
        const data = await fetchData('Clientes', activeBranch)
        if (Array.isArray(data)) setClients(data)
      }
    } catch (e) {
      alert('Error al guardar cliente')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-primary font-black uppercase tracking-widest text-xs">Sincronizando Clientes...</div>

  const filtered = clients.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').toString().includes(searchTerm))
  const totalDebt = clients.reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 border border-white/10 space-y-4">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">Nuevo Cliente</h3>
            <input className="w-full input-industrial py-3 text-xs" placeholder="Nombre Completo" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
            <input className="w-full input-industrial py-3 text-xs" placeholder="WhatsApp (10 dígitos)" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
            <select className="w-full input-industrial py-3 text-xs" value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})}>
               <option value="Individual">Individual</option>
               <option value="Commercial">Empresarial / Flota</option>
            </select>
            <input className="w-full input-industrial py-3 text-xs" placeholder="Saldo inicial (opcional)" value={newClient.balance} onChange={e => setNewClient({...newClient, balance: e.target.value})} />
            <button onClick={handleAddClient} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">{isSaving ? 'Guardando...' : 'Crear Registro'}</button>
            <button onClick={() => setShowAddModal(false)} className="w-full text-slate-500 text-[10px] font-black uppercase">Cancelar</button>
          </div>
        </div>
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-headline font-black text-on-surface uppercase">Clientes</h2>
          <p className="text-slate-400 text-[10px] uppercase font-black">Directorio en <span className="text-primary">{activeBranch}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar por nombre o cel..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">Agregar <span className="material-symbols-outlined">person_add</span></button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="surface-workbench p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Total deudores</p>
            <h3 className="text-3xl font-headline font-black text-error">${totalDebt.toFixed(2)}</h3>
         </div>
         <div className="surface-workbench p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Clientes registrados</p>
            <h3 className="text-3xl font-headline font-black text-on-surface">{clients.length}</h3>
         </div>
      </div>

      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
         <table className="hidden md:table w-full text-left">
            <thead>
               <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                  <th className="px-6 py-4">Información</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Saldo Deudor</th>
                  <th className="px-6 py-4 text-center">Contactar</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-all group">
                     <td className="px-6 py-4">
                        <p className="text-sm font-bold text-on-surface uppercase">{c.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{c.phone}</p>
                     </td>
                     <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${c.type === 'Commercial' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-500'}`}>{c.type}</span>
                     </td>
                     <td className="px-6 py-4 text-right font-headline font-black text-sm">
                        <span className={c.balance > 0 ? 'text-error animate-pulse' : 'text-emerald-400'}>${parseFloat(c.balance).toFixed(2)}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <a href={`https://wa.me/52${c.phone}`} target="_blank" className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 mx-auto transition-all"><span className="material-symbols-outlined text-[20px]">chat</span></a>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>

         {/* Mobile view */}
         <div className="md:hidden divide-y divide-white/5">
            {filtered.map(c => (
               <div key={c.id} className="p-4 flex justify-between items-center">
                  <div className="min-w-0">
                     <p className="text-xs font-bold text-on-surface uppercase truncate">{c.name}</p>
                     <p className="text-[9px] text-slate-500 font-mono italic">{c.phone}</p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                     <span className={`text-xs font-black ${c.balance > 0 ? 'text-error' : 'text-emerald-400'}`}>${parseFloat(c.balance).toFixed(0)}</span>
                     <a href={`https://wa.me/52${c.phone}`} target="_blank" className="w-10 h-10 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-400"><span className="material-symbols-outlined text-[20px] font-black">chat</span></a>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}

export default CRM
