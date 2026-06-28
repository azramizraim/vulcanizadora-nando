// Migrate ALL Firebase Firestore data to Supabase
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs } = require('firebase/firestore')
const { createClient } = require('@supabase/supabase-js')

const firebaseConfig = {
  apiKey: "AIzaSyCYuS3OwN_BD6y-0Ha09Kb6DbCkx4LZfjs",
  authDomain: "vulcanizadora-nando.firebaseapp.com",
  projectId: "vulcanizadora-nando",
  storageBucket: "vulcanizadora-nando.firebasestorage.app",
  messagingSenderId: "105932967736",
  appId: "1:105932967736:web:ba888978c1594a128ebbcd"
}

const supabaseUrl = 'https://tcixwdrtfhfzjaznvobz.supabase.co'
const supabaseKey = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'

const TABLE_MAP = {
  'Inventario': 'inventario',
  'Clientes': 'clientes',
  'Cotizaciones': 'cotizaciones',
  'Servicios': 'servicios',
  'Gastos': 'gastos',
  'Usuarios': 'usuarios'
}

async function migrate() {
  const app = initializeApp(firebaseConfig)
  const fb = getFirestore(app)
  const supabase = createClient(supabaseUrl, supabaseKey)

  for (const [fbCollection, sbTable] of Object.entries(TABLE_MAP)) {
    console.log(`\n=== Migrating ${fbCollection} -> ${sbTable} ===`)

    const snapshot = await getDocs(collection(fb, fbCollection))
    const docs = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }))

    console.log(`Found ${docs.length} documents in Firebase ${fbCollection}`)

    if (docs.length === 0) {
      console.log(`Skipping ${fbCollection} (empty)`)
      continue
    }

    let migrated = 0
    let errors = 0

    for (const doc of docs) {
      const { firebaseId, timestamp, created_at, updated_at, ...clean } = doc

      const row = {
        ...clean,
        created_at: created_at || new Date(timestamp || Date.now()).toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log(`  Migrating: ${row.name || row.sku || row.email || row.id || doc.firebaseId} (branch: ${row.branch || 'N/A'})`)

      const { error } = await supabase
        .from(sbTable)
        .insert([row])

      if (error) {
        console.error(`  ERROR: ${error.message}`)
        errors++
      } else {
        migrated++
      }
    }

    console.log(`Done: ${fbCollection} -> migrated ${migrated}, errors ${errors}`)
  }

  console.log('\n========== MIGRATION COMPLETE ==========')
  console.log('Verify in Supabase: https://supabase.com/dashboard/project/tcixwdrtfhfzjaznvobz')
}

migrate().catch(console.error)
