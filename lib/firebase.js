import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBL0tNp6K4hYAJiIkuflGvR_8nGMlCWeg4",
  authDomain: "chamcong-8e3b2.firebaseapp.com",
  projectId: "chamcong-8e3b2",
  storageBucket: "chamcong-8e3b2.firebasestorage.app",
  messagingSenderId: "502365760515",
  appId: "1:502365760515:web:ea1028d518591df768f236"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
