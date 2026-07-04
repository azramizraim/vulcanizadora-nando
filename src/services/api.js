import { db } from '../firebase'
export { db }
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy, limit } from 'firebase/firestore'
import imageCompression from 'browser-image-compression'

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/vulcanizadora-nando/databases/(default)/documents'
const API_KEY = 'AIzaSyCYuS3OwN_BD6y-0Ha09Kb6DbCkx4LZfjs'

const f = (path, { method = 'POST', body } = {}) =>
  fetch(`${FIRESTORE_BASE}/${path}${path.includes('?') ? '&' : '?'}key=${API_KEY}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined
  }).then(async r => {
    if (method === 'DELETE') return { success: true }
    const json = await r.json()
    if (!r.ok) throw new Error(json.error?.message || `HTTP ${r.status}`)
    return json
  })

const fireVal = (v) => {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) < 2e53) return { integerValue: String(Math.round(v)) }
    return { doubleValue: v }
  }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fireVal) } }
  if (typeof v === 'object') {
    const fields = {}
    for (const [k, val] of Object.entries(v)) {
      fields[k] = fireVal(val)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(v) }
}

const fromFireDoc = (doc) => {
  const obj = { id: doc.name.split('/').pop() }
  if (doc.fields) {
    for (const [k, v] of Object.entries(doc.fields)) {
      obj[k] = fromFireVal(v)
    }
  }
  return obj
}

const fromFireVal = (v) => {
  if (v.stringValue !== undefined) return v.stringValue
  if (v.integerValue !== undefined) return parseInt(v.integerValue)
  if (v.doubleValue !== undefined) return v.doubleValue
  if (v.booleanValue !== undefined) return v.booleanValue
  if (v.nullValue !== null) return null
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromFireVal)
  if (v.mapValue) {
    const obj = {}
    if (v.mapValue.fields) {
      for (const [k, fv] of Object.entries(v.mapValue.fields)) {
        obj[k] = fromFireVal(fv)
      }
    }
    return obj
  }
  return null
}

const toFields = (data) => {
  const fields = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue
    fields[k] = fireVal(v)
  }
  return fields
}

export const TABLES = {
  INVENTARIO: 'inventario',
  USUARIOS: 'usuarios',
  CLIENTES: 'clientes',
  COTIZACIONES: 'cotizaciones',
  SERVICIOS: 'servicios',
  GASTOS: 'gastos'
}

export const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar']

const TABLE_COLLECTIONS = {
  'Inventario': TABLES.INVENTARIO,
  'Clientes': TABLES.CLIENTES,
  'Cotizaciones': TABLES.COTIZACIONES,
  'Ventas': TABLES.COTIZACIONES,
  'Servicios': TABLES.SERVICIOS,
  'Gastos': TABLES.GASTOS,
  'Usuarios': TABLES.USUARIOS
}

const INVENTARIO_FIELDS = ['name', 'brand', 'price', 'cost', 'qty', 'sku', 'ubicacion', 'condicion', 'warehouse', 'branch', 'created_at', 'updated_at', 'active']
const COTIZACIONES_FIELDS = ['items', 'total', 'status', 'branch', 'created_at', 'updated_at']
const CLIENTES_FIELDS = ['name', 'phone', 'email', 'rfc', 'type', 'balance', 'branch', 'created_at', 'updated_at']
const SERVICIOS_FIELDS = ['name', 'price', 'cost', 'branch', 'created_at', 'updated_at']
const GASTOS_FIELDS = ['concept', 'amount', 'branch', 'created_at', 'updated_at']

const TABLE_FIELDS = {
  'inventario': INVENTARIO_FIELDS,
  'cotizaciones': COTIZACIONES_FIELDS,
  'clientes': CLIENTES_FIELDS,
  'servicios': SERVICIOS_FIELDS,
  'gastos': GASTOS_FIELDS,
  'usuarios': ['email', 'role', 'branch', 'password']
}

const dataCache = {}
const CACHE_TTL = 60000

const getCached = (key) => {
  const entry = dataCache[key]
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  return null
}
const setCached = (key, data) => { dataCache[key] = { data, ts: Date.now() } }

export const fetchAllInventory = async () => {
  const cached = getCached('all_inventory')
  if (cached) return cached
  try {
    const maskParams = INVENTARIO_FIELDS.map(f => `mask.fieldPaths=${encodeURIComponent(f)}`).join('&')
    let pageToken = ''
    let allDocs = []
    do {
      const pagination = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      const res = await f(`${TABLES.INVENTARIO}?${maskParams}${pagination}`, { method: 'GET' })
      if (res?.documents) {
        allDocs = allDocs.concat(res.documents.map(d => fromFireDoc(d)))
      }
      pageToken = res?.nextPageToken || ''
    } while (pageToken)
    setCached('all_inventory', allDocs)
    return allDocs
  } catch (err) {
    console.error('[Firebase Error] fetchAllInventory:', err)
    return []
  }
}

export const fetchProductDetail = async (id) => {
  try {
    const res = await f(`${TABLES.INVENTARIO}/${id}`, { method: 'GET' })
    return res ? fromFireDoc(res) : null
  } catch (err) {
    console.error('[Firebase Error] fetchProductDetail:', err)
    return null
  }
}

export const invalidateCache = (key) => {
  if (key) delete dataCache[key]
  else Object.keys(dataCache).forEach(k => delete dataCache[k])
}

const runListQuery = async (collectionId, branchName, fields) => {
  const cacheKey = `query:${collectionId}:${branchName}${fields ? '' : ':no-mask'}`
  const cached = getCached(cacheKey)
  if (cached) return cached
  try {
    const maskParams = fields ? fields.map(f => `mask.fieldPaths=${encodeURIComponent(f)}`).join('&') : ''
    let pageToken = ''
    let allDocs = []
    do {
    const queryParams = []
    if (fields) queryParams.push(maskParams)
    if (pageToken) queryParams.push(`pageToken=${encodeURIComponent(pageToken)}`)
    const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : ''
    const res = await f(`${collectionId}${queryString}`, { method: 'GET' })
      if (res?.documents) {
        allDocs = allDocs.concat(res.documents.map(d => fromFireDoc(d)))
      }
      pageToken = res?.nextPageToken || ''
    } while (pageToken)
    let results = allDocs
    if (branchName) {
      results = results.filter(d => d.branch === branchName)
    }
    setCached(cacheKey, results)
    return results
  } catch (err) {
    console.error(`[Firebase Error] runListQuery ${collectionId}:`, err)
    return []
  }
}

export const fetchData = async (collectionName, branchName) => {
  console.log(`[Firebase API] Fetch ${collectionName} for '${branchName}'`)
  try {
    if (!branchName) return []
    const col = TABLE_COLLECTIONS[collectionName] || collectionName
    const fields = TABLE_FIELDS[col]
    const results = await runListQuery(col, branchName, fields)
    return results
  } catch (err) {
    console.error(`[Firebase Error] ${collectionName}:`, err)
    return []
  }
}

const seedInventory = async (branchName) => {
  try {
    const mockItems = [
      { sku: 'RIN-00001', brand: 'Fox', name: 'Rin 15" Aleación', qty: 10, price: 1800, cost: 1200, warehouse: 'rines', branch: branchName, img: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { sku: 'RIN-00002', brand: 'Lion', name: 'Rin 17" Deportivo', qty: 8, price: 2500, cost: 1800, warehouse: 'rines', branch: branchName, img: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { sku: 'LLA-00001', brand: 'Goodyear', name: 'Eagle Sport 205/55R16 91V', qty: 20, price: 2000, cost: 1500, warehouse: 'llantas', branch: branchName, img: 'https://http2.mlstatic.com/D_NQ_NP_764592-MLA99442568452_112025-O.webp', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { sku: 'LLA-00002', brand: 'Kumho', name: 'Ecsta PS31 215/45R17', qty: 16, price: 1600, cost: 1200, warehouse: 'llantas', branch: branchName, img: 'https://www.misterllantas.com/media/catalog/product/cache/860b7a2c70b7e271930e7a9c3934662d/k/u/kumho_ps31_ecsta_4.jpg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { sku: 'LLA-00003', brand: 'Michelin', name: 'Primacy 4 225/45R17', qty: 12, price: 3200, cost: 2600, warehouse: 'llantas', branch: branchName, img: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ]
    for (const item of mockItems) {
      await f(`${TABLES.INVENTARIO}`, {
        body: {
          fields: toFields({ ...item, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        }
      })
    }
    console.log('[Firebase] Seed complete:', mockItems.length, 'products')
  } catch (e) {
    console.error('Seed Error', e)
  }
}

const SUPABASE_URL = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const SUPABASE_KEY = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'

const FIREBASE_TO_SUPABASE = {
  'Inventario': 'inventario',
  'Clientes': 'clientes',
  'Cotizaciones': 'cotizaciones',
  'Servicios': 'servicios',
  'Gastos': 'gastos',
  'Usuarios': 'usuarios',
  'Ventas': 'ventas'
}

function getSupabaseTable(collectionName) {
  return FIREBASE_TO_SUPABASE[collectionName] || collectionName.toLowerCase()
}

async function syncToSupabase(collectionName, documentId, data) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const table = getSupabaseTable(collectionName)
    const { error } = await supabase
      .from(table)
      .upsert({ id: documentId, ...data, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) console.warn('[Supabase sync warn]', error.message)
  } catch (e) {
    // Silently fail - Firebase is the source of truth
  }
}

async function deleteFromSupabase(collectionName, documentId) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const table = getSupabaseTable(collectionName)
    const { error } = await supabase.from(table).delete().eq('id', documentId)
    if (error) console.warn('[Supabase delete sync warn]', error.message)
  } catch (e) {
    // Silently fail
  }
}

export const postData = async (collectionName, dataObj) => {
  try {
    const col = TABLE_COLLECTIONS[collectionName] || collectionName
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
      updated_at: new Date().toISOString()
    }
    const res = await f(`${col}`, { body: { fields: toFields(dataWithTimestamps) } })
    invalidateCache()
    const newId = res.name.split('/').pop()
    syncToSupabase(collectionName, newId, rowData)
    return { success: true, id: newId }
  } catch (err) {
    console.error(`[Firebase Error] posting to ${collectionName}:`, err)
    return { success: false }
  }
}

export const updateStock = async (documentId, qtyToSubtract) => {
  if (!documentId) return { success: false }
  try {
    const docRes = await f(`${TABLES.INVENTARIO}/${documentId}`, { method: 'GET' })
    if (!docRes || !docRes.fields) return { success: false }
    const current = parseInt(docRes.fields.qty?.integerValue || '0')
    const newQty = Math.max(0, current - qtyToSubtract)
    const ts = new Date().toISOString()
    await f(`${TABLES.INVENTARIO}/${documentId}?updateMask.fieldPaths=qty&updateMask.fieldPaths=updated_at`, {
      method: 'PATCH',
      body: { fields: { qty: { integerValue: String(newQty) }, updated_at: { stringValue: ts } } }
    })
    invalidateCache()
    syncToSupabase('Inventario', documentId, { qty: newQty, updated_at: ts })
    return { success: true }
  } catch (err) {
    console.error('[Firebase Error] updateStock:', err)
    return { success: false }
  }
}

export const deleteData = async (collectionName, documentId) => {
  try {
    const col = TABLE_COLLECTIONS[collectionName] || collectionName
    await f(`${col}/${documentId}`, { method: 'DELETE' })
    invalidateCache()
    deleteFromSupabase(collectionName, documentId)
    return { success: true }
  } catch (err) {
    console.error(`[Firebase Error] delete ${collectionName}:`, err)
    return { success: false }
  }
}

export const updateData = async (collectionName, documentId, dataObj) => {
  try {
    const col = TABLE_COLLECTIONS[collectionName] || collectionName
    const ts = new Date().toISOString()
    const data = { ...dataObj, updated_at: ts }
    const fields = toFields(data)
    const mask = Object.keys(data).map(k => `updateMask.fieldPaths=${k}`).join('&')
    await f(`${col}/${documentId}?${mask}`, { method: 'PATCH', body: { fields } })
    invalidateCache()
    syncToSupabase(collectionName, documentId, data)
    return { success: true }
  } catch (err) {
    console.error(`[Firebase Error] update ${collectionName}:`, err)
    return { success: false }
  }
}

export const uploadImage = async (file, { useDropbox = false, folder = 'productos' } = {}) => {
  if (useDropbox) {
    return uploadImageToDropbox(file)
  }

  try {
    const options = {
      maxWidthOrHeight: 400,
      useWebWorker: false,
      initialQuality: 0.5,
      fileType: 'image/jpeg'
    }
    const compressed = await imageCompression(file, options)
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(compressed)
    })
    return { success: true, url: dataUrl, source: 'local' }
  } catch (err) {
    console.error('[Firebase Error] uploadImage:', err)
    return { success: false, error: err.message }
  }
}

export const uploadImageToDropbox = async (file) => {
  try {
    const { uploadImage: dropboxUpload } = await import('./dropbox')
    const result = await dropboxUpload(file)
    return { success: true, url: result.url, source: 'dropbox', path: result.path }
  } catch (err) {
    console.error('[Dropbox Error] uploadImageToDropbox:', err)
    return { success: false, error: err.message }
  }
}
