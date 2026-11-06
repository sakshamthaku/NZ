
 import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

// Real-time Users Subscription
export const subscribeToUsers = (callback) => {
  const q = collection(db, "users");
  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(users);
    },
    (error) => {
      console.error("Error subscribing to users:", error);
    }
  );
};

// Real-time Notes Subscription
export const subscribeToNotes = (callback) => {
  const q = collection(db, "notes");
  return onSnapshot(
    q,
    (snapshot) => {
      const notes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(notes);
    },
    (error) => {
      console.error("Error subscribing to notes:", error);
    }
  );
};

// Total Users Count (One-time fetch)
export const getTotalUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.size;
};

// Total Notes Count (One-time fetch)
export const getTotalNotes = async () => {
  const snapshot = await getDocs(collection(db, "notes"));
  return snapshot.size;
};

// Get All Users (One-time fetch)
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Get All Notes (One-time fetch)
export const getAllNotes = async () => {
  const snapshot = await getDocs(collection(db, "notes"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Recently Registered Users
export const getRecentUsers = async () => {
  const q = query(
    collection(db, "users"),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Update User
export const updateUser = async (id, updatedData) => {
  const userRef = doc(db, "users", id);
  await updateDoc(userRef, updatedData);
};

// Delete User
export const deleteUser = async (id) => {
  const userRef = doc(db, "users", id);
  await deleteDoc(userRef);
};

// Update Note
export const updateNote = async (id, updatedData) => {
  const noteRef = doc(db, "notes", id);
  await updateDoc(noteRef, updatedData);
};

// Delete Note
export const deleteNote = async (id) => {
  const noteRef = doc(db, "notes", id);
  await deleteDoc(noteRef);
};