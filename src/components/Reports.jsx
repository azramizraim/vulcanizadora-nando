import React, { useState, useEffect } from 'react'
import { fetchData } from '../services/api'
import { LoadingTire } from './LoadingTire'

const getDateKey = (ts) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDateMX = (ts) => {
  return new Date(ts).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatTime = (ts) => {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function Reports({ activeBranch, isAdmin }) {
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [expandedDay, setExpandedDay] = useState(null)
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
          const normalized = (Array.isArray(salesData) ? salesData : [])
            .filter(s => s.status === 'completada')
            .map(s => {
              const meta = s.items?.[0]?._sale ? s.items[0] : {}
              return {
                ...s,
                ...meta,
                timestamp: meta.timestamp || new Date(s.created_at || 0).getTime()
              }
            }).sort((a, b) => b.timestamp - a.timestamp)
          setSales(normalized)
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

  const printTicket = (ticket) => {
    const printWindow = window.open('', '_blank')
    const itemsHtml = (ticket.itemsList || []).map(item => {
      const lineTotal = ((item.discountedPrice || item.price) * item.qty).toFixed(2)
      return `
      <tr>
        <td style="font-size:9px;padding:2px 0;border-bottom:1px dashed #888;font-weight:900;color:#000;">${item.qty}x ${item.name}</td>
        <td style="font-size:9px;padding:2px 0;text-align:right;border-bottom:1px dashed #888;font-weight:900;color:#000;white-space:nowrap;">$${lineTotal}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${ticket.orderId}</title>
  <style>
    @page { size: 58mm 3276mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 9px;
      width: 42mm;
      margin: 0 0 0 2mm;
      color: #000;
      font-weight: 900;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { text-align: center; margin-bottom: 4px; }
    .header img { width: 40px; height: 40px; object-fit: contain; margin-bottom: 2px; }
    .header h1 { font-size: 10px; font-weight: 900; color: #000; }
    .header p { font-size: 6px; text-transform: uppercase; font-weight: 900; color: #000; }
    .divider { border-top: 1px dashed #000; margin: 3px 0; }
    .info { font-size: 8px; font-weight: 900; margin-bottom: 2px; }
    .info-line { display: flex; justify-content: space-between; padding: 1px 0; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    td { font-weight: 900; color: #000; }
    .totals { margin-top: 2px; }
    .total-line { display: flex; justify-content: space-between; font-size: 8px; font-weight: 900; padding: 1px 0; color: #000; }
    .total-final { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; border-top: 2px solid #000; padding-top: 2px; margin-top: 2px; color: #000; }
    .footer { text-align: center; margin-top: 4px; font-size: 7px; font-weight: 900; color: #000; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${window.location.origin}/images/logo_nando.jpg" alt="Nando" />
    <h1>VULCANIZADORA NANDO</h1>
    <p>${activeBranch}</p>
  </div>
  <div class="divider"></div>
  <div class="info">
    <div class="info-line"><span>Venta:</span><span>${ticket.orderId}</span></div>
    <div class="info-line"><span>Fecha:</span><span>${ticket.date}</span></div>
    <div class="info-line"><span>Cliente:</span><span>${ticket.client}</span></div>
  </div>
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  <div class="divider"></div>
  <div class="totals">
    <div class="total-line"><span>Subtotal</span><span>$${parseFloat(ticket.subtotal || 0).toFixed(2)}</span></div>
    <div class="total-final"><span>TOTAL</span><span>$${parseFloat(ticket.total).toFixed(2)}</span></div>
  </div>
  <div class="divider"></div>
  <div class="footer">
    <p>${ticket.paymentMethod}</p>
    <p style="margin-top:2px;">Gracias por su preferencia</p>
  </div>
  <script>window.onload = function() { window.print(); window.close(); }</script>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const printCorteDay = (daySales, dayExpenses, dateLabel, dateKey) => {
    const printWindow = window.open('', '_blank')
    const totalSales = daySales.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
    const totalExp = dayExpenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
    const cashNet = totalSales - totalExp

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Corte - ${dateKey}</title>
  <style>
    @page { size: 58mm 3276mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 9px;
      width: 42mm;
      margin: 0 0 0 2mm;
      color: #000;
      font-weight: 900;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { text-align: center; margin-bottom: 4px; }
    .header img { width: 40px; height: 40px; object-fit: contain; margin-bottom: 2px; }
    .header h1 { font-size: 10px; font-weight: 900; color: #000; }
    .header p { font-size: 6px; text-transform: uppercase; font-weight: 900; color: #000; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; font-size: 9px; font-weight: 900; padding: 2px 0; color: #000; }
    .row-final { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; border-top: 2px solid #000; padding-top: 3px; margin-top: 2px; color: #000; }
    .sale-row { display: flex; justify-content: space-between; font-size: 7px; font-weight: 900; padding: 1px 0; color: #333; }
    .footer { text-align: center; margin-top: 4px; font-size: 7px; font-weight: 900; color: #000; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${window.location.origin}/images/logo_nando.jpg" alt="Nando" />
    <h1>VULCANIZADORA NANDO</h1>
    <p>CORTE DEL DIA</p>
    <p style="font-size:7px;margin-top:1px;">${dateLabel}</p>
    <p style="font-size:7px;">${activeBranch}</p>
  </div>
  <div class="divider"></div>
  ${daySales.map(s => `<div class="sale-row"><span>${s.orderId || 'Venta'}</span><span>$${parseFloat(s.total || 0).toFixed(2)}</span></div>`).join('')}
  <div class="divider"></div>
  <div class="row"><span>Ventas Brutas (${daySales.length})</span><span>$${totalSales.toFixed(2)}</span></div>
  <div class="row"><span>Egresos</span><span>-$${totalExp.toFixed(2)}</span></div>
  <div class="row-final"><span>EFECTIVO NETO</span><span>$${cashNet.toFixed(2)}</span></div>
  <div class="divider"></div>
  <div class="footer">
    <p>Vulcanizadora Nando</p>
  </div>
  <script>window.onload = function() { window.print(); window.close(); }</script>
</body>
</html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  if (loading) return <div className="p-20 flex justify-center"><LoadingTire size="lg" /></div>

  // Group sales and expenses by day
  const dayMap = {}
  sales.forEach(s => {
    const key = getDateKey(s.timestamp)
    if (!dayMap[key]) dayMap[key] = { sales: [], expenses: [] }
    dayMap[key].sales.push(s)
  })
  expenses.forEach(e => {
    const key = getDateKey(e.created_at)
    if (!dayMap[key]) dayMap[key] = { sales: [], expenses: [] }
    dayMap[key].expenses.push(e)
  })

  const sortedDays = Object.entries(dayMap).sort((a, b) => b[0].localeCompare(a[0]))

  // Global totals (all time)
  const totalSalesAll = sales.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
  const totalExpAll = expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
  const cashNetAll = totalSalesAll - totalExpAll

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/50 backdrop-blur-md py-4 z-10 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-headline font-black text-on-surface uppercase">Cortes por Dia</h2>
            <p className="text-slate-400 text-[10px] uppercase font-black">Historial de <span className="text-primary">{activeBranch}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input className="input-industrial px-4 py-2 text-xs w-full sm:w-64" placeholder="Buscar venta # o cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </header>

      {/* Global summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-workbench p-6 rounded-2xl border border-white/5 border-b-primary shadow-lg">
          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Ventas Totales</p>
          <h3 className="text-3xl font-headline font-black text-emerald-400">${totalSalesAll.toFixed(2)}</h3>
        </div>
        <div className="surface-workbench p-6 rounded-2xl border border-white/5 border-b-error shadow-lg">
          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Egresos Totales</p>
          <h3 className="text-3xl font-headline font-black text-error">-${totalExpAll.toFixed(2)}</h3>
        </div>
        <div className="surface-workbench p-6 rounded-2xl border border-white/10 bg-primary/5 shadow-2xl">
          <p className="text-[10px] text-primary/50 font-black uppercase mb-1 italic">Efectivo Neto Global</p>
          <h3 className="text-3xl font-headline font-black text-primary">${cashNetAll.toFixed(2)}</h3>
        </div>
      </div>

      {/* Daily cuts */}
      <div className="space-y-4">
        {sortedDays.map(([dateKey, dayData]) => {
          const dayTotalSales = dayData.sales.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0)
          const dayTotalExp = dayData.expenses.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
          const dayCashNet = dayTotalSales - dayTotalExp
          const isExpanded = expandedDay === dateKey
          const dateLabel = formatDateMX(dayData.sales[0]?.timestamp || dayData.expenses[0]?.created_at || dateKey)

          // Filter sales within this day by search
          const filteredDaySales = dayData.sales.filter(s =>
            !searchTerm ||
            (s.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.client || '').toLowerCase().includes(searchTerm.toLowerCase())
          )

          // If searching, only show days with matching sales
          if (searchTerm && filteredDaySales.length === 0) return null

          return (
            <div key={dateKey} className="surface-workbench rounded-2xl border border-white/5 overflow-hidden">
              {/* Day header */}
              <button
                onClick={() => setExpandedDay(isExpanded ? null : dateKey)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-on-surface uppercase">{dateLabel}</p>
                    <p className="text-[10px] text-slate-500">{dayData.sales.length} ventas · {dayData.expenses.length} egresos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-emerald-400">+${dayTotalSales.toFixed(2)}</p>
                    <p className="text-[10px] font-black text-error">-${dayTotalExp.toFixed(2)}</p>
                    <p className="text-xs font-black text-primary">=${dayCashNet.toFixed(2)}</p>
                  </div>
                  <span className={`material-symbols-outlined text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
              </button>

              {/* Quick summary row (mobile) */}
              <div className="sm:hidden grid grid-cols-3 gap-2 px-4 pb-3">
                <div className="bg-emerald-500/10 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-emerald-400 font-black uppercase">Ventas</p>
                  <p className="text-xs font-black text-emerald-400">${dayTotalSales.toFixed(2)}</p>
                </div>
                <div className="bg-error/10 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-error font-black uppercase">Gastos</p>
                  <p className="text-xs font-black text-error">${dayTotalExp.toFixed(2)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-primary font-black uppercase">Neto</p>
                  <p className="text-xs font-black text-primary">${dayCashNet.toFixed(2)}</p>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-white/5">
                  {/* Action buttons */}
                  <div className="p-4 flex gap-2 border-b border-white/5">
                    <button
                      onClick={(e) => { e.stopPropagation(); printCorteDay(dayData.sales, dayData.expenses, dateLabel, dateKey) }}
                      className="flex items-center gap-1 bg-primary text-background px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all hover:brightness-110"
                    >
                      <span className="material-symbols-outlined text-[14px]">print</span> Imprimir Corte
                    </button>
                    <span className="text-[10px] text-slate-500 self-center font-mono">{dateKey}</span>
                  </div>

                  {/* Sales list */}
                  <div className="overflow-x-auto">
                    <table className="hidden md:table w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-high/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                          <th className="px-6 py-4">Orden / Hora</th>
                          <th className="px-6 py-4">Cliente / Artículos</th>
                          <th className="px-6 py-4 text-center">Método</th>
                          <th className="px-6 py-4 text-right">Monto</th>
                          <th className="px-6 py-4 text-center">Ticket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredDaySales.map(s => (
                          <tr key={s.id} className="hover:bg-white/5 transition-all group">
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-primary">{s.orderId}</p>
                              <p className="text-[9px] text-slate-500 font-mono italic">{formatTime(s.timestamp)}</p>
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

                    {/* Mobile version */}
                    <div className="md:hidden divide-y divide-white/5">
                      {filteredDaySales.map(s => (
                        <div key={s.id} onClick={() => setSelectedTicket(s)} className="p-4 flex items-center justify-between active:bg-white/5 transition-colors cursor-pointer">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-primary">{s.orderId}</span>
                              <span className="text-[8px] bg-white/5 px-1 rounded font-black text-slate-500 uppercase">{s.paymentMethod}</span>
                            </div>
                            <p className="text-[10px] text-on-surface uppercase font-bold truncate">{s.client}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">{formatTime(s.timestamp)}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <p className="text-sm font-headline font-black text-emerald-400 tracking-tighter">${parseFloat(s.total).toFixed(2)}</p>
                            <span className="material-symbols-outlined text-[16px] text-slate-600">chevron_right</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredDaySales.length === 0 && (
                      <div className="py-12 text-center opacity-20 uppercase font-black tracking-[10px] text-sm">Sin ventas este dia</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {sortedDays.length === 0 && (
          <div className="py-20 text-center opacity-20 uppercase font-black tracking-[10px] text-sm">No hay cortes disponibles</div>
        )}
      </div>

      {/* Modal de Ticket */}
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
              <button onClick={() => { printTicket(selectedTicket); setSelectedTicket(null) }} className="flex-1 bg-white text-black py-4 text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-1 border border-black/10">Imprimir <span className="material-symbols-outlined text-[16px]">print</span></button>
              <a href={`https://wa.me/52${selectedTicket.phone || ''}?text=Hola+${selectedTicket.client},+aquí+tienes+tu+ticket+de+Vulcanizadora+Nando:+https://vulcanizadora-nando.web.app`} target="_blank" className="flex-1 bg-emerald-500 text-white py-4 text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-2">Compartir <span className="material-symbols-outlined text-[16px]">share</span></a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports