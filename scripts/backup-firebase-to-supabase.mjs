import pg from 'pg'

const FIREBASE_PROJECT = 'vulcanizadora-nando'
const API_KEY = process.env.FIREBASE_API_KEY

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`

const DB_CONFIG = {
  host: process.env.SUPABASE_DB_HOST,
  port: parseInt(process.env.SUPABASE_DB_PORT || '6543'),
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
}

const f = (url) =>
  fetch(`${url}&key=${API_KEY}`).then(async r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json()
  })

const fromFireVal = (v) => {
  if (v.stringValue !== undefined) return v.stringValue
  if (v.integerValue !== undefined) return parseInt(v.integerValue)
  if (v.doubleValue !== undefined) return v.doubleValue
  if (v.booleanValue !== undefined) return v.booleanValue
  if (v.nullValue !== null) return null
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromFireVal)
  if (v.mapValue) {
    const obj = {}
    if (v.mapValue.fields) for (const [k, fv] of Object.entries(v.mapValue.fields)) obj[k] = fromFireVal(fv)
    return obj
  }
  return null
}

const fromFireDoc = (doc) => {
  const obj = { id: doc.name.split('/').pop() }
  if (doc.fields) for (const [k, v] of Object.entries(doc.fields)) obj[k] = fromFireVal(v)
  return obj
}

async function readCollection(name) {
  let pageToken = ''
  let docs = []
  do {
    const url = `${FIRESTORE_BASE}/${name}?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await f(url)
    if (res.documents) docs = docs.concat(res.documents.map(fromFireDoc))
    pageToken = res.nextPageToken || ''
  } while (pageToken)
  return docs
}

function toPgValue(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    if (val === '[object Object]') return '[]'
    return val
  }
  if (Array.isArray(val)) return JSON.stringify(val)
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

async function syncTable(client, table, docs) {
  if (docs.length === 0) return { written: 0, errors: 0 }
  let written = 0, errors = 0

  for (const doc of docs) {
    const { id, ...data } = doc
    const columns = ['id', ...Object.keys(data)]
    const values = [id, ...Object.values(data).map(toPgValue)]
    const placeholders = columns.map((_, i) => `$${i + 1}`)
    const updates = columns.slice(1).map(c => `"${c}" = EXCLUDED."${c}"`)

    const query = `
      INSERT INTO "${table}" ("${columns.join('","')}")
      VALUES (${placeholders.join(',')})
      ON CONFLICT (id) DO UPDATE SET ${updates.join(',')}
    `

    try {
      await client.query(query, values)
      written++
    } catch (e) {
      console.error(`  Error ${table}/${id}: ${e.message}`)
      errors++
    }
  }
  return { written, errors }
}

const COLLECTIONS = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios']

async function main() {
  console.log('=== Backup Firebase → Supabase PostgreSQL ===')
  console.log(`Inicio: ${new Date().toISOString()}\n`)

  const pool = new pg.Pool(DB_CONFIG)
  const client = await pool.connect()

  try {
    for (const col of COLLECTIONS) {
      console.log(`📦 Leyendo ${col}...`)
      const docs = await readCollection(col)
      console.log(`  ${docs.length} documentos`)

      if (docs.length > 0) {
        const result = await syncTable(client, col, docs)
        console.log(`  ${result.written} escritos, ${result.errors} errores`)
      }
    }
    console.log(`\n✅ Backup completado: ${new Date().toISOString()}`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
