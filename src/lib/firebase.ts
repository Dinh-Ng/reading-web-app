import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

const firebaseConfig = {
  apiKey: "AIzaSyASFwpj_CYL_opCvgCKdMCdoO27YM4ICTQ",
  authDomain: "reading-app-bdf29.firebaseapp.com",
  projectId: "reading-app-bdf29",
  storageBucket: "reading-app-bdf29.firebasestorage.app",
  messagingSenderId: "641330265952",
  appId: "1:641330265952:web:0fde6d7b780be23c92a805",
  measurementId: "G-9SECSDPC5P"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

