// Migrate warehouse products from Firebase Firestore to Supabase
const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore')
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

async function migrate() {
  console.log('Connecting to Firebase...')
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log('Reading warehouse products from Firebase Firestore...')
  const q = query(collection(db, 'Inventario'), where("branch", "==", "Almacen"))
  const snapshot = await getDocs(q)
  
  const firebaseProducts = snapshot.docs.map(doc => ({
    firebaseId: doc.id,
    ...doc.data()
  }))
  
  console.log(`Found ${firebaseProducts.length} warehouse products in Firebase.`)

  if (firebaseProducts.length === 0) {
    console.log('No warehouse products found. Checking ALL products...')
    const allQ = query(collection(db, 'Inventario'))
    const allSnapshot = await getDocs(allQ)
    console.log(`Total products in Firebase Inventario: ${allSnapshot.docs.length}`)
    allSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(` - ${doc.id}: ${data.name || 'unnamed'} (branch: ${data.branch}, warehouse: ${data.warehouse})`)
    })
    return
  }

  console.log('\nConnecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  let migrated = 0
  let errors = 0

  for (const product of firebaseProducts) {
    const { firebaseId, timestamp, created_at, updated_at, ...clean } = product

    const supabaseProduct = {
      ...clean,
      created_at: created_at || new Date(timestamp || Date.now()).toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log(`Migrating: ${clean.name || clean.sku || 'unnamed'} (${clean.warehouse})`)

    const { error } = await supabase
      .from('inventario')
      .insert([supabaseProduct])

    if (error) {
      console.error(`  ERROR: ${error.message}`)
      errors++
    } else {
      migrated++
    }
  }

  console.log(`\nDone! Migrated: ${migrated}, Errors: ${errors}`)
}

migrate().catch(console.error)
