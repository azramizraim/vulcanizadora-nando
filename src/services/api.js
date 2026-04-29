import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, doc, runTransaction, query, where } from 'firebase/firestore';

export { db, storage };
export const BRANCHES = ['Rojo Gomez', 'Morelos', 'Bacalar'];

// Super robust fetchData to NEVER hang
export const fetchData = async (collectionName, branchName) => {
  console.log(`[API] Start fetch ${collectionName} for '${branchName}'`);
  
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      console.warn(`[API] Timeout for ${collectionName}`);
      resolve([]);
    }, 10000); // 10s para redes lentas
  });

  const fetchPromise = (async () => {
    try {
      if (!branchName) return [];
      const q = query(collection(db, collectionName), where("branch", "==", branchName));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[API] Success ${collectionName} items: ${results.length}`);
      
      if (results.length === 0 && collectionName === 'Inventario') {
         mockSeed(branchName);
      }
      
      return results;
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.error("FIREBASE ERROR: Revisa las reglas de seguridad en la consola de Firebase.");
      }
      console.error(`[API ERROR] ${collectionName}:`, error);
      return [];
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
};

// Non-blocking seeding
const mockSeed = async (branchName) => {
  try {
    const mockItems = [
      { sku: '11856799', brand: 'Goodyear', name: 'Eagle Sport 2205/55R16 91V', qty: 20, price: 2000, img: 'https://http2.mlstatic.com/D_NQ_NP_764592-MLA99442568452_112025-O.webp', branch: branchName },
      { sku: '46047361', brand: 'Kumho', name: 'Ecsta PS31 215/45R17', qty: 16, price: 1600, img: 'https://www.misterllantas.com/media/catalog/product/cache/860b7a2c70b7e271930e7a9c3934662d/k/u/kumho_ps31_ecsta_4.jpg', branch: branchName }
    ];
    for (const item of mockItems) {
      addDoc(collection(db, 'Inventario'), item);
    }
  } catch (e) {
    console.error("Seed Error", e);
  }
}

export const postData = async (collectionName, dataObj) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), dataObj);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`[API ERROR] posting to ${collectionName}:`, error);
    return { success: false };
  }
};

export const updateStock = async (documentId, qtyToSubtract) => {
  if (!documentId) return { success: false };
  try {
    const itemRef = doc(db, 'Inventario', documentId);
    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) throw "No existe el documento";
      const newQty = Math.max(0, (parseInt(itemDoc.data().qty) || 0) - qtyToSubtract);
      transaction.update(itemRef, { qty: newQty });
    });
    return { success: true };
  } catch (error) {
    console.error("[API ERROR] updateStock", error);
    return { success: false };
  }
};
