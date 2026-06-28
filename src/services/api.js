import { supabase, TABLES, BRANCHES } from '../supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'

const supabaseClient = createClient(supabaseUrl, supabaseKey)

export { supabaseClient as supabaseStorage }
export { supabase, TABLES, BRANCHES }

// Alias for compatibility
export const db = supabase
export const storage = supabaseClient.storage

// ==================== GENERIC FUNCTIONS (matching old API) ====================

// fetchData -> fetches from any collection, filtering by branch
// Handles: Inventario, Clientes, Cotizaciones, Servicios, Gastos
export const fetchData = async (collectionName, branchName) => {
  console.log(`[Supabase API] Fetch ${collectionName} for '${branchName}'`)
  
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.warn(`[Supabase API] Timeout for ${collectionName}`)
      resolve([])
    }, 10000)
  })

  const fetchPromise = (async () => {
    try {
      if (!branchName) return []
      
      const tableMap = {
        'Inventario': TABLES.INVENTARIO,
        'Clientes': TABLES.CLIENTES,
        'Cotizaciones': TABLES.COTIZACIONES,
        'Ventas': TABLES.COTIZACIONES,
        'Servicios': TABLES.SERVICIOS,
        'Gastos': TABLES.GASTOS,
        'Usuarios': TABLES.USUARIOS
      }
      
      const table = tableMap[collectionName] || collectionName
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('branch', branchName)
      
      if (error) {
        console.error(`[Supabase API Error] ${collectionName}:`, error)
        return []
      }
      
      // Map back to old format (add id field)
      const results = (data || []).map(item => ({
        id: item.id,
        ...item
      }))
      
      console.log(`[Supabase API] Success ${collectionName} items: ${results.length}`)
      
      // Seed empty inventory with sample data
      if (results.length === 0 && collectionName === 'Inventario') {
        await seedInventory(branchName)
      }
      
      return results
    } catch (err) {
      console.error(`[Supabase API Error] ${collectionName}:`, err)
      return []
    }
  })()

  return Promise.race([fetchPromise, timeoutPromise])
}

// Seed sample inventory data
const seedInventory = async (branchName) => {
  try {
    const mockItems = [
      { 
        sku: '11856799', 
        brand: 'Goodyear', 
        name: 'Eagle Sport 205/55R16 91V', 
        qty: 20, 
        price: 2000, 
        cost: 1500,
        img: 'https://http2.mlstatic.com/D_NQ_NP_764592-MLA99442568452_112025-O.webp', 
        branch: branchName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { 
        sku: '46047361', 
        brand: 'Kumho', 
        name: 'Ecsta PS31 215/45R17', 
        qty: 16, 
        price: 1600, 
        cost: 1200,
        img: 'https://www.misterllantas.com/media/catalog/product/cache/860b7a2c70b7e271930e7a9c3934662d/k/u/kumho_ps31_ecsta_4.jpg', 
        branch: branchName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
    
    const { error } = await supabase
      .from(TABLES.INVENTARIO)
      .insert(mockItems)
    
    if (error) console.error('Seed Error', error)
  } catch (e) {
    console.error('Seed Error', e)
  }
}

// postData -> insert into collection
export const postData = async (collectionName, dataObj) => {
  try {
    const tableMap = {
      'Inventario': TABLES.INVENTARIO,
      'Clientes': TABLES.CLIENTES,
      'Cotizaciones': TABLES.COTIZACIONES,
      'Ventas': TABLES.COTIZACIONES,
      'Servicios': TABLES.SERVICIOS,
      'Gastos': TABLES.GASTOS,
      'Usuarios': TABLES.USUARIOS
    }
    
    const table = tableMap[collectionName] || collectionName
    
    // Transform data for Ventas -> cotizaciones table
    let rowData = dataObj
    if (collectionName === 'Ventas') {
      rowData = {
        items: [{
          _sale: true,
          orderId: dataObj.orderId,
          client: dataObj.client,
          paymentMethod: dataObj.paymentMethod,
          subtotal: dataObj.subtotal,
          tax: dataObj.tax,
          date: dataObj.date,
          timestamp: dataObj.timestamp,
          itemsSummary: dataObj.itemsSummary,
          itemsList: dataObj.itemsList
        }],
        status: 'completada',
        total: dataObj.total,
        branch: dataObj.branch
      }
    }
    
    const dataWithTimestamps = {
      ...rowData,
      created_at: rowData.created_at || new Date().toISOString(),
      ...(table === 'cotizaciones' || table === 'gastos' || table === 'servicios' ? {} : { updated_at: new Date().toISOString() })
    }
    
    const { data, error } = await supabase
      .from(table)
      .insert([dataWithTimestamps])
      .select()
    
    if (error) {
      console.error(`[Supabase API Error] posting to ${collectionName}:`, error)
      return { success: false }
    }
    
    return { success: true, id: data?.[0]?.id }
  } catch (err) {
    console.error(`[Supabase API Error] posting to ${collectionName}:`, err)
    return { success: false }
  }
}

// updateStock -> update inventory qty (transaction-like)
export const updateStock = async (documentId, qtyToSubtract) => {
  if (!documentId) return { success: false }
  
  try {
    // Get current product
    const { data: currentData, error: getError } = await supabase
      .from(TABLES.INVENTARIO)
      .select('qty')
      .eq('id', documentId)
      .single()
    
    if (getError || !currentData) {
      console.error('[Supabase API Error] updateStock get:', getError)
      return { success: false }
    }
    
    const newQty = Math.max(0, (parseInt(currentData.qty) || 0) - qtyToSubtract)
    
    const { error } = await supabase
      .from(TABLES.INVENTARIO)
      .update({ qty: newQty, updated_at: new Date().toISOString() })
      .eq('id', documentId)
    
    if (error) {
      console.error('[Supabase API Error] updateStock:', error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error('[Supabase API Error] updateStock:', err)
    return { success: false }
  }
}

// deleteData -> delete from collection
export const deleteData = async (collectionName, documentId) => {
  try {
    const tableMap = {
      'Inventario': TABLES.INVENTARIO,
      'Clientes': TABLES.CLIENTES,
      'Cotizaciones': TABLES.COTIZACIONES,
      'Ventas': TABLES.COTIZACIONES,
      'Servicios': TABLES.SERVICIOS,
      'Gastos': TABLES.GASTOS,
      'Usuarios': TABLES.USUARIOS
    }
    
    const table = tableMap[collectionName] || collectionName
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', documentId)
    
    if (error) {
      console.error(`[Supabase API Error] delete ${collectionName}:`, error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error(`[Supabase API Error] delete ${collectionName}:`, err)
    return { success: false }
  }
}

// updateData -> update document
export const updateData = async (collectionName, documentId, dataObj) => {
  try {
    const tableMap = {
      'Inventario': TABLES.INVENTARIO,
      'Clientes': TABLES.CLIENTES,
      'Cotizaciones': TABLES.COTIZACIONES,
      'Ventas': TABLES.COTIZACIONES,
      'Servicios': TABLES.SERVICIOS,
      'Gastos': TABLES.GASTOS,
      'Usuarios': TABLES.USUARIOS
    }
    
    const table = tableMap[collectionName] || collectionName
    
    const { error } = await supabase
      .from(table)
      .update({ ...dataObj, ...(table === 'cotizaciones' || table === 'servicios' ? {} : { updated_at: new Date().toISOString() }) })
      .eq('id', documentId)
    
    if (error) {
      console.error(`[Supabase API Error] update ${collectionName}:`, error)
      return { success: false }
    }
    
    return { success: true }
  } catch (err) {
    console.error(`[Supabase API Error] update ${collectionName}:`, err)
    return { success: false }
  }
}

// ==================== IMAGE UPLOAD ====================
export const uploadImage = async (file, folder = 'productos') => {
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return { success: true, url: dataUrl }
  } catch (err) {
    console.error('[Supabase API Error] uploadImage:', err)
    return { success: false, error: err.message }
  }
}

// getImageUrl -> get public URL for image
export const getImageUrl = (fileName) => {
  const { data } = supabaseClient.storage
    .from('productos')
    .getPublicUrl(fileName)

  return data.publicUrl
}