import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";


import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBWWGqPBbhhdJ8UWXJkCjlG7MC2_Kv40fA",
  authDomain: "notez-b1322.firebaseapp.com",
  projectId: "notez-b1322",
  storageBucket: "notez-b1322.firebasestorage.app",
  messagingSenderId: "767968300387",
  appId: "1:767968300387:web:7fc5e8238f13e896991756",
  measurementId: "G-19E9W6YBXC",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics
const analytics = getAnalytics(app);

// Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Google Authentication
export const googleProvider = new GoogleAuthProvider();

// Firebase Storage
export const storage = getStorage(app);

// Export app and analytics
export { app, analytics };