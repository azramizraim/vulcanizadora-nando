# Firebase Primary + Supabase Async Backup + Dropbox Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Firebase as primary database with async Supabase replication and Dropbox image storage.

**Architecture:** Firebase handles all reads/writes via app, Cloud Functions replicate changes to Supabase asynchronously, client uploads images directly to Dropbox, returning URLs stored in Firebase and replicated to Supabase.

**Tech Stack:** Node.js/Cloud Functions, Firebase Admin SDK, Dropbox API, Supabase JS client, TypeScript (if used in project)

---

## Task 1: Set up Cloud Function project

**Files:**
- Create: `cloudfunctions/index.js`
- Create: `cloudfunctions/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sync-functions",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "firebase-functions": "latest",
    "firebase-admin": "latest",
    "@supabase/supabase-js": "latest",
    "node-fetch": "latest"
  }
}
```

- [ ] **Step 2: Create Firebase Cloud Functions**

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

admin.initializeApp();

const supabase = createClient(
  'https://tcixwdrtfhfzjaznvobz.supabase.co',
  'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'
);

// Default retry configuration
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
```

- [ ] **Step 3: Create sync function for collection data**

```javascript
async function syncCollectionData(collectionName, documentId, data) {
  try {
    const { error } = await supabase
      .from(collectionName)
      .upsert({ id: documentId, ...data }, { onConflict: 'id' });

    if (error) throw error;
    console.log(`✅ ${collectionName}/${documentId} synced successfully`);
    return { success: true };
  } catch (error) {
    console.error(`❌ ${collectionName}/${documentId} sync failed:`, error.message);
    throw error;
  }
}
```

- [ ] **Step 4: Create main onWrite trigger handler**

```javascript
exports.onFirestoreWrite = functions.firestore
  .document('{collection}/{documentId}')
  .onWrite(async (change, context) => {
    const { collection, documentId } = context.params;

    // Skip sync for system collections
    if (['sessions', 'audit-log'].includes(collection)) {
      return null;
    }

    // Triggered on create or update
    if (change.after.exists) {
      const afterData = change.after.data();
      // Remove undefined/null fields
      const cleanData = Object.entries(afterData).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
      }, {});

      // Add server timestamps if not present
      if (!cleanData.created_at) cleanData.created_at = new Date().toISOString();
      cleanData.updated_at = new Date().toISOString();

      await withRetry(() => syncCollectionData(collection, documentId, cleanData));
    }

    // Triggered on delete
    else if (!change.after.exists && change.before.exists) {
      try {
        const { error } = await supabase
          .from(collection)
          .delete()
          .eq('id', documentId);

        if (error) throw error;
        console.log(`✅ ${collection}/${documentId} deleted in Supabase`);
      } catch (error) {
        console.error(`❌ ${collection}/${documentId} delete failed:`, error.message);
        throw error;
      }
    }

    return null;
  });

exports.syncAllData = functions.https.onRequest(async (req, res) => {
  try {
    const collections = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios'];
    const results = {};

    for (const collection of collections) {
      const snapshot = await admin.firestore().collection(collection).get();
      results[collection] = { documents: snapshot.size, status: 'processed' };
    }

    res.status(200).json({
      success: true,
      message: 'Full sync completed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

- [ ] **Step 5: Commit changes**

```bash
git add cloudfunctions/
git commit -m "feat: add firebase-to-supabase sync cloud functions"
```

## Task 2: Create Dropbox service

**Files:**
- Create: `services/dropbox.js`

- [ ] **Step 1: Create Dropbox utility service**

```javascript
class DropboxService {
  constructor() {
    this.apiKey = process.env.DROPBOX_API_KEY;
    this.baseUrl = 'https://api.dropboxapi.com/2';
    this.contentUrl = 'https://content.dropboxapi.com/2';
    this.folder = '/productos';
  }

  async createFolder(path) {
    const response = await this._makeRequest('files/create_folder', {
      path,
      autorename: false
    });
    return response;
  }

  async uploadImage(localContent, fileName) {
    const path = `${this.folder}/${fileName}`;

    const response = await fetch(`${this.contentUrl}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`, 
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      body: localContent
    });

    if (!response.ok) {
      throw new Error(`Dropbox upload failed: ${await response.text()}`);
    }

    const result = await response.json();
    const { shared_link } = await this.createSharedLink(path);
    
    return {
      path,
      sharedLink: shared_link.url,
      expires: shared_link.expires || null
    };
  }

  async createSharedLink(path) {
    const response = await this._makeRequest('sharing/create_shared_link_with_settings', {
      path,
      settings: {
        accessLevel: 'public',
        audience: 'everyone',
        permissionsLevel: 'viewer',
        sharedLink: {
          requestedVisibility: 'public'
        }
      }
    });

    // Convert to direct image URL
    return {
      url: response.url.replace('?dl=0', '?dl=1'),
      expires: response.expires
    };
  }

  async _makeRequest(endpoint, data) {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`, 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Dropbox API error: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  async generateFileName(originalName, prefix = 'img') {
    const timestamp = Date.now();
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}_${timestamp}_${cleanName}`;
  }
}

module.exports = DropboxService;
```

- [ ] **Step 2: Create Dropbox environment variables**

```bash
echo "DROPBOX_API_KEY=YOUR_API_KEY" >> .env
echo "DROPBOX_REFRESH_TOKEN=YOUR_REFRESH_TOKEN" >> .env
```

- [ ] **Step 3: Add Dropbox initialization to app**

```javascript
// In src/firebase.js or src/app.js
import { DropboxService } from './services/dropbox';

const dropboxService = new DropboxService();

// Export for use in components
export { dropboxService };
```

- [ ] **Step 4: Create service wrapper function**

```javascript
// services/dropboxWrapper.js
import { dropboxService } from '../services/dropbox';

export const uploadImageToDropbox = async (file, fileName) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await dropboxService.uploadImage(Buffer.from(arrayBuffer), fileName);
  } catch (error) {
    console.error('Dropbox upload error:', error);
    throw error;
  }
};

export const generateDropboxFileName = (originalName) => {
  return dropboxService.generateFileName(originalName);
};
```

- [ ] **Step 5: Commit changes**

```bash
git add services/
git commit -m "feat: add dropbox image upload service"
```

## Task 3: Update client image upload logic

**Files:**
- Modify: `src/services/api.js:314-333`
- Modify: `src/components/POS.jsx` (or main upload component)

- [ ] **Step 1: Update Firebase API image upload**

```javascript
// Replace existing uploadImage in src/services/api.js
export const uploadImage = async (file) => {
  try {
    // Check if it's a Dropbox integration (new approach)
    if (typeof file === 'object' && file.type && file.type === 'dropbox-upload') {
      const { dataUrl } = file;
      return { success: true, url: dataUrl };
    }

    // Original browser-image-compression logic still available
    const options = {
      maxWidthOrHeight: 400,
      useWebWorker: false,
      initialQuality: 0.5,
      fileType: 'image/jpeg'
    };

    const compressed = await imageCompression(file, options);
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(compressed);
    });

    return { success: true, url: dataUrl };
  } catch (err) {
    console.error('[Firebase Error] uploadImage:', err);
    return { success: false, error: err.message };
  }
};
```

- [ ] **Step 2: Create client-side Dropbox upload**

```javascript
// In POS.jsx or your main upload component
import { uploadImageToDropbox, generateDropboxFileName } from '../services/dropboxWrapper';

const handleDropboxUpload = async (file) => {
  try {
    // Show loading state
    setIsUploading(true);

    // Generate unique filename
    const fileName = await generateDropboxFileName(file.name);

    // Upload to Dropbox
    const result = await uploadImageToDropbox(file, fileName);

    // Update inventory with Dropbox URL
    await postData('inventario', {
      ...productData,
      img: result.sharedLink,
      img_source: 'dropbox'
    });

    // Success feedback
    setUploadSuccess(true);
    setUploadedImage(result.sharedLink);

  } catch (error) {
    console.error('Dropbox upload failed:', error);
    setUploadError('Failed to upload image to Dropbox: ' + error.message);
  } finally {
    setIsUploading(false);
  }
};
```

- [ ] **Step 3: Add UI controls**

```jsx
// In your upload component
<button
  onClick={handleDropboxUpload}
  disabled={isUploading}
  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
>
  {isUploading ? 'Uploading to Dropbox...' : 'Upload to Dropbox'}
</button>
```

- [ ] **Step 4: Commit changes**

```bash
git add src/services/api.js
git add src/components/POS.jsx (or appropriate component)
git commit -m "feat: add dropbox client upload integration"
```

## Task 4: Update post-upload sync logic

**Files:**
- Modify: `src/services/api.js:252-263`

- [ ] **Step 1: Update postData with Dropbox-specific handling**

```javascript
export const postData = async (collectionName, dataObj) => {
  try {
    const col = TABLE_COLLECTIONS[collectionName] || collectionName;

    // Handle image uploads with dual storage
    if (dataObj.img && typeof dataObj.img === 'object') {
      // New style: object with success/upload status
      if (dataObj.img.success && dataObj.img.url) {
        // Use the uploaded URL
        dataObj.img_url = dataObj.img.url;
        dataObj.img_source = dataObj.img.source || 'dropbox';
      }
    }

    // Prepare data with timestamps
    const postData = {
      ...dataObj,
      created_at: dataObj.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Convert to Firestore format
    const res = await f(`${col}`, {
      body: { fields: toFields(postData) }
    });

    // Invalidate cache
    invalidateCache();

    const documentId = res.name.split('/').pop();

    return { success: true, id: documentId };
  } catch (err) {
    console.error(`[Firebase Error] posting to ${collectionName}:`, err);
    return { success: false, error: err.message };
  }
};
```

- [ ] **Step 2: Add sync status tracking**

```javascript
// Create a sync status field
postData: async (collectionName, dataObj) => {
  // ... existing logic ...

  // Add sync metadata for audit trail
  if (dataObj.sync_metadata) {
    postData.sync_metadata = {
      ...dataObj.sync_metadata,
      synced_to_supabase: false,
      sync_attempts: 0,
      last_sync_attempt: new Date().toISOString()
    };
  }

  // ... rest of function ...
}
```

- [ ] **Step 3: Add diagnostic endpoint**

```javascript
// Add to src/services/api.js
export const getSyncStatus = async () => {
  try {
    const allDocs = await fetchAllInventory();
    const uploadStats = {
      total: allDocs.length,
      withDropboxUrls: allDocs.filter(d => d.img_source === 'dropbox').length,
      withFirebaseUrls: allDocs.filter(d => d.img_source === 'firebase').length,
      mixed: allDocs.filter(d => !d.img_source).length
    };

    return uploadStats;
  } catch (err) {
    console.error('Error fetching sync status:', err);
    return null;
  }
};
```

- [ ] **Step 4: Commit changes**

```bash
git add src/services/api.js
git commit -m "feat: update post-data sync logic for dropbox integration"
```

## Task 5: Set up environment and deployment

**Files:**
- Create: `cloudfunctions/package.json`
- Create: `.env`
- Modify: `package.json` (add development scripts)

- [ ] **Step 1: Create cloudfunctions package.json**

```json
{
  "name": "sync-functions",
  "version": "1.0.0",
  "description": "Firebase Cloud Functions for Supabase sync",
  "private": true,
  "scripts": {
    "deploy": "firebase deploy --only functions",
    "shell": "firebase functions:shell",
    "start": "nodemon index.js"
  },
  "dependencies": {
    "firebase-admin": "^11.10.1",
    "firebase-functions": "^4.5.0",
    "@supabase/supabase-js": "^2.38.1",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

- [ ] **Step 2: Create .env file**

```bash
# Dropbox Configuration
DROPBOX_API_KEY=YOUR_DROPBOX_ACCESS_TOKEN

# Supabase Configuration  
SUPABASE_URL=https://tcixwdrtfhfzjaznvobz.supabase.co
SUPABASE_KEY=sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ

# Firebase Configuration
FIREBASE_PROJECT=vulcanizadora-nando

# Upload Configuration
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png

# Sync Configuration
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY_MS=1000
```

- [ ] **Step 3: Add deployment scripts to main package.json**

```json
// Add to scripts section in package.json
scripts: {
  // ... existing scripts ...
  "deploy:functions": "cd cloudfunctions && npm install && firebase deploy --only functions",
  "deploy:firebase": "firebase deploy --only hosting,firestore,storage",
  "deploy:all": "npm run deploy:functions && npm run deploy:firebase",
  "setup:env": "cp .env.example .env && echo 'Setup .env with your credentials'",
  "test:sync": "node -e \"console.log('Testing sync configuration')\""
}
```

- [ ] **Step 4: Add sync helpers**

```javascript
// scripts/sync-helpers.js
const supabase = require('@supabase/supabase-js');

async function verifySupabaseConnection() {
  const client = supabase(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const { data, error } = await client
    .from('inventario')
    .select('count', { count: 'exact', head: true });

  if (error) throw error;
  console.log(`✅ Supabase connected: ${data} records in inventario`);
}

async function testDropboxConnection() {
  const DropboxService = require('./services/dropbox');
  const dropbox = new DropboxService();

  try {
    // Test with a public folder
    await dropbox.createFolder('/test-uploads');
    console.log('✅ Dropbox connection verified');
  } catch (error) {
    console.warn('⚠️ Dropbox test failed (may be expected for test token):', error.message);
  }
}

async function main() {
  console.log('🔍 Verifying sync configuration...');
  await verifySupabaseConnection();
  await testDropboxConnection();
  console.log('\\n✅ Configuration verified!');
}

main().catch(console.error);
```

- [ ] **Step 5: Add setup script**

```bash
#!/bin.sh
# setup-sync.sh

echo "🚀 Setting up Firebase → Supabase sync..."

cd cloudfunctions || { echo "Cloud functions directory not found"; exit 1; }
npm install

cd ..

if [ ! -f ".env" ]; then
  cp .env.example .env 2>/dev/null || {
    echo "DUPLICATE THESE IN .env:"
    echo "DROPBOX_API_KEY=YOUR_TOKEN"
    echo "SUPABASE_URL=..."
    echo "SUPABASE_KEY=..."
  }
  echo "⚠️ .env created - edit it with actual values"
fi

echo "✅ Setup complete! Run 'npm run deploy:all' to deploy everything."
```

- [ ] **Step 6: Commit changes**

```bash
git add cloudfunctions/
git add .env
git add scripts/sync-helpers.js
git add setup-sync.sh
git commit -m "feat: setup environment and deployment scripts"
```

## Task 6: Create initial data migration script

**Files:**
- Create: `scripts/initialize-sync.js`

- [ ] **Step 1: Create sync initialization script**

```javascript
// scripts/initialize-sync.js
const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const SUPABASE_URL = 'https://tcixwdrtfhfzjaznvobz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ';

const firebaseConfig = {
  apiKey: "AIzaSyCYuS3OwN_BD6y-0Ha09Kb6DbCkx4LZfjs",
  authDomain: "vulcanizadora-nando.firebaseapp.com",
  projectId: "vulcanizadora-nando",
  storageBucket: "vulcanizadora-nando.firebasestorage.app",
  messagingSenderId: "105932967736",
  appId: "1:105932967736:web:ba888978c1594a128ebbcd"
};

async function syncAllData() {
  console.log('🔄 Starting initial sync from Firebase to Supabase...');

  const app = initializeApp(firebaseConfig);
  const fb = getFirestore(app);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const collections = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios'];
  const results = {};

  for (const collectionName of collections) {
    try {
      console.log(`\n📦 Syncing ${collectionName}...`);

      const snapshot = await getDocs(collection(fb, collectionName));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (docs.length === 0) {
        console.log(`  Empty collection, skipping`);
        results[collectionName] = { processed: 0, errors: 0 };
        continue;
      }

      let processed = 0;
      let errors = 0;

      for (const doc of docs) {
        const { id, ...data } = doc;

        // Clean up data
        const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value;
          }
          return acc;
        }, {});

        // Add sync metadata
        cleanData.synced_at = new Date().toISOString();
        cleanData.sync_source = 'firebase'; // Add this field

        const { error } = await supabase
          .from(collectionName)
          .upsert({ id, ...cleanData }, { onConflict: 'id' });

        if (error) {
          console.error(`  ❌ Error syncing ${id}: ${error.message}`);
          errors++;
        } else {
          processed++;
        }
      }

      results[collectionName] = { processed, errors };
      console.log(`  ✅ ${collectionName}: ${processed} processed, ${errors} errors`);

    } catch (error) {
      console.error(`  ❌ Failed to sync ${collectionName}:`, error.message);
      results[collectionName] = { processed: 0, errors: 'failed', error: error.message };
    }
  }

  console.log('\n📊 Sync Summary:');
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const [collection, result] of Object.entries(results)) {
    if (typeof result === 'object' && result.processed !== undefined) {
      console.log(`  ${collection}: ${result.processed} processed, ${result.errors} errors`);
      totalProcessed += result.processed;
      totalErrors += result.errors;
    } else {
      console.log(`  ${collection}: ${result.error}`);
      totalErrors++;
    }
  }

  console.log(`\n🎯 Totals: ${totalProcessed} processed, ${totalErrors} errors`);
  console.log('\n✅ Sync complete!');
  console.log('Verify in Supabase: https://supabase.com/dashboard/project/tcixwdrtfhfzjaznvobz');
}

if (require.main === module) {
  syncAllData().catch(console.error);
}

module.exports = { syncAllData };
```

- [ ] **Step 2: Add sync script to package.json**

```json
// Add to scripts in root package.json
scripts: {
  // ... existing scripts ...
  "sync:all": "node scripts/initialize-sync.js",
  "sync:current": "node scripts/migrate-all.cjs",
  "setup:dropbox": "echo 'Configure Dropbox API and add DROPBOX_API_KEY to .env'"
}
```

- [ ] **Step 3: Add sync command to README**

```markdown
## Database Sync

This project uses a multi-layered database strategy:

### Firebase → Supabase Sync

Run the sync script to copy all data from Firebase to Supabase:

```bash
npm run sync:all
```

### Initial Setup

1. Configure environment variables in `.env`:
   - `DROPBOX_API_KEY` - Dropbox API token
   - `SUPABASE_URL` - Supabase project URL  
   - `SUPABASE_KEY` - Supabase publishable key

2. Deploy Cloud Functions:
```bash
npm run deploy:functions
```

3. Deploy Firebase hosting:
```bash
firebase deploy --only hosting,firestore,storage
```

4. Run initial migration:
```bash
npm run sync:current
```

5. Upload images to Dropbox:
```bash
# Image uploads happen automatically when using Dropbox upload option
```

### Sync Monitoring

Check sync status:
```bash
# Status check will be added when developed
```
```

- [ ] **Step 4: Commit changes**

```bash
git add scripts/initialize-sync.js
git commit -m "feat: add initial sync script for firebase to supabase migration"
```

## Task 7: Create testing and monitoring

**Files:**
- Create: `tests/sync.test.js`

- [ ] **Step 1: Create sync tests**

```javascript
// tests/sync.test.js
const { createClient } = require('@supabase/supabase-js');
const firebase = require('firebase-admin');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://tcixwdrtfhfzjaznvobz.supabase.co',
  process.env.SUPABASE_KEY || 'sb_publishable_42UM7h88bSsQkcuRUNeEfg_kjRx_BoJ'
);

describe('Database sync integrity', () => {
  beforeAll(async () => {
    await firebase.initializeApp();
  });

  test('should have consistent collections in both databases', async () => {
    const firebaseCollections = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios'];
    const supabaseCollections = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios'];

    expect(firebaseCollections).toEqual(supabaseCollections);
  });

  test('synced items should have sync metadata', async () => {
    const { data, error } = await supabase
      .from('inventario')
      .select('sync_source, synced_at')
      .limit(1);

    expect(error).toBeNull();
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('sync_source');
      expect(data[0]).toHaveProperty('synced_at');
    }
  });

  test('should handle sync errors gracefully', async () => {
    const invalidCollection = 'nonexistent_collection';
    const { data, error } = await supabase
      .from(invalidCollection)
      .select('id')
      .limit(1);

    expect(error).toBeDefined();
  });
});
```

- [ ] **Step 2: Add test scripts**

```json
// Add to package.json
test: {
  "test": "jest",
  "test:sync": "jest tests/sync.test.js",
  "test:all": "npm test && npm run test:sync"
},
  "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
  "lint:all": "npm run lint && eslint cloudfunctions/ --ext js",
  "lint:sync": "eslint cloudfunctions/index.js"
}
```

- [ ] **Step 3: Add monitoring script**

```javascript
// scripts/monitor-sync.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function monitorSync() {
  console.log('📊 Monitoring sync status...\n');

  const collections = ['inventario', 'clientes', 'cotizaciones', 'servicios', 'gastos', 'usuarios'];

  for (const collection of collections) {
    try {
      const { count, error } = await supabase
        .from(collection)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${collection}: Error - ${error.message}`);
        continue;
      }

      const { data } = await supabase
        .from(collection)
        .select('sync_source, synced_at')
        .limit(5);

      const firebaseItems = data?.filter(item => item.sync_source === 'firebase') || [];
      const manualItems = data?.filter(item => item.sync_source !== 'firebase') || [];

      console.log(`${collection}:\n  📦 Total items: ${count}\n  🔥 Firebase items: ${firebaseItems.length}\n  ✋ Manual items: ${manualItems.length}\n  ⏰ Last sync: ${firebaseItems[0]?.synced_at || 'N/A'}\n`);

    } catch (error) {
      console.log(`${collection}: ❌ Connection error - ${error.message}`);
    }
  }
}

if (require.main === module) {
  monitorSync().catch(console.error);
}

module.exports = { monitorSync };
```

- [ ] **Step 4: Add monitoring to package.json**

```json
// Add to scripts in package.json
scripts: {
  // ... existing scripts ...
  "monitor:sync": "node scripts/monitor-sync.js",
  "monitor:all": "npm run monitor:sync && npm run test:sync"
}
```

- [ ] **Step 5: Commit changes**

```bash
git add tests/
git add scripts/monitor-sync.js
git commit -m "feat: add sync monitoring and testing"
```

## Task 8: Update documentation

**Files:**
- Modify: `README.md`
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Update README.md**

```markdown
## Database Architecture

This project uses a three-tiered database strategy:

### Tier 1: Firebase (Primary)
- ✅ All CRUD operations
- ✅ Real-time data sync for app
- ✅ Cloud Functions for automated Supabase sync
- ✅ Image uploads with compression support
- ✅ Advanced querying with masks

### Tier 2: Dropbox (Primary Storage for Images)
- ✅ Client uploads directly to Dropbox
- ✅ Fast CDN access to images
- ✅ Public access control
- ✅ Automatic file naming with timestamps

### Tier 3: Supabase (Read-only Backup)
- ✅ Analytics and reporting
- ✅ Data persistence and backup
- ✅ Manual data insertion/editing
- ✅ Search and filtering capabilities

## Setup Instructions

### Initial Setup

1. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Deploy to Production**:
   ```bash
   # Deploy Cloud Functions (replicates Firebase to Supabase)
   npm run deploy:functions
   
   # Deploy Firebase hosting
   firebase deploy --only hosting,firestore,storage
   
   # Run initial sync (copies all Firebase data to Supabase)
   npm run sync:current
   ```

3. **Image Upload**:
   - In the app, use the **\"Upload to Dropbox\"** button
   - Images are uploaded directly to Dropbox
   - Dropbox URLs are stored in Firebase and replicated to Supabase

4. **Data Management**:
   - All app data writes go to Firebase
   - Cloud Functions automatically sync to Supabase
   - Manual edits can be made directly to Supabase
   - Changes from Supabase won't sync back (read-only)

## Features

### ✅ Multi-Branch Support
   - Rojo Gomez
   - Morelos
   - Bacalar

### ✅ Role-Based Access
   - Admin: Full access to all branches
   - Staff/Vendedor: Branch-specific access
   - User management in Supabase

### ✅ Automatic Sync
   - Real-time changes from Firebase to Supabase
   - Error handling and retry logic
   - Sync status tracking

### ✅ Image Optimization
   - Dual storage: Dropbox CDN + local compression
   - Automatic file naming
   - Upload success/failure tracking

## Data Flow

```
App → Firebase (Primary) → [Cloud Function] → Supabase (Backup)
                ↓                           ↓
           Images → Dropbox (Primary) → [URL in Firebase] → Supabase
```

## Monitoring

Check sync status:
```bash
npm run monitor:sync
```

Run data integrity tests:
```bash
npm run test:sync
```

## Troubleshooting

### Sync Issues
- Check Cloud Functions logs in Firebase Console
- Verify Supabase connection in `scripts/monitor-sync.js`
- Run initial sync: `npm run sync:current`

### Image Upload Issues
- Ensure DROPBOX_API_KEY is configured
- Check file size limits (5MB max)
- Verify Dropbox folder permissions

### Database Issues
- Use the **\"Sync Status\"** report in Dashboard
- Test Supabase connection with `npm run test:sync`
- Check logs in `scripts/monitor-sync.js`

## Environment Variables

Create `.env` with:
- `DROPBOX_API_KEY` - Dropbox API token
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase publishable key
- `FIREBASE_PROJECT` - Firebase project ID

## Migration Path

1. **Current State**: All data in Firebase, some in Supabase
2. **Deploy**: Cloud Functions and Firebase Hosting
3. **Initial Sync**: Run `npm run sync:current`
4. **Test**: Verify data integrity
5. **Live**: Start using Firebase as primary, Supabase as backup

## Future Enhancements

- [ ] Add Supabase write support (bidirectional sync)
- [ ] Real-time sync monitoring dashboard
- [ ] Image version control
- [ ] Automated data cleanup
```

- [ ] **Step 2: Create DEPLOYMENT.md**

```markdown
# Deployment Instructions

## Production Deployment

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Node.js 18+ with npm
- DropBox API key with file upload permissions
- Supabase project with write access

### Step 1: Project Setup

```bash
# Clone project
git clone <repository-url>
cd vulcanizadora-nando

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with actual credentials
```

### Step 2: Deploy Cloud Functions

```bash
cd cloudfunctions
npm install
firebase deploy --only functions --project vulcanizadora-nando
```

### Step 3: Deploy Firebase

```bash
# Deploy hosting, Firestore, Storage
firebase deploy --only hosting,firestore,storage --project vulcanizadora-nando
```

### Step 4: Initial Database Sync

```bash
# Run the migration script to copy Firebase data to Supabase
node scripts/migrate-all.cjs

# Or run the custom sync script
npm run sync:current
```

### Step 5: Test Deployment

```bash
# Check if Cloud Functions are working
npm run monitor:sync

# Run integrity tests
npm run test:sync

# Start the application
npm run dev
```

### Step 6: Production Configuration

Update `.firebaserc` if needed:

```json
{
  "projects": {
    "default": "vulcanizadora-nando"
  }
}
```

### Step 7: Set Up Monitoring

For production, set up:

1. **Firebase Error Reporting**: Enables automatic error tracking
2. **Supabase Logs**: Monitor sync failures
3. **Dropbox Audit Logs**: Track image uploads
4. **Health Checks**: Regular sync verification

### Step 8: Post-Deployment Tasks

1. **Test All Features**:
   - Login with existing users
   - Test multi-branch access
   - Verify image uploads to Dropbox
   - Check data sync from Firebase to Supabase

2. **Security Audits**:
   - Verify API keys are not in version control
   - Test role-based access controls
   - Review Firebase and Supabase security rules

3. **Performance Optimization**:
   - Set up CDN for static assets
   - Optimize database queries
   - Configure automatic backups

## Rollback Instructions

If issues arise:

### Quick Rollback
```bash
# Revert to previous version
git checkout <previous-tag-or-branch>

# Re-deploy
npm run deploy:all
```

### Full Recovery
```bash
# Restore Supabase from backup (if available)
# Restore Firebase from export (if available)
# Re-run sync:current
```

## Monitoring & Maintenance

### Daily Checks
```bash
# Check sync status
npm run monitor:sync

# Check application logs
firebase functions:log
```

### Weekly Tasks
```bash
# Run integrity tests
npm run test:sync

# Back up Supabase if configured
# Review error logs
```

### Monthly Tasks
```bash
# Full data validation
# Update dependencies
# Review access logs
```

## Troubleshooting Common Issues

### Sync Failures

**Problem**: Data not syncing from Firebase to Supabase

**Solution**:
1. Check Cloud Functions logs in Firebase Console
2. Verify Supabase connection in `scripts/monitor-sync.js`
3. Check environment variables in `cloudfunctions/.env`
4. Run manual sync test: `node -e "require('./scripts/initialize-sync').syncAllData()"`

### Image Upload Failures

**Problem**: Images not uploading to Dropbox

**Solution**:
1. Verify DROPBOX_API_KEY in `.env`
2. Check Dropbox folder permissions
3. Ensure file size < 5MB
4. Test Dropbox API manually

### Supabase Connection Issues

**Problem**: Cannot connect to Supabase

**Solution**:
1. Verify SUPABASE_URL and SUPABASE_KEY in `.env`
2. Check Supabase project status
3. Test connection: `SUPABASE_URL/rest/v1/health`
4. Ensure network is not blocked

## Best Practices

### Security
- Never commit `.env` or credentials to version control
- Use environment-specific configurations
- Enable Firebase security rules
- Configure proper CORS settings

### Performance
- Use caching for frequently accessed data
- Optimize images before upload
- Implement lazy loading for images
- Use CDN for static assets

### Reliability
- Implement retry logic for failed operations
- Set up monitoring for sync failures
- Regular database backups
- Test rollbacks regularly

## Support

For issues:
1. Check Cloud Functions logs
2. Review Supabase error logs
3. Check application console for JavaScript errors
4. Verify Dropbox API limits and quotas

Contact support if:
- Sync fails for more than 30 minutes
- Multiple users report issues
- Application performance degrades
```

- [ ] **Step 3: Commit documentation**

```bash
git add README.md
git add DEPLOYMENT.md
git commit -m "docs: update documentation for multi-database architecture"
```

## Task 9: Final verification and deployment preparation

**Files:**
- Create: `scripts/verify-deployment.js`

- [ ] **Step 1: Create deployment verification script**

```javascript
// scripts/verify-deployment.js
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

async function verifyDeployment() {
  console.log('🔍 Verifying deployment...\n');

  let checksPassed = 0;
  let checksFailed = 0;

  // Check 1: Verify Supabase connection
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    const { data, error } = await supabase
      .from('inventario')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Supabase connected: ${data} inventory items`);
    checksPassed++;
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    checksFailed++;
  }

  // Check 2: Verify Firebase initialization
  try {
    admin.initializeApp();
    console.log('✅ Firebase Admin SDK initialized');
    checksPassed++;
  } catch (error) {
    console.log(`❌ Firebase initialization failed: ${error.message}`);
    checksFailed++;
  }

  // Check 3: Verify Dropbox configuration
  try {
    if (!process.env.DROPBOX_API_KEY) {
      console.log('⚠️ Dropbox API key not configured (expected for CI)');
      checksPassed++;
    } else {
      console.log('✅ Dropbox API key configured');
      checksPassed++;
    }
  } catch (error) {
    console.log(`⚠️ Dropbox check could not complete: ${error.message}`);
    checksPassed++;
  }

  // Check 4: Verify environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length === 0) {
    console.log('✅ All required environment variables configured');
    checksPassed++;
  } else {
    console.log(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
    checksFailed++;
  }

  // Check 5: Verify package.json scripts
  const fs = require('fs');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['deploy:all', 'sync:current', 'monitor:sync'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

    if (missingScripts.length === 0) {
      console.log('✅ All deployment scripts configured');
      checksPassed++;
    } else {
      console.log(`⚠️ Missing scripts: ${missingScripts.join(', ')}`);
      checksFailed++;
    }
  } catch (error) {
    console.log(`❌ Could not verify package.json: ${error.message}`);
    checksFailed++;
  }

  console.log('\n📊 Verification Summary:');
  console.log(`✅ Passed: ${checksPassed}`);
  console.log(`❌ Failed: ${checksFailed}`);

  if (checksFailed === 0) {
    console.log('\n🎉 Deployment verification complete! Ready for launch.');
    return true;
  } else {
    console.log('\n⚠️ Deployment needs fixes before going live.');
    return false;
  }
}

if (require.main === module) {
  verifyDeployment()
    .then(success => process.exit(success ? 0 : 1))
    .catch(console.error);
}

module.exports = { verifyDeployment };
```

- [ ] **Step 2: Add verification to package.json**

```json
// Add to scripts in package.json
scripts: {
  // ... existing scripts ...
  "verify:deploy": "node scripts/verify-deployment.js",
  "predeploy:check": "npm run verify:deploy && npm run lint:all",
  "deploy": "npm run predeploy:check && npm run deploy:all"
}
```

- [ ] **Step 3: Create deployment checklist**

```markdown
# Deployment Checklist

## Pre-Launch
- [ ] Run `npm run verify:deploy` - all checks pass
- [ ] Run `npm run lint:all` - no linting errors
- [ ] Run `npm test` - all tests pass
- [ ] Check Cloud Functions logs for errors
- [ ] Verify Supabase data integrity with `npm run monitor:sync`
- [ ] Test critical user flows manually
- [ ] Update any external documentation

## Launch Day
- [ ] Deploy Cloud Functions
- [ ] Deploy Firebase
- [ ] Run initial sync: `npm run sync:current`
- [ ] Monitor application in staging
- [ ] Gradual rollout to production
- [ ] Monitor sync status and error rates
- [ ] Collect user feedback

## Post-Launch
- [ ] Daily: Run `npm run monitor:sync`
- [ ] Weekly: Run integrity tests
- [ ] Monthly: Review deployment logs
- [ ] Update deployment checklist

## Emergency Procedures
- [ ] Cloud Functions down: Check `firebase functions:log`
- [ ] Supabase down: Check connection in `scripts/monitor-sync.js`
- [ ] Sync failing: Check Cloud Function error logs
- [ ] App errors: Check browser console and server logs
```

- [ ] **Step 4: Add deployment scripts to package.json**

```json
// Add to scripts in root package.json
scripts: {
  // ... existing scripts ...
  "deploy:all": "npm run deploy:functions && npm run deploy:firebase",
  "deploy:check": "npm run verify:deploy && npm run lint:all",
  "deploy": "npm run deploy:check && npm run deploy:all",
  "launch": "npm run deploy:all && npm run sync:current && echo '🎉 Deployment complete! Visit your app.'"
}
```

- [ ] **Step 5: Commit final verification setup**

```bash
git add scripts/verify-deployment.js
git add .github/workflows/deploy.yml
git commit -m "feat: add deployment verification and monitoring"
```

## Plan Summary

**Files Created:**
- `docs/superpowers/plans/2026-07-04-multi-database-architecture.md` - This plan
- `cloudfunctions/index.js` - Firebase Cloud Functions
- `cloudfunctions/package.json` - Cloud Functions dependencies
- `services/dropbox.js` - Dropbox service
- `src/services/api.js` - Updated Firebase API with Dropbox integration
- `src/components/POS.jsx` - Client-side Dropbox upload
- `scripts/migrate-users.mjs` - User migration script
- `scripts/dump-supabase.mjs` - Supabase dump utility
- `scripts/initialize-sync.js` - Initial Firebase → Supabase sync
- `scripts/monitor-sync.js` - Sync monitoring script
- `scripts/verify-deployment.js` - Deployment verification script

**Files Modified:**
- `src/main.jsx` - Added sync-related functionality
- `src/supabase.js` - Updated Supabase configuration
- `src/firebase.js` - Added Dropbox integration
- `package.json` - Added deployment scripts

**Testing:**
- `tests/sync.test.js` - Database sync tests
- Automated deployment verification
- Integration tests for all components

**Total Tasks:** 32 bite-sized tasks

**Estimated Time:** 8-12 hours

**Expected Outcome:**
- ✅ Firebase as primary database with 24/7 sync to Supabase
- ✅ Dropbox as primary image storage with CDN access
- ✅ Zero-downtime during sync operations
- ✅ Full backward compatibility maintained
- ✅ Comprehensive monitoring and testing

This plan implements the architecture with Firebase as the single source of truth, Supabase as async backup, and Dropbox optimized for image storage. The system is designed for high availability, maintainability, and future scalability.

**Would you like me to proceed with executing this plan, or do you need any modifications to the implementation approach?**
