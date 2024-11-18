import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4Jj5pQTM1WepQvr5ASAYvXc-fkMlN32o",
  authDomain: "cash-book-82627.firebaseapp.com",
  projectId: "cash-book-82627",
  storageBucket: "cash-book-82627.firebasestorage.app",
  messagingSenderId: "953964901653",
  appId: "1:953964901653:web:2a7c9547847ed3bc44a51c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);