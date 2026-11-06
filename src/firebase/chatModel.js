import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { db, storage } from "./Firebase";

export const getOrCreateChatId = async (currentUid, targetUid) => {
  const chatId = currentUid < targetUid 
    ? `${currentUid}_${targetUid}` 
    : `${targetUid}_${currentUid}`;
    
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      chatId,
      members: [currentUid, targetUid],
      lastMessage: "",
      updatedAt: new Date().toISOString(),
      typing: { [currentUid]: false, [targetUid]: false }
    });
  }
  return chatId;
};

export const listenToUserChats = (uid, callback) => {
  const q = query(collection(db, "chats"), where("members", "array-contains", uid));
  return onSnapshot(q, (snapshot) => {
    const chats = [];
    snapshot.forEach((docSnap) => chats.push(docSnap.data()));
    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    callback(chats);
  });
};

export const listenToMessages = (chatId, callback) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(messages);
  });
};

export const sendMessageInChat = async (chatId, senderId, receiverId, payload) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  await addDoc(messagesRef, {
    chatId,
    senderId,
    receiverId,
    text: payload.text || "",
    image: payload.image || "",
    replyTo: payload.replyTo || null,
    seen: false,
    edited: false,
    createdAt: new Date().toISOString()
  });

  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: payload.text ? payload.text : (payload.image ? "📷 Attachment" : "File"),
    updatedAt: new Date().toISOString()
  });
};

export const setTypingState = async (chatId, uid, isTyping) => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    [`typing.${uid}`]: isTyping
  }).catch(() => {});
};

export const markMessagesAsSeen = async (chatId, currentUid) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    where("receiverId", "==", currentUid),
    where("seen", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    snapshot.forEach(async (docSnap) => {
      await updateDoc(doc(db, "chats", chatId, "messages", docSnap.id), { seen: true });
    });
  });
};

export const updateChatMessage = async (chatId, messageId, newText) => {
  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  await updateDoc(msgRef, {
    text: newText,
    edited: true
  });
};

export const deleteChatMessage = async (chatId, messageId) => {
  const msgRef = doc(db, "chats", chatId, "messages", messageId);
  await deleteDoc(msgRef);
};