import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { db, storage } from "./firebase";

export const createNotification = async (receiverId, senderId, senderName, type, message) => {
  await addDoc(collection(db, "notifications"), {
    receiverId,
    senderId,
    senderName,
    type,
    message,
    read: false,
    createdAt: new Date().toISOString()
  });
};

export const listenToNotifications = (uid, callback) => {
  const q = query(
    collection(db, "notifications"),
    where("receiverId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const list = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(list);
  });
};

export const markNotificationRead = async (notificationId) => {
  const ref = doc(db, "notifications", notificationId);
  await updateDoc(ref, { read: true });
};