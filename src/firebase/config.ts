import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração direta e segura para o ALMA Guardia
const firebaseConfig = {
  apiKey: "AIzaSyARUFMEZXmZRD2GJEbQb4BrthjiVHc-mSA",
  authDomain: "brave-drive-472322-m2.firebaseapp.com",
  projectId: "brave-drive-472322-m2",
  storageBucket: "brave-drive-472322-m2.firebasestorage.app",
  messagingSenderId: "768402541625",
  appId: "1:768402541625:web:cf3ae4a28647d60c9491e8" 
};

// Inicializa o Firebase (impede erro de múltiplas instâncias)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth, firebaseConfig };