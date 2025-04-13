// Firebase client configuration 
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBOmrpdk6LgjhuZTc5pBqPjklmWf7AuIrs",
  authDomain: "connectapp-62b00.firebaseapp.com",
  projectId: "connectapp-62b00",
  storageBucket: "connectapp-62b00.firebasestorage.app",
  messagingSenderId: "127729011643",
  appId: "1:127729011643:web:daed584ebd98e31809929e",
  measurementId: "G-MC2QEWM1XT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };