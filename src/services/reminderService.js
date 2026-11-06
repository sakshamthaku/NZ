import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase/Firebase";

export async function createReminder({
  title,
  reminderTime,
  email,
  message,
}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  if (!title || !reminderTime || !email) {
    throw new Error("Title, time and email are required.");
  }

  const reminderData = {
    uid: user.uid,
    title,
    reminderTime,
    email,
    message: message || `Hey! Your ${title} is coming soon.`,
    enabled: true,
    sentFirst: false,
    sentSecond: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const reminderRef = await addDoc(
    collection(db, "reminders"),
    reminderData
  );

  return reminderRef.id;
}

export async function disableReminder(reminderId) {
  if (!reminderId) {
    throw new Error("Reminder ID is required.");
  }

  await updateDoc(doc(db, "reminders", reminderId), {
    enabled: false,
    updatedAt: serverTimestamp(),
  });
}