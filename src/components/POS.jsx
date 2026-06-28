import React, { useState, useEffect } from 'react'
import { fetchData, postData, updateStock } from '../services/api'

function POS({ activeBranch, isAdmin, isVendedor }) {
  const [products, setProducts] = useState([])
  const [services, setServices] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('LLANTAS')
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [selectedClient, setSelectedClient] = useState('Público General')
  const [processing, setProcessing] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [clients, setClients] = useState([])
  const [includeIva, setIncludeIva] = useState(true)
  const [includeIsr, setIncludeIsr] = useState(false)
  const [conditionFilter, setConditionFilter] = useState('todas')
  
  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        const [invData, clientData, servicesData] = await Promise.all([
          fetchData('Inventario', activeBranch),
          fetchData('Clientes', activeBranch),
          fetchData('Servicios', activeBranch)
        ])
        if (active) {
          setProducts(Array.isArray(invData) ? invData.filter(p => p.active ?? true) : [])
          setClients(Array.isArray(clientData) ? clientData : [])
          setServices(Array.isArray(servicesData) ? servicesData : [])
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
    return () => { active = false }
  }, [activeBranch])

  const addToCart = (product) => {
    const isService = !!product.isService
    const original = products.find(p => (p.id === product.id || p.sku === product.sku))
    const availableStock = isService ? Infinity : parseInt(original?.qty || product.qty || 0)
    if (!isService && availableStock <= 0) return
    const existing = cart.find(item => (item.id === product.id || item.sku === product.sku))
    const currentQty = existing ? existing.qty : 0
    if (!isService && currentQty >= availableStock) return
    if (existing) {
      setCart(cart.map(item => (item.id === product.id || item.sku === product.sku) ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCart([...cart, { ...product, qty: 1, discount: 0 }])
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

  const updateDiscount = (productId, value) => {
    const price = cart.find(item => (item.id === productId || item.sku === productId))?.price || 0
    const discount = Math.min(Math.max(0, parseInt(value) || 0), Math.floor(price))
    setCart(cart.map(item => (item.id === productId || item.sku === productId) ? { ...item, discount } : item))
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setProcessing(true)
    
    const saleId = `#VN-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    const date = new Date().toLocaleString('es-MX')
    
    const subTotal = cart.reduce((acc, curr) => {
      const price = parseFloat(curr.price)
      const discount = curr.discount || 0
      const discountedPrice = price - discount
      return acc + (discountedPrice * curr.qty)
    }, 0)
    const tax = includeIva ? subTotal * 0.08 : 0
    const isr = includeIsr ? subTotal * 0.0125 : 0
    const total = subTotal + tax - isr

    const saleData = {
      orderId: saleId,
      client: selectedClient,
      total: parseFloat(total.toFixed(2)),
      subtotal: parseFloat(subTotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      isr: parseFloat(isr.toFixed(2)),
      date,
      timestamp: new Date().getTime(),
      itemsSummary: cart.map(c => `${c.qty}x ${c.name}`).join(', '),
          itemsList: cart.map(c => ({
            id: c.id || c.sku,
            name: c.name,
            price: parseFloat(c.price),
            discount: c.discount || 0,
            discountedPrice: parseFloat(c.price) - (c.discount || 0),
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
        if (Array.isArray(inv)) setProducts(inv.filter(p => p.active ?? true))
      } else {
        alert('Error al guardar la venta')
      }
    } catch (err) {
      alert('Error en el checkout')
    } finally {
      setProcessing(false)
    }
  }

  const subtotal = cart.reduce((acc, curr) => {
    const price = parseFloat(curr.price)
    const discount = curr.discount || 0
    const discountedPrice = price - discount
    return acc + (discountedPrice * curr.qty)
  }, 0)
  const originalTotal = cart.reduce((acc, curr) => acc + (parseFloat(curr.price) * curr.qty), 0)
  const totalDiscount = originalTotal - subtotal
  const iva = includeIva ? subtotal * 0.08 : 0
  const isr = includeIsr ? subtotal * 0.0125 : 0
  const total = subtotal + iva - isr

  const viewItems = [...products, ...services.map(s => ({ ...s, isService: true }))]
  const filteredItems = viewItems.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (activeTab === 'SERVICIOS') return p.isService
    if (activeTab === 'LLANTAS' && p.isService) return false
    if (conditionFilter === 'todas') return true
    const isUsed = (p.condicion || '').toLowerCase() === 'medio_uso'
    return conditionFilter === 'nuevas' ? !isUsed : isUsed
  })

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      
      {/* Sección principal de productos */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10">
          <header className="p-4 bg-surface-container-high/80 backdrop-blur-md border-b border-white/5 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex bg-background/60 p-0.5 rounded-lg border border-white/5">
                  {[
                    { key: 'LLANTAS', label: 'Llantas' },
                    { key: 'SERVICIOS', label: 'Servicios' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.key ? 'bg-primary text-background shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeTab === 'LLANTAS' && (
                  <div className="flex bg-background/60 p-0.5 rounded-lg border border-white/5">
                    {[
                      { key: 'todas', label: 'Todas' },
                      { key: 'nuevas', label: 'Nuevas' },
                      { key: 'uso', label: 'Medio Uso' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setConditionFilter(opt.key)}
                        className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${conditionFilter === opt.key ? 'bg-primary text-background shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
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
                   {filteredItems.map((p) => {
                       const stock = parseInt(p.qty) || 0
                       const isService = !!p.isService
                       const isLow = !isService && stock < 5
                       const outOfStock = !isService && stock <= 0
                       const inCart = cart.find(item => (item.id === p.id || item.sku === p.sku))
                       const cartQty = inCart ? inCart.qty : 0
                       const maxedOut = !isService && cartQty >= stock
                       return (
                          <div 
                            key={p.id || p.sku} 
                            onClick={() => !outOfStock && !maxedOut && addToCart(p)} 
                            className={`group bg-surface-container-low rounded-2xl border transition-all overflow-hidden ${outOfStock || maxedOut ? 'border-slate-800/50 opacity-50 cursor-not-allowed' : 'border-white/5 hover:border-primary/40 hover:bg-surface-container-low/80 cursor-pointer active:scale-[0.98]'}`}
                          >
                               <div className="aspect-square bg-surface-container-low p-4 flex items-center justify-center relative">
                                  {p.img ? (
                                    <img src={p.img} className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                                  ) : (
                                    <span className="material-symbols-outlined text-5xl text-slate-600">{isService ? 'build' : 'tire_repair'}</span>
                                  )}
                                  {isService && (
                                    <span className="absolute top-2 right-2 bg-primary/20 text-primary text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full border border-primary/30">Servicio</span>
                                  )}
                               </div>
                               <div className="p-3">
                                  <div className="flex justify-between items-start mb-1">
                                     <div className="flex-1 min-w-0">
                                         <p className="text-[11px] font-black text-primary uppercase tracking-wide truncate">{p.brand || (isService ? 'SERVICIO' : 'V-NANDO')}</p>
                                         <p className="text-[9px] text-slate-400 font-bold uppercase truncate mb-2 leading-tight">{p.name}</p>
                                     </div>
                                  </div>
                                  <div className="flex justify-between items-center">
                                     <span className="text-lg font-black text-primary">${parseFloat(p.price).toFixed(0)}</span>
                                     {!isService && (
                                       outOfStock ? (
                                         <span className="text-[8px] px-2 py-1 rounded-full font-bold bg-slate-700/50 text-slate-500">Sin stock</span>
                                       ) : (
                                         <span className={`text-[8px] px-2 py-1 rounded-full font-bold ${isLow ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                           {stock - cartQty}
                                         </span>
                                       )
                                     )}
                                  </div>
                                 {maxedOut && (
                                   <p className="text-[7px] text-slate-500 text-center mt-1 uppercase font-bold">Límite alcanzado</p>
                                 )}
                              </div>
                         </div>
                      )
                  })}
             </div>
          </div>
      </div>

      {/* Lado derecho: Carrito de Compras */}
      <aside className="w-full lg:w-96 flex flex-col bg-surface-container-lowest border-t lg:border-t-0 lg:border-l border-white/10 shrink-0">
          <div className="p-4 bg-primary text-on-primary font-bold uppercase text-xs tracking-widest flex items-center justify-between shadow-lg">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                Orden Actual
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-[10px]">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => {
                const itemPrice = parseFloat(item.price)
                const discount = item.discount || 0
                const discountedPrice = itemPrice - discount
                const lineTotal = discountedPrice * item.qty
                const hasDiscount = discount > 0
                const isService = !!item.isService
                const original = products.find(p => (p.id === item.id || p.sku === item.sku))
                const availableStock = isService ? Infinity : parseInt(original?.qty || 0)
                const maxedOut = !isService && item.qty >= availableStock
                
                return (
                  <div key={idx} className="flex gap-1.5 items-center bg-surface-container-low/50 p-2.5 rounded-xl border border-white/5 animate-in slide-in-from-right-2 duration-200">
                     <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate leading-tight">{item.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          ${itemPrice.toFixed(0)} × {item.qty}
                          {hasDiscount && <span className="text-green-400 font-bold ml-1">(-${discount})</span>}
                          {!isService && <span className="text-slate-600 ml-1">(stock: {availableStock})</span>}
                        </p>
                     </div>
                     <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={discount || ''}
                          onChange={(e) => updateDiscount(item.id || item.sku, e.target.value)}
                          placeholder="$"
                          className="w-12 h-6 bg-background/60 border border-white/10 rounded-lg text-[9px] text-center font-bold text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                     </div>
                     <div className="flex items-center gap-1">
                        <button onClick={() => removeFromCart(item)} className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <span className="material-symbols-outlined text-xs">remove</span>
                        </button>
                        <span className="text-[11px] font-bold w-4 text-center text-slate-200">{item.qty}</span>
                        <button onClick={() => addToCart(item)} disabled={maxedOut} className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${maxedOut ? 'bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed' : 'bg-white/5 border-white/10 text-slate-400 hover:text-primary hover:bg-primary/10'}`}>
                          <span className="material-symbols-outlined text-xs">add</span>
                        </button>
                     </div>
                     <div className="text-right min-w-[50px]">
                        <span className={`text-xs font-black ${hasDiscount ? 'text-green-400' : 'text-slate-100'}`}>
                          ${lineTotal.toFixed(0)}
                        </span>
                     </div>
                  </div>
                )
              })}
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
              {/* Selector ISR */}
              <div className="flex items-center justify-between">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ISR</span>
                 <div className="flex bg-background/30 rounded-lg p-1 gap-1">
                   <button 
                     onClick={() => setIncludeIsr(false)}
                     className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${!includeIsr ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     Sin
                   </button>
                   <button 
                     onClick={() => setIncludeIsr(true)}
                     className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${includeIsr ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
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
                 {totalDiscount > 0 && (
                   <div className="flex justify-between text-[10px] text-green-400 font-bold">
                     <span>Descuento</span>
                     <span>-${totalDiscount.toFixed(2)}</span>
                   </div>
                 )}
                 {includeIva && (
                   <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>IVA (8%)</span>
                      <span>${iva.toFixed(2)}</span>
                   </div>
                 )}
                 {includeIsr && (
                   <div className="flex justify-between text-[10px] text-red-400 font-medium">
                      <span>ISR (1.25%)</span>
                      <span>-${isr.toFixed(2)}</span>
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
                  { method: 'Transferencia', icon: 'send' },
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

             {isAdmin && (
              <button 
                onClick={handleCheckout} 
                disabled={processing || cart.length === 0}
                className="w-full py-3.5 bg-primary text-on-primary font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
             )}
          </div>
      </aside>

      {/* Ticket Modal */}
      {ticket && (
         <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-md p-4">
             <div className="bg-surface text-on-surface max-w-sm w-full rounded-2xl p-6 shadow-2xl">
                <div className="text-center mb-4 border-b border-dashed border-white/10 pb-4">
                   <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden border-2 border-white/10">
                       <img src="/images/logo_nando.jpg" alt="Nando" className="w-full h-full object-contain" />
                   </div>
                   <h1 className="font-bold text-on-surface text-lg">VULCANIZADORA NANDO</h1>
                   <p className="text-[10px] uppercase font-bold text-on-surface/60">{activeBranch}</p>
                </div>
                <div className="border-b border-dashed border-white/10 py-3 mb-4 space-y-1 text-[10px] text-on-surface/60">
                   <div className="flex justify-between"><span>Folio:</span><span className="font-bold">{ticket.orderId}</span></div>
                   <div className="flex justify-between"><span>Fecha:</span><span>{ticket.date}</span></div>
                   <div className="flex justify-between"><span>Método:</span><span className="font-bold">{ticket.paymentMethod}</span></div>
                </div>
                 <div className="space-y-2 mb-4">
                    {ticket.itemsList.map((item, i) => (
                       <div key={i}>
                          <div className="flex justify-between text-xs font-medium">
                             <span>{item.qty}× {item.name}</span>
                             <span>${((item.discountedPrice || item.price) * item.qty).toFixed(2)}</span>
                          </div>
                          {item.discount > 0 && (
                              <p className="text-[8px] text-green-500/70 text-right -mt-0.5">-${item.discount} descuento</p>
                          )}
                       </div>
                    ))}
                 </div>
                {ticket.tax > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2 mb-2">
                     <span>IVA (8%)</span><span>${ticket.tax.toFixed(2)}</span>
                  </div>
                )}
                {ticket.isr > 0 && (
                  <div className="flex justify-between text-[10px] text-red-400 border-t border-dashed border-slate-300 pt-2 mb-2">
                     <span>ISR (1.25%)</span><span>-${ticket.isr.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-on-surface border-t-2 border-white/10 pt-3">
                    <span>TOTAL</span>
                    <span>${ticket.total.toFixed(2)}</span>
                </div>
                <div className="mt-6 text-center text-[10px] text-on-surface/60">¡Gracias por su preferencia!</div>
                <button onClick={() => setTicket(null)} className="mt-4 w-full bg-primary text-on-primary py-3 text-xs font-bold uppercase tracking-widest rounded-xl">Cerrar</button>
             </div>
         </div>
      )}
    </div>
  )
}

export default POS;
