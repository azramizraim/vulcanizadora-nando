import React, { useState, useEffect } from 'react'
import { fetchData, postData, updateStock } from '../services/api'

const servicesList = [
  { id: 'S1', name: 'Reparación de Llanta', price: 150, isService: true, img: 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png' },
  { id: 'S2', name: 'Balanceo', price: 100, isService: true, img: 'https://cdn-icons-png.flaticon.com/512/575/575308.png' },
  { id: 'S3', name: 'Parche Frío', price: 80, isService: true, img: 'https://cdn-icons-png.flaticon.com/512/3067/3067451.png' },
]

function POS({ activeBranch }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('LLANTAS')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [selectedClient, setSelectedClient] = useState('Público General')
  const [processing, setProcessing] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [clients, setClients] = useState([])
  const [includeIva, setIncludeIva] = useState(true)

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        const [invData, clientData] = await Promise.all([
          fetchData('Inventario', activeBranch),
          fetchData('Clientes', activeBranch)
        ])
        if (active) {
          setProducts(Array.isArray(invData) ? invData : [])
          setClients(Array.isArray(clientData) ? clientData : [])
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
    return () => { active = false }
  }, [activeBranch])

  const addToCart = (product) => {
    const existing = cart.find(item => (item.id === product.id || item.sku === product.sku))
    if (existing) {
      setCart(cart.map(item => (item.id === product.id || item.sku === product.sku) ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { ...product, qty: 1 }])
    }
  }

  const removeFromCart = (product) => {
    const existing = cart.find(item => (item.id === product.id || item.sku === product.sku))
    if (existing && existing.qty > 1) {
      setCart(cart.map(item => (item.id === product.id || item.sku === product.sku) ? { ...item, qty: item.qty - 1 } : item))
    } else {
      setCart(cart.filter(item => (item.id !== product.id && item.sku !== product.sku)))
    }
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setProcessing(true)
    
    const saleId = `#VN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    const date = new Date().toLocaleString('es-MX')

    const subTotal = cart.reduce((acc, curr) => acc + (parseFloat(curr.price) * curr.qty), 0)
    const tax = includeIva ? subTotal * 0.16 : 0
    const total = subTotal + tax

    const saleData = {
      orderId: saleId,
      client: selectedClient,
      total: parseFloat(total.toFixed(2)),
      subtotal: parseFloat(subTotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      date,
      timestamp: new Date().getTime(),
      itemsSummary: cart.map(c => `${c.qty}x ${c.name}`).join(', '),
      itemsList: cart.map(c => ({
        id: c.id || c.sku,
        name: c.name,
        price: parseFloat(c.price),
        qty: c.qty,
        isService: !!c.isService
      })),
      paymentMethod,
      branch: activeBranch
    }

    try {
      const result = await postData('Ventas', saleData)
      if (result.success) {
        for (const item of cart) {
          if (!item.isService) {
              await updateStock(item.id, item.qty)
          }
        }
        setTicket(saleData)
        setCart([])
        const inv = await fetchData('Inventario', activeBranch)
        if (Array.isArray(inv)) setProducts(inv)
      } else {
        alert('Error al guardar la venta')
      }
    } catch (err) {
      alert('Error en el checkout')
    } finally {
      setProcessing(false)
    }
  }

  const subtotal = cart.reduce((acc, curr) => acc + (parseFloat(curr.price) * curr.qty), 0)
  const iva = includeIva ? subtotal * 0.16 : 0
  const total = subtotal + iva

  const viewItems = activeTab === 'LLANTAS' ? products : servicesList;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      
      {/* Sección principal de productos */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
          <header className="p-4 bg-surface-container-high/80 backdrop-blur-md border-b border-white/5 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex bg-background/60 p-1 rounded-xl border border-white/10">
                    {['LLANTAS', 'SERVICIOS'].map(tab => (
                        <button 
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 px-5 py-2 rounded-lg text-[11px] font-bold tracking-wider transition-all ${activeTab === tab ? 'bg-primary text-background shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {tab}
                        </button>
                    ))}
                  </div>
                  <div className="relative flex-1 max-w-md w-full">
                     <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                     <input 
                       className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                       placeholder="Buscar medida o servicio..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
             <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                 {viewItems.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((p) => {
                     const isLow = !p.isService && parseInt(p.qty) < 5;
                     return (
                        <div 
                          key={p.id || p.sku} 
                          onClick={() => addToCart(p)} 
                          className="group bg-surface-container-low rounded-2xl border border-white/5 hover:border-primary/40 hover:bg-surface-container-low/80 transition-all cursor-pointer active:scale-[0.98] overflow-hidden"
                        >
                           <div className="aspect-square bg-gradient-to-b from-background/30 to-background/10 p-4 flex items-center justify-center">
                              {p.img ? (
                                <img src={p.img} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                              ) : (
                                <span className="material-symbols-outlined text-5xl text-slate-600">tire_repair</span>
                              )}
                           </div>
                           <div className="p-3">
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{p.brand || 'V-NANDO'}</p>
                              <h4 className="text-xs font-bold text-slate-100 uppercase truncate mb-2 leading-tight">{p.name}</h4>
                              <div className="flex justify-between items-center">
                                 <span className="text-lg font-black text-primary">${parseFloat(p.price).toFixed(0)}</span>
                                 {!p.isService && (
                                   <span className={`text-[8px] px-2 py-1 rounded-full font-bold ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                     {p.qty}
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>
                     )
                 })}
             </div>
          </div>
      </div>

      {/* Lado derecho: Carrito de Compras */}
      <aside className="w-full lg:w-96 flex flex-col bg-surface-container-lowest border-t lg:border-t-0 lg:border-l border-white/10 shrink-0">
          <div className="p-4 bg-gradient-to-r from-primary to-primary/80 text-background font-bold uppercase text-xs tracking-widest flex items-center justify-between shadow-lg">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                Orden Actual
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px]">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-surface-container-low/50 p-3 rounded-xl border border-white/5 animate-in slide-in-from-right-2 duration-200">
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500">${parseFloat(item.price).toFixed(2)} × {item.qty}</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item)} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="text-xs font-bold w-5 text-center text-slate-200">{item.qty}</span>
                        <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all">
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                     </div>
                  </div>
              ))}
              {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                     <span className="material-symbols-outlined text-5xl">shopping_cart</span>
                     <p className="uppercase font-bold text-[10px] tracking-widest mt-3">Sin productos</p>
                  </div>
              )}
          </div>

          <div className="p-4 bg-surface-container-high border-t border-white/10 space-y-3">
             {/* Selector IVA */}
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">IVA</span>
                <div className="flex bg-background/30 rounded-lg p-1 gap-1">
                  <button 
                    onClick={() => setIncludeIva(false)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${!includeIva ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Sin
                  </button>
                  <button 
                    onClick={() => setIncludeIva(true)}
                    className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${includeIva ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Con
                  </button>
                </div>
             </div>
             
             {/* Totales */}
             <div className="space-y-1 bg-surface-container-low/50 p-3 rounded-xl">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {includeIva && (
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                    <span>IVA (16%)</span>
                    <span>${iva.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black text-slate-100 pt-2 border-t border-white/5">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
             </div>

             {/* Métodos de pago */}
             <div className="grid grid-cols-4 gap-2">
                {[
                  { method: 'Efectivo', icon: 'payments' },
                  { method: 'Tarjeta', icon: 'credit_card' },
                  { method: 'Transfer', icon: 'send' },
                  { method: 'Crédito', icon: 'account_balance' }
                ].map(({ method, icon }) => (
                   <button 
                     key={method}
                     onClick={() => setPaymentMethod(method)} 
                     className={`py-2.5 px-1 rounded-xl border text-[8px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${paymentMethod === method ? 'bg-primary border-primary text-background' : 'border-white/10 text-slate-500 hover:border-white/30 hover:text-slate-300'}`}
                   >
                     <span className="material-symbols-outlined text-sm">{icon}</span>
                     {method}
                   </button>
                ))}
             </div>

             <button 
               onClick={handleCheckout} 
               disabled={processing || cart.length === 0}
               className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-background font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {processing ? (
                 <>
                   <span className="animate-spin material-symbols-outlined">sync</span>
                   Procesando...
                 </>
               ) : (
                 <>
                   <span className="material-symbols-outlined">check_circle</span>
                   Cobrar
                 </>
               )}
             </button>
          </div>
      </aside>

      {/* Ticket Modal */}
      {ticket && (
         <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md p-4">
             <div className="bg-white text-black max-w-sm w-full rounded-2xl p-6 shadow-2xl">
                <div className="text-center mb-4 border-b border-dashed border-slate-300 pb-4">
                   <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden border-2 border-slate-200">
                     <img src="https://raw.githubusercontent.com/mizraimmartinez/vulcanizadora-nando/main/Biblioteca/logo_nando.jpg" alt="Nando" className="w-full h-full object-cover" />
                   </div>
                   <h1 className="font-black text-lg">VULCANIZADORA NANDO</h1>
                   <p className="text-[10px] uppercase font-bold text-slate-500">{activeBranch}</p>
                </div>
                <div className="border-b border-dashed border-slate-300 py-3 mb-4 space-y-1 text-[10px]">
                   <div className="flex justify-between"><span>Folio:</span><span className="font-bold">{ticket.orderId}</span></div>
                   <div className="flex justify-between"><span>Fecha:</span><span>{ticket.date}</span></div>
                   <div className="flex justify-between"><span>Método:</span><span className="font-bold">{ticket.paymentMethod}</span></div>
                </div>
                <div className="space-y-2 mb-4">
                   {ticket.itemsList.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs font-medium">
                         <span>{item.qty}× {item.name}</span>
                         <span>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                   ))}
                </div>
                {ticket.tax > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2 mb-2">
                    <span>IVA (16%)</span><span>${ticket.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black border-t-2 border-black pt-3">
                    <span>TOTAL</span>
                    <span>${ticket.total.toFixed(2)}</span>
                </div>
                <div className="mt-6 text-center text-[10px] text-slate-400">¡Gracias por su preferencia!</div>
                <button onClick={() => setTicket(null)} className="mt-4 w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest rounded-xl">Cerrar</button>
             </div>
         </div>
      )}
    </div>
  )
}

export default POS