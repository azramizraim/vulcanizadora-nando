import React, { useState, useEffect } from 'react'
import { fetchData, postData, updateData, deleteData } from '../services/api'
import { Plus, Trash2, Search, X, CheckCircle, Clock, XCircle, FileText, Printer, Eye } from 'lucide-react'
import { LoadingTire } from './LoadingTire'

function Quotes({ activeBranch, isAdmin, isVendedor }) {
  const canEdit = isAdmin && !isVendedor
  const [quotes, setQuotes] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [inventory, setInventory] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const [newQuote, setNewQuote] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    items: [],
    notes: '',
    status: 'pendiente'
  })
  const [lineItem, setLineItem] = useState({ name: '', qty: 1, price: 0, type: 'product' })

  const STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400' },
    { value: 'aprobada', label: 'Aprobada', color: 'bg-emerald-500/20 text-emerald-400' },
    { value: 'rechazada', label: 'Rechazada', color: 'bg-red-500/20 text-red-400' }
  ]

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        setLoading(true)
        const [q, c, inv] = await Promise.all([
          fetchData('Cotizaciones', activeBranch),
          fetchData('Clientes', activeBranch),
          fetchData('Inventario', activeBranch)
        ])
        if (active) {
          setQuotes(Array.isArray(q) ? q.filter(c => c.status !== 'completada') : [])
          setClients(Array.isArray(c) ? c : [])
          setInventory(Array.isArray(inv) ? inv : [])
        }
      } catch (e) { console.error(e) }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [activeBranch])

  const selectClient = (client) => {
    setNewQuote({ ...newQuote, customerId: client.id, customerName: client.name, customerPhone: client.phone })
    setShowClientPicker(false)
    setClientSearch('')
  }

  const getMeta = (quote) => (quote.items || []).find(i => i._meta) || {}

  const handleAddQuote = async () => {
    if (!newQuote.customerName || newQuote.items.length === 0) return alert('Completa todos los campos')
    setIsSaving(true)
    try {
      const total = newQuote.items.reduce((a, i) => a + i.qty * i.price, 0)
      const res = await postData('Cotizaciones', { 
        items: [
          ...newQuote.items,
          { _meta: true, customerName: newQuote.customerName, customerPhone: newQuote.customerPhone, notes: newQuote.notes }
        ],
        total, 
        branch: activeBranch,
        status: newQuote.status
      })
      if (res.success) {
        setShowAddModal(false)
        setNewQuote({ customerId: '', customerName: '', customerPhone: '', items: [], notes: '', status: 'pendiente' })
        const q = await fetchData('Cotizaciones', activeBranch)
        setQuotes(Array.isArray(q) ? q : [])
      }
    } catch (e) { alert('Error') }
    finally { setIsSaving(false) }
  }

  const handleUpdateStatus = async (quoteId, newStatus) => {
    try {
      await updateData('Cotizaciones', quoteId, { status: newStatus })
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q))
      if (selectedQuote && selectedQuote.id === quoteId) setSelectedQuote(prev => ({ ...prev, status: newStatus }))
    } catch (e) { alert('Error al actualizar') }
  }

  const handleDeleteQuote = async (quoteId) => {
    if (!confirm('¿Eliminar esta cotización?')) return
    try {
      await deleteData('Cotizaciones', quoteId)
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
      if (selectedQuote && selectedQuote.id === quoteId) setSelectedQuote(null)
      setShowDetailModal(false)
    } catch (e) { alert('Error al eliminar') }
  }

  const addLineItem = () => {
    if (!lineItem.name || !lineItem.price) return
    setNewQuote(prev => ({ ...prev, items: [...prev.items, { ...lineItem, id: Date.now().toString() }] }))
    setLineItem({ name: '', qty: 1, price: 0, type: 'product' })
  }

  const addFromInv = (p) => {
    setNewQuote(prev => ({ ...prev, items: [...prev.items, { name: p.name, qty: 1, price: p.price, sku: p.sku, id: Date.now().toString() }] }))
    setShowProductPicker(false)
  }

  const removeLineItem = (itemId) => {
    setNewQuote(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }))
  }

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  )

  const filteredQuotes = quotes.filter(q => 
    (getMeta(q).customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const printTicket = (quote) => {
    const printWindow = window.open('', '_blank')
    const items = quote.items || []
    const subtotal = (quote.total || 0) / 1.08
    const iva = (quote.total || 0) * 0.08 / 1.08
    const total = quote.total || 0
    const dateStr = new Date(quote.created_at || Date.now()).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    const folio = (quote.id || '').slice(0, 8).toUpperCase()

    const itemsList = items.filter(i => !i._meta)
    const itemsHtml = itemsList.map((item, i) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #000; font-size: 10pt;">${item.name}${item.sku ? '<br/><span style="font-size:8pt;color:#666;">'+item.sku+'</span>' : ''}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: center; font-size: 10pt;">${item.qty}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: right; font-size: 10pt;">$${item.price.toFixed(2)}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: right; font-size: 10pt;">$${(item.qty * item.price).toFixed(2)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>COTIZACIÓN</title>
  <style>
    @page { size: letter; margin: 2.5cm 3cm 2.5cm 3cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .header-left img { height: 65px; }
    .header-left .company h1 { font-size: 18pt; font-weight: bold; text-transform: uppercase; letter-spacing: -0.5px; }
    .header-left .company p { font-size: 8pt; color: #444; margin-top: 2px; }
    .header-right { text-align: right; font-size: 9pt; }
    .header-right .folio { font-weight: bold; font-size: 11pt; margin-bottom: 3px; }
    .divider { border: none; border-top: 2px solid #000; margin: 10px 0; }
    .title-section { text-align: center; margin: 15px 0 25px 0; }
    .title-section h2 { font-size: 16pt; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; }
    .title-section p { font-size: 9pt; color: #555; margin-top: 3px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
    .info-table td { padding: 3px 0; font-size: 10pt; }
    .info-table td:first-child { width: 100px; font-weight: bold; }
    .info-table td.label-cell { font-weight: bold; width: auto; padding-right: 12px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #e0e0e0; padding: 7px 8px; border: 1px solid #000; font-size: 9pt; font-weight: bold; text-transform: uppercase; }
    .items-table td { padding: 6px 8px; border: 1px solid #000; font-size: 10pt; }
    .totals { margin-top: 5px; margin-left: auto; width: 280px; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals td { padding: 4px 10px; font-size: 10pt; text-align: right; }
    .totals td:first-child { font-weight: bold; text-align: right; width: 50%; }
    .totals .total-row td { font-size: 13pt; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; }
    .notes { margin-top: 20px; font-size: 9pt; color: #444; font-style: italic; }
    .footer { position: fixed; bottom: 2.5cm; left: 3cm; right: 3cm; text-align: center; }
    .footer .validity { font-size: 9pt; color: #666; margin-bottom: 30px; }
    .footer .signature { margin-top: 10px; }
    .footer .signature p { font-size: 9pt; }
    .footer .signature .name { font-weight: bold; font-size: 10pt; margin-top: 5px; }
    .footer .signature .title { font-size: 8pt; color: #666; }
    .footer .signature-line { border-top: 1px solid #000; width: 250px; margin: 30px auto 8px auto; }
    .status-badge { display: inline-block; padding: 3px 12px; border: 1px solid #000; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${window.location.origin}/images/logo_nando.jpg" alt="Vulcanizadora Nando" />
      <div class="company">
        <h1>VULCANIZADORA NANDO</h1>
        <p>Calle Benito Juárez #185, Col. Centro, Chetumal, Q. Roo</p>
        <p>Tel: 983 832 1234 | vulcanizadoranando@email.com</p>
      </div>
    </div>
    <div class="header-right">
      <div class="folio">FOLIO: ${folio}</div>
      <p>Chetumal, Quintana Roo a ${dateStr}</p>
    </div>
  </div>

  <hr class="divider" />

  <div class="title-section">
    <h2>COTIZACIÓN</h2>
    <p>Documento de cotización de servicios y productos</p>
  </div>

  <table class="info-table">
    <tr>
      <td class="label-cell">CLIENTE:</td>
      <td>${getMeta(quote).customerName}</td>
    </tr>
    <tr>
      <td class="label-cell">TELÉFONO:</td>
      <td>${getMeta(quote).customerPhone || 'N/A'}</td>
    </tr>
  </table>
  ${getMeta(quote).notes ? `<div class="notes">Nota: ${getMeta(quote).notes}</div>` : ''}

  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:left;">Descripción</th>
        <th style="width:60px;">Cant.</th>
        <th style="width:90px;">P. Unitario</th>
        <th style="width:100px;">Importe</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal:</td>
        <td>$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>IVA (8%):</td>
        <td>$${iva.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL:</td>
        <td>$${total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <div class="validity">Esta cotización tiene validez de 30 días a partir de su emisión.</div>
    <div class="status-badge">${(quote.status || 'pendiente').toUpperCase()}</div>
    <div class="signature">
      <div class="signature-line"></div>
      <p class="name">FERNANDO MARTINEZ MORALES</p>
      <p class="title">ELABORÓ</p>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (loading) return <div className="p-20 flex justify-center"><LoadingTire size="lg" /></div>

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-primary font-black uppercase text-xs tracking-widest">Nueva Cotización</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase font-black">Cliente</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <button 
                    onClick={() => setShowClientPicker(!showClientPicker)}
                    className="input-industrial py-3 text-xs w-full text-left flex justify-between items-center"
                  >
                    <span>{newQuote.customerName || 'Seleccionar cliente...'}</span>
                    <Search className="w-4 h-4" />
                  </button>
                  {showClientPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-high border border-white/10 rounded-lg max-h-48 overflow-y-auto z-10">
                      <input 
                        className="w-full p-2 text-xs bg-transparent border-b border-white/10" 
                        placeholder="Buscar cliente..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                      {filteredClients.length === 0 ? (
                        <p className="p-4 text-xs text-slate-500">No hay clientes</p>
                      ) : (
                        filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => selectClient(c)}
                            className="p-3 cursor-pointer hover:bg-white/5 border-b border-white/5"
                          >
                            <p className="text-xs font-bold">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.phone}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <input 
                className="input-industrial py-3 text-xs" 
                placeholder="Teléfono (opcional)" 
                value={newQuote.customerPhone} 
                onChange={e => setNewQuote({ ...newQuote, customerPhone: e.target.value })} 
              />
            </div>

            {/* Products */}
            <div className="space-y-2">
              <button onClick={() => setShowProductPicker(!showProductPicker)} className="text-xs text-primary">+ Agregar producto</button>
              {showProductPicker && (
                <div className="surface-workbench p-2 rounded max-h-32 overflow-y-auto">
                  {inventory.length === 0 ? <div className="text-xs text-slate-500">Sin inventario</div> : 
                    inventory.map(p => <div key={p.id} onClick={() => addFromInv(p)} className="py-1 cursor-pointer text-xs hover:bg-white/5">{p.name} - ${p.price}</div>)
                  }
                </div>
              )}
              <div className="flex gap-2">
                <input className="input-industrial flex-1 py-2 text-xs" placeholder="Servicio" value={lineItem.name} onChange={e => setLineItem({ ...lineItem, name: e.target.value })} />
                <input type="number" className="input-industrial w-16 py-2 text-xs" placeholder="Cant" value={lineItem.qty} onChange={e => setLineItem({ ...lineItem, qty: parseInt(e.target.value) || 1 })} />
                <input type="number" className="input-industrial w-20 py-2 text-xs" placeholder="$" value={lineItem.price} onChange={e => setLineItem({ ...lineItem, price: parseFloat(e.target.value) || 0 })} />
                <button onClick={addLineItem} className="btn-primary px-3"><Plus className="w-4 h-4" /></button>
              </div>
              {newQuote.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs bg-surface-container-low p-2 rounded">
                  <span>{item.name} x{item.qty}</span>
                  <span className="text-primary">${(item.qty * item.price).toFixed(2)}</span>
                  <button onClick={() => removeLineItem(item.id)} className="text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>

            <textarea 
              className="input-industrial py-3 text-xs w-full h-20 resize-none" 
              placeholder="Notas..." 
              value={newQuote.notes} 
              onChange={e => setNewQuote({ ...newQuote, notes: e.target.value })} 
            />

            <div className="text-right text-lg font-black text-primary">
              Total: ${newQuote.items.reduce((a, i) => a + i.qty * i.price, 0).toFixed(2)}
            </div>

            <button onClick={handleAddQuote} disabled={isSaving} className="w-full btn-primary py-4 text-xs font-black uppercase">
              {isSaving ? 'Guardando...' : 'Crear Cotización'}
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 border border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-primary font-black uppercase text-xs tracking-widest">Detalle Cotización</h3>
              <button onClick={() => setShowDetailModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Cliente</p>
                <p className="text-lg font-bold">{getMeta(selectedQuote).customerName}</p>
                <p className="text-sm text-slate-500">{getMeta(selectedQuote).customerPhone}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase">Estado</p>
                <select 
                  value={selectedQuote.status} 
                  onChange={e => handleUpdateStatus(selectedQuote.id, e.target.value)}
                  className="input-industrial py-2 text-xs"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="surface-workbench rounded-xl border border-white/5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500">
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-center">Cant</th>
                      <th className="px-3 py-2 text-right">P.U.</th>
                      <th className="px-3 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(selectedQuote.items || []).filter(i => !i._meta).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2 text-center">{item.qty}</td>
                        <td className="px-3 py-2 text-right">${item.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold">${(item.qty * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10">
                      <td colSpan="3" className="px-3 py-2 text-right">TOTAL</td>
                      <td className="px-3 py-2 text-right text-primary font-black">${(selectedQuote.total || 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {getMeta(selectedQuote).notes && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Notas</p>
                  <p className="text-sm">{getMeta(selectedQuote).notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <button onClick={() => printTicket(selectedQuote)} className="btn-primary flex-1 py-3 text-xs font-black uppercase flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                {isAdmin && (
                  <button onClick={() => handleDeleteQuote(selectedQuote.id)} className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-headline font-black text-on-surface uppercase">Cotizaciones</h2>
          <p className="text-slate-400 text-[10px] uppercase font-black">Sucursal <span className="text-primary">{activeBranch}</span></p>
        </div>
        {canEdit && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-4 py-2 text-xs font-black uppercase flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva
          </button>
        )}
      </header>

      {/* Quote List */}
      <div className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No hay cotizaciones</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredQuotes.map(q => {
                const statusObj = STATUS_OPTIONS.find(s => s.value === q.status) || STATUS_OPTIONS[0]
                return (
                  <tr key={q.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{getMeta(q).customerName}</p>
                      <p className="text-[10px] text-slate-500">{getMeta(q).customerPhone}</p>
                    </td>
                    <td className="px-6 py-4 text-xs">{(q.items || []).filter(i => !i._meta).length}</td>
                    <td className="px-6 py-4 text-primary font-bold">${(q.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        value={q.status} 
                        onChange={e => handleUpdateStatus(q.id, e.target.value)}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded border-0 cursor-pointer ${statusObj.color}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setSelectedQuote(q); setShowDetailModal(true) }}
                        className="text-primary hover:text-white p-2"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Quotes