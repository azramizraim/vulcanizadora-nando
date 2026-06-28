import React, { useState, useEffect } from 'react'
import { fetchData, postData, updateData, deleteData } from '../services/api'
import { Plus, Trash2, Search, X, Edit, Phone, MapPin, Mail } from 'lucide-react'

function CRM({ activeBranch, isAdmin, isVendedor }) {
  const canEdit = isAdmin && !isVendedor
  const [clients, setClients] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', rfc: '', type: 'Individual', balance: 0, address: '' })
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
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email || '',
        branch: activeBranch
      }
      const res = await postData('Clientes', clientData)
      if (res.success) {
        setShowAddModal(false)
        setNewClient({ name: '', phone: '', email: '', rfc: '', type: 'Individual', balance: 0, address: '' })
        const data = await fetchData('Clientes', activeBranch)
        if (Array.isArray(data)) setClients(data)
      }
    } catch (e) {
      alert('Error al guardar cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditClient = async () => {
    if (!selectedClient) return
    setIsSaving(true)
    try {
      await updateData('Clientes', selectedClient.id, {
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email || ''
      })
      setShowEditModal(false)
      setSelectedClient(null)
      setNewClient({ name: '', phone: '', email: '', rfc: '', type: 'Individual', balance: 0, address: '' })
      const data = await fetchData('Clientes', activeBranch)
      if (Array.isArray(data)) setClients(data)
    } catch (e) {
      alert('Error al actualizar cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClient = async (clientId) => {
    if (!confirm('¿Eliminar este cliente?')) return
    try {
      await deleteData('Clientes', clientId)
      const data = await fetchData('Clientes', activeBranch)
      if (Array.isArray(data)) setClients(data)
    } catch (e) {
      alert('Error al eliminar cliente')
    }
  }

  const openEditModal = (client) => {
    setSelectedClient(client)
    setNewClient({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      rfc: client.rfc || '',
      type: client.type || 'Individual',
      balance: client.balance || 0,
      address: client.address || ''
    })
    setShowEditModal(true)
  }

  if (loading) return (
    <div className="p-8 h-full flex flex-col items-center justify-center gap-6">
      <div className="relative w-16 h-16">
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
          <circle cx="50" cy="50" r="12" fill="currentColor" className="text-surface-container-high" />
          <circle cx="50" cy="50" r="6" fill="currentColor" className="text-primary" />
        </svg>
      </div>
    </div>
  )

  const filtered = clients.filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').toString().includes(searchTerm))
  const totalDebt = clients.reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0)

  return (
    <div className="p-4 lg:p-8 space-y-6">
      
      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">Nuevo Cliente</h3>
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Nombre Completo *" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="WhatsApp (10 dígitos) *" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Correo electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="RFC" value={newClient.rfc} onChange={e => setNewClient({...newClient, rfc: e.target.value.toUpperCase()})} />
            
            <textarea className="w-full input-industrial py-3 text-xs" placeholder="Dirección" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
            
            <select className="w-full input-industrial py-3 text-xs" value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})}>
               <option value="Individual">Individual</option>
               <option value="Commercial">Empresarial / Flota</option>
            </select>
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Saldo inicial (opcional)" value={newClient.balance} onChange={e => setNewClient({...newClient, balance: e.target.value})} />
            
            <button onClick={handleAddClient} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">{isSaving ? 'Guardando...' : 'Crear Registro'}</button>
            <button onClick={() => { setShowAddModal(false); setNewClient({ name: '', phone: '', email: '', rfc: '', type: 'Individual', balance: 0, address: '' }) }} className="w-full text-slate-500 text-[10px] font-black uppercase">Cancelar</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-primary font-black uppercase text-xs tracking-widest border-b border-white/5 pb-2">Editar Cliente</h3>
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Nombre Completo *" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="WhatsApp (10 dígitos) *" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Correo electrónico" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="RFC" value={newClient.rfc} onChange={e => setNewClient({...newClient, rfc: e.target.value.toUpperCase()})} />
            
            <textarea className="w-full input-industrial py-3 text-xs" placeholder="Dirección" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
            
            <select className="w-full input-industrial py-3 text-xs" value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})}>
               <option value="Individual">Individual</option>
               <option value="Commercial">Empresarial / Flota</option>
            </select>
            
            <input className="w-full input-industrial py-3 text-xs" placeholder="Saldo" value={newClient.balance} onChange={e => setNewClient({...newClient, balance: e.target.value})} />
            
            {canEdit && (
              <div className="flex gap-2">
                <button onClick={handleEditClient} disabled={isSaving} className="flex-1 btn-primary py-4 text-xs font-black uppercase">{isSaving ? 'Guardando...' : 'Actualizar'}</button>
                <button onClick={() => handleDeleteClient(selectedClient.id)} className="bg-red-500/20 text-red-400 px-4 py-4 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
            <button onClick={() => { setShowEditModal(false); setSelectedClient(null) }} className="w-full text-slate-500 text-[10px] font-black uppercase">Cerrar</button>
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
          {canEdit && (
            <button onClick={() => { setNewClient({ name: '', phone: '', email: '', rfc: '', type: 'Individual', balance: 0, address: '' }); setShowAddModal(true) }} className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center justify-center gap-2">Agregar</button>
          )}
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
                  <th className="px-6 py-4">RFC</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-right">Saldo Deudor</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-all group">
                     <td className="px-6 py-4">
                        <p className="text-sm font-bold text-on-surface uppercase">{c.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{c.phone}</p>
                        {c.email && <p className="text-[10px] text-slate-500">{c.email}</p>}
                        {c.address && <p className="text-[10px] text-slate-500 truncate">{c.address}</p>}
                     </td>
                     <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {c.rfc || '-'}
                     </td>
                     <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${c.type === 'Commercial' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-500'}`}>{c.type}</span>
                     </td>
                     <td className="px-6 py-4 text-right font-headline font-black text-sm">
                        <span className={c.balance > 0 ? 'text-error animate-pulse' : 'text-emerald-400'}>${parseFloat(c.balance).toFixed(2)}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <button onClick={() => openEditModal(c)} className="w-8 h-8 rounded-lg border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary/50 transition-all">
                              <Edit className="w-4 h-4" />
                           </button>
                           <a href={`https://wa.me/52${c.phone}`} target="_blank" className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 mx-auto transition-all">
                              <Phone className="w-4 h-4" />
                           </a>
                        </div>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>

         {/* Mobile view */}
         <div className="md:hidden divide-y divide-white/5">
            {filtered.map(c => (
               <div key={c.id} className="p-4 flex justify-between items-center">
                  <div className="min-w-0 flex-1">
                     <p className="text-xs font-bold text-on-surface uppercase truncate">{c.name}</p>
                     <p className="text-[9px] text-slate-500 font-mono italic">{c.phone}</p>
                     {c.email && <p className="text-[9px] text-slate-500">{c.email}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openEditModal(c)} className="w-8 h-8 rounded-lg border border-white/5 flex items-center justify-center text-slate-500">
                        <Edit className="w-4 h-4" />
                     </button>
                     <span className={`text-xs font-black ${c.balance > 0 ? 'text-error' : 'text-emerald-400'}`}>${parseFloat(c.balance).toFixed(0)}</span>
                     <a href={`https://wa.me/52${c.phone}`} target="_blank" className="w-8 h-8 bg-emerald-400/10 rounded-xl flex items-center justify-center text-emerald-400">
                        <Phone className="w-4 h-4" />
                     </a>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}

export default CRM