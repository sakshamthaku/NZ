import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "./Firebase";

export const createUserProfile = async (uid, userData) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, userData);
  } else {
    await updateDoc(userRef, { online: true, lastSeen: new Date().toISOString() });
  }
};

export const getUserProfile = async (uid) => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

export const setUserOnlineStatus = async (uid, isOnline) => {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    online: isOnline,
    lastSeen: new Date().toISOString()
  }).catch(() => {});
};

export const updateUserProfileData = async (uid, updates) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, updates);
};

export const searchUsersByTerm = async (searchTerm) => {
  const q = query(collection(db, "users"));
  const querySnapshot = await getDocs(q);
  const results = [];
  const term = searchTerm.toLowerCase();
  
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (
      data.username?.toLowerCase().includes(term) ||
      data.email?.toLowerCase().includes(term)
    ) {
      results.push(data);
    }
  });
  return results;
};

export const listenToUser = (uid, callback) => {
  return onSnapshot(doc(db, "users", uid), (docSnap) => {
    if (docSnap.exists()) callback(docSnap.data());
  });
};