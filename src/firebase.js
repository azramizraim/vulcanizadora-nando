import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCYuS3OwN_BD6y-0Ha09Kb6DbCkx4LZfjs",
  authDomain: "vulcanizadora-nando.firebaseapp.com",
  projectId: "vulcanizadora-nando",
  storageBucket: "vulcanizadora-nando.firebasestorage.app",
  messagingSenderId: "105932967736",
  appId: "1:105932967736:web:ba888978c1594a128ebbcd"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
