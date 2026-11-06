import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase/Firebase";

 import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { toast } from "react-toastify";

/* ==========================================================================
   NOTEZ MODERN EDUCATIONAL CHAT SYSTEM (`pages/Chat.jsx`)
   Theme: Calm, Clean, Educational (Notion/Google Workspace style with #22C55E)
   ========================================================================== */

// ================================================================
// BROWSER MESSAGE NOTIFICATION (ADDED ONLY — EXISTING LOGIC UNCHANGED)
// ================================================================
const requestChatNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn("NoteZ notification permission error:", error);
    }
  }
};

const showChatBrowserNotification = ({ senderName, text, conversationId }) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const cleanText = String(text || "New message").trim();
  const body = cleanText.length > 120 ? `${cleanText.slice(0, 117)}...` : cleanText;

  try {
    const notification = new Notification(
      `${senderName || "New message"} • NoteZ Chat`,
      {
        body,
        icon: "/notez-logo.png",
        badge: "/notez-logo.png",
        tag: `notez-chat-${conversationId || "message"}`,
        renotify: true,
      }
    );

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.warn("NoteZ browser notification error:", error);
  }
};

function Chat() {
  const currentUser = auth.currentUser || JSON.parse(localStorage.getItem("currentUser") || "null");
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const profileKey = `notez_chat_profile_${currentUser?.uid || "guest"}`;
  const [profile, setProfile] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(profileKey) || "null");
      return {
        name: saved?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Student",
        photo: saved?.photo || currentUser?.photoURL || ""
      };
    } catch {
      return { name: currentUser?.displayName || "Student", photo: currentUser?.photoURL || "" };
    }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(profile.name);
  const [profilePhotoInput, setProfilePhotoInput] = useState(profile.photo);

  // Real-time classmate profile cache (custom username + photo).
  const [conversationProfiles, setConversationProfiles] = useState({});
  const [peerProfile, setPeerProfile] = useState(null);

  const messagesEndRef = useRef(null);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sendingAttachment, setSendingAttachment] = useState(false);
  const [friends, setFriends] = useState([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
  const [friendZoneOpen, setFriendZoneOpen] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState({});

  // Request notification permission once when Chat opens.
  useEffect(() => {
    requestChatNotificationPermission();
  }, []);

  // Prevent notifications for messages that were already present when a chat listener starts.
  const initializedConversationNotifications = useRef(new Set());
  const knownMessageIds = useRef(new Set());

  // Persist local profile so refresh does not reset the user
  useEffect(() => {
    if (!currentUser?.uid) return;
    localStorage.setItem(profileKey, JSON.stringify(profile));
  }, [profile, currentUser?.uid]);


  // Persist profile locally and keep it synchronized with Firestore.
  useEffect(() => {
    if (!currentUser?.uid) return;
    localStorage.setItem(profileKey, JSON.stringify(profile));
  }, [profile, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    return onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const next = {
        name: data.chatUsername || data.displayName || profile.name || "Student",
        photo: data.photoURL || ""
      };
      setProfile((prev) =>
        prev.name === next.name && prev.photo === next.photo ? prev : next
      );
    });
  }, [currentUser?.uid]);

  // Persistent real-time Friend Zone, maximum five accepted friends.
  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    return onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      const ids = snap.exists() ? snap.data().friendIds : [];
      setFriends(Array.isArray(ids) ? ids.slice(0, 5) : []);
    });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;
    const q = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
      setIncomingFriendRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      );
    });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!friends.length) {
      setFriendProfiles({});
      return undefined;
    }
    const unsubs = friends.map((uid) =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        setFriendProfiles((prev) => ({
          ...prev,
          [uid]: snap.exists() ? { uid, ...snap.data() } : { uid }
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [friends.join("|")]);

  const sendFriendRequest = async (targetUser) => {
    if (!currentUser?.uid || !targetUser?.uid || targetUser.uid === currentUser.uid) return;
    if (friends.includes(targetUser.uid)) {
      toast.info("Already your friend");
      return;
    }
    if (friends.length >= 5) {
      toast.error("Friend Zone is full. Maximum 5 friends.");
      return;
    }

    try {
      const q = query(
        collection(db, "friendRequests"),
        where("senderId", "==", currentUser.uid),
        where("receiverId", "==", targetUser.uid),
        where("status", "==", "pending")
      );
      if (!(await getDocs(q)).empty) {
        toast.info("Friend request already sent");
        return;
      }

      await addDoc(collection(db, "friendRequests"), {
        senderId: currentUser.uid,
        receiverId: targetUser.uid,
        senderName: profile.name,
        senderPhoto: profile.photo || "",
        receiverName: targetUser.chatUsername || targetUser.displayName || targetUser.email?.split("@")[0] || "Student",
        receiverPhoto: targetUser.photoURL || "",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Friend request sent 💚");
    } catch (error) {
      console.error(error);
      toast.error("Could not send friend request");
    }
  };

  const acceptFriendRequest = async (request) => {
    if (friends.length >= 5) {
      toast.error("Friend Zone is full. Maximum 5 friends.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friendIds: arrayUnion(request.senderId)
      });
      await updateDoc(doc(db, "users", request.senderId), {
        friendIds: arrayUnion(currentUser.uid)
      });
      await updateDoc(doc(db, "friendRequests", request.id), {
        status: "accepted",
        updatedAt: serverTimestamp()
      });
      toast.success(`✓ You are now friends with ${request.senderName || "this person"}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not accept request");
    }
  };

  const declineFriendRequest = async (request) => {
    try {
      await updateDoc(doc(db, "friendRequests", request.id), {
        status: "declined",
        updatedAt: serverTimestamp()
      });
      toast.info("Friend request declined");
    } catch {
      toast.error("Could not decline request");
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        friendIds: arrayRemove(friendId)
      });
      await updateDoc(doc(db, "users", friendId), {
        friendIds: arrayRemove(currentUser.uid)
      });
      toast.success("Friend removed");
    } catch {
      toast.error("Could not remove friend");
    }
  };

  const openProfileEditor = () => {
    setProfileNameInput(profile.name);
    setProfilePhotoInput(profile.photo);
    setProfileOpen(true);
  };

  const handleProfilePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setProfilePhotoInput(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    const name = profileNameInput.trim() || "Student";
    const nextProfile = { name, photo: profilePhotoInput || "" };
    setProfile(nextProfile);
    setProfileOpen(false);
    if (currentUser?.uid) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), { displayName: name, chatUsername: name, photoURL: nextProfile.photo }, { merge: true });
        toast.success("Profile updated");
      } catch {
        toast.success("Profile saved on this device");
      }
    }
  };

  // 1. Sync User Online Status & Profile on Mount
  useEffect(() => {
    if (!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid || currentUser.uid);
    
    // Set online
    setDoc(userRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
      email: currentUser.email || "",
      // Keep the user's custom NoteZ Chat identity instead of resetting it
      // from Firebase Auth whenever the profile changes or the page refreshes.
      displayName: profile.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Student",
      chatUsername: profile.name || currentUser.displayName || currentUser.email?.split("@")[0] || "Student",
      photoURL: profile.photo || currentUser.photoURL || "",
    }, { merge: true });

    // Set offline on unmount / window close
    const handleUnload = () => {
      updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
    };
  }, [currentUser, profile]);

  // 2. Fetch Conversations Real-time (Firestore onSnapshot)
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setConversations(convs);
    }, (error) => {
      console.error("Error fetching conversations:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. REAL-TIME CLASSMATE PROFILES
  // Each participant's users/{uid} document is listened to directly.
  // A username/photo change therefore appears in the chat without refresh.
  useEffect(() => {
    if (!currentUser?.uid || conversations.length === 0) {
      setConversationProfiles({});
      return undefined;
    }

    const peerIds = [...new Set(
      conversations
        .flatMap((conversation) => conversation.participants || [])
        .filter((uid) => uid && uid !== currentUser.uid)
    )];

    if (peerIds.length === 0) {
      setConversationProfiles({});
      return undefined;
    }

    const unsubscribers = peerIds.map((uid) => {
      const userRef = doc(db, "users", uid);
      return onSnapshot(userRef, (snapshot) => {
        if (!snapshot.exists()) {
          setConversationProfiles((prev) => ({
            ...prev,
            [uid]: { uid, displayName: "Classmate", photoURL: "", isOnline: false },
          }));
          return;
        }

        setConversationProfiles((prev) => ({
          ...prev,
          [uid]: { uid, ...snapshot.data() },
        }));
      }, (error) => {
        console.error("Real-time classmate profile error:", error);
      });
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentUser?.uid, conversations]);

  // 4. REAL-TIME ACTIVE CLASSMATE PROFILE
  // Keeps the open chat header synchronized with the other user's profile.
  useEffect(() => {
    if (!activeConversation || !currentUser?.uid) {
      setPeerProfile(null);
      return undefined;
    }

    const otherUserId = (activeConversation.participants || [])
      .find((uid) => uid !== currentUser.uid);

    if (!otherUserId) {
      setPeerProfile(null);
      return undefined;
    }

    const peerRef = doc(db, "users", otherUserId);
    const unsubscribe = onSnapshot(peerRef, (snapshot) => {
      if (snapshot.exists()) {
        setPeerProfile({ uid: snapshot.id, ...snapshot.data() });
      } else {
        setPeerProfile({ uid: otherUserId, displayName: "Classmate", photoURL: "", isOnline: false });
      }
    }, (error) => {
      console.error("Active classmate profile error:", error);
    });

    return () => unsubscribe();
  }, [activeConversation?.id, currentUser?.uid]);

  // 5. Fetch Messages for Active Conversation
  useEffect(() => {
    if (!activeConversation?.id) return;

    const msgQuery = query(
      collection(db, "conversations", activeConversation.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(msgQuery, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      // ADDED: browser notification for a genuinely new incoming message.
      const conversationId = activeConversation.id;
      const isInitialLoad = !initializedConversationNotifications.current.has(conversationId);

      snapshot.docChanges().forEach((change) => {
        if (change.type !== "added") return;

        const incoming = { id: change.doc.id, ...change.doc.data() };
        const alreadyKnown = knownMessageIds.current.has(incoming.id);

        if (!alreadyKnown && !isInitialLoad && incoming.senderId && incoming.senderId !== currentUser?.uid && !incoming.deleted) {
          const senderName =
            activeConversation.peer?.displayName ||
            activeConversation.peer?.email?.split("@")[0] ||
            "Someone";

          // Notify when the user is not actively viewing the page.
          if (document.visibilityState !== "visible" || document.hidden) {
            showChatBrowserNotification({
              senderName,
              text: incoming.text,
              conversationId,
            });
          }
        }

        knownMessageIds.current.add(incoming.id);
      });

      initializedConversationNotifications.current.add(conversationId);
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [activeConversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 6. Search Users by Name or Chat ID
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const snap = await getDocs(usersRef);
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => 
            u.uid !== currentUser?.uid &&
            ((u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              u.chatUsername?.toLowerCase().includes(searchTerm.toLowerCase())) ||
             u.chatId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        setSearchResults(list);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  // 7. Start or Open Chat with User
  const handleSelectUser = async (targetUser) => {
    if (!currentUser?.uid) return;

    // Check if conversation already exists
    const existing = conversations.find(c => 
      c.participants && 
      c.participants.includes(targetUser.uid || targetUser.id) &&
      c.participants.includes(currentUser.uid)
    );

    if (existing) {
      setActiveConversation({
        ...existing,
        peer: targetUser
      });
    } else {
      // Create new conversation
      try {
        const newConvRef = await addDoc(collection(db, "conversations"), {
          participants: [currentUser.uid, targetUser.uid || targetUser.id],
          updatedAt: serverTimestamp(),
          lastMessage: "Started a conversation"
        });
        setActiveConversation({
          id: newConvRef.id,
          participants: [currentUser.uid, targetUser.uid || targetUser.id],
          peer: targetUser
        });
      } catch (err) {
        toast.error("Failed to start conversation");
      }
    }
    setMobileShowChat(true);
    setSearchTerm("");
    setIsSearching(false);
  };


  // Normal study attachments: photos/documents can be downloaded by the recipient.
  const handleSendAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeConversation?.id || !currentUser?.uid) return;

    const allowed =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.type.includes("word") ||
      file.type.includes("officedocument") ||
      file.type === "text/plain" ||
      file.type === "text/csv";

    if (!allowed) {
      toast.error("Choose a photo, PDF, Word, TXT or CSV document.");
      return;
    }
    if (file.size > 850 * 1024) {
      toast.error("For now, choose a file under 850 KB.");
      return;
    }

    setSendingAttachment(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read file."));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

      const type = file.type.startsWith("image/") ? "studyPhoto" : "studyDocument";

      await addDoc(
        collection(db, "conversations", activeConversation.id, "messages"),
        {
          type,
          senderId: currentUser.uid,
          receiverId: activeConversation.participants?.find((id) => id !== currentUser.uid) || "",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileData: dataUrl,
          downloadable: true,
          createdAt: serverTimestamp(),
          deleted: false
        }
      );

      await updateDoc(doc(db, "conversations", activeConversation.id), {
        lastMessage: type === "studyPhoto" ? `📷 ${file.name}` : `📄 ${file.name}`,
        updatedAt: serverTimestamp()
      });
      toast.success(type === "studyPhoto" ? "Photo sent" : "Document sent");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Could not send file");
    } finally {
      setSendingAttachment(false);
    }
  };

  const downloadAttachment = (msg) => {
    if (!msg?.fileData) {
      toast.error("File is no longer available.");
      return;
    }
    const link = document.createElement("a");
    link.href = msg.fileData;
    link.download = msg.fileName || "notez-file";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // 8. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation?.id || !currentUser?.uid) return;

    const textToSend = messageText.trim();
    setMessageText("");

    try {
      const msgRef = collection(db, "conversations", activeConversation.id, "messages");
      await addDoc(msgRef, {
        senderId: currentUser.uid,
        text: textToSend,
        createdAt: serverTimestamp(),
        edited: false,
        deleted: false
      });

      // Update conversation last message
      const convRef = doc(db, "conversations", activeConversation.id);
      await updateDoc(convRef, {
        lastMessage: textToSend,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  // 9. Message Action Handlers (Delete / Copy)
  const handleDeleteMessage = async (msgId) => {
    if (!activeConversation?.id) return;
    try {
      const msgDocRef = doc(db, "conversations", activeConversation.id, "messages", msgId);
      await updateDoc(msgDocRef, { deleted: true, text: "This message was deleted." });
      toast.success("Message deleted");
    } catch (err) {
      toast.error("Could not delete message");
    }
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getPeerId = (conversation) =>
    conversation?.participants?.find((uid) => uid !== currentUser?.uid) || null;

  const getPeerProfile = (conversation) => {
    const peerId = getPeerId(conversation);
    return (peerId && conversationProfiles[peerId]) || conversation?.peer || null;
  };

  return (
    <div className="notez-chat-layout">
      <style>{`
        .notez-chat-layout{min-height:100vh;background:radial-gradient(circle at 10% 0%,#e9fff0 0,#f7fbf8 34%,#eef6f1 100%);color:#102219;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
        .chat-container-main{width:min(1440px,100%);margin:0 auto;min-height:calc(100vh - 150px);padding:22px clamp(12px,3vw,34px);box-sizing:border-box;display:flex;flex-direction:column;gap:14px;}
        .chat-search-bar-wrapper{position:relative;z-index:30;animation:notezRise .45s ease both}.chat-search-input{box-sizing:border-box;width:100%;height:52px;padding:0 18px 0 48px;border:1px solid #d8e9dd;border-radius:17px;background:rgba(255,255,255,.88);box-shadow:0 10px 30px rgba(22,101,52,.07);font-size:15px;color:#14261b;outline:0;transition:.2s}.chat-search-input:focus{border-color:#35c96b;box-shadow:0 0 0 4px rgba(34,197,94,.12),0 12px 35px rgba(22,101,52,.1)}.search-icon-pos{position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:17px;color:#5c7866;pointer-events:none}.search-results-dropdown{position:absolute;top:58px;left:0;right:0;background:#fff;border:1px solid #dcebe1;border-radius:17px;box-shadow:0 24px 60px rgba(15,67,35,.15);overflow:auto;max-height:330px;z-index:100;animation:dropIn .18s ease}.search-user-item{display:flex;align-items:center;gap:12px;padding:12px 15px;border-bottom:1px solid #edf4ef;cursor:pointer;transition:.18s}.search-user-item:hover{background:#effcf3;transform:translateX(3px)}
        .chat-profile-strip{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,.76);border:1px solid #dcebe1;border-radius:18px;box-shadow:0 10px 30px rgba(15,67,35,.06);animation:notezRise .5s .04s ease both}.profile-mini{width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,#23c968,#0e8f43);color:white;display:grid;place-items:center;font-size:17px;font-weight:900;overflow:hidden;cursor:pointer;box-shadow:0 7px 18px rgba(22,163,74,.22)}.profile-mini img{width:100%;height:100%;object-fit:cover}.profile-copy{min-width:0;display:flex;flex-direction:column;gap:2px}.profile-copy strong{font-size:14px}.profile-copy span{font-size:11px;color:#789081}.profile-edit-btn{margin-left:auto;border:1px solid #cce8d5;background:#fff;color:#12833d;padding:9px 13px;border-radius:12px;font-weight:800;cursor:pointer;transition:.2s}.profile-edit-btn:hover{background:#eaffef;transform:translateY(-1px)}
        .chat-workspace{min-height:560px;height:calc(100vh - 290px);display:flex;overflow:hidden;border:1px solid #dcebe1;border-radius:23px;background:rgba(255,255,255,.9);box-shadow:0 22px 70px rgba(18,74,40,.1);animation:notezRise .55s .08s ease both}.chat-sidebar{width:330px;flex:0 0 330px;background:rgba(255,255,255,.78);border-right:1px solid #e2eee6;display:flex;flex-direction:column}.sidebar-header-title{padding:19px 20px;font-size:17px;font-weight:900;border-bottom:1px solid #e5efe8}.conversations-list{overflow:auto;flex:1;padding:8px}.chat-card-item{display:flex;align-items:center;gap:12px;padding:13px;border-radius:15px;margin:3px 0;cursor:pointer;transition:.2s}.chat-card-item:hover{background:#f0fcf4;transform:translateX(3px)}.chat-card-item.active{background:linear-gradient(90deg,#e6faed,#f6fff8);box-shadow:inset 3px 0 #20b85a}.avatar-container{position:relative;width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:#e5f4e9;color:#147a3d;display:grid;place-items:center;font-weight:900;overflow:hidden}.avatar-container img{width:100%;height:100%;object-fit:cover}.online-dot{position:absolute;right:1px;bottom:1px;width:10px;height:10px;background:#22c55e;border:2px solid #fff;border-radius:50%;animation:pulseDot 1.8s infinite}.chat-card-info{min-width:0;flex:1}.chat-card-top{display:flex;justify-content:space-between;gap:8px}.chat-card-name{font-size:13px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chat-card-time{font-size:10px;color:#7b9183}.chat-card-preview{margin-top:4px;font-size:11px;color:#718477;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .chat-window-area{min-width:0;flex:1;display:flex;flex-direction:column;background:linear-gradient(180deg,#fbfffc,#f2f9f4)}.chat-window-header{min-height:68px;box-sizing:border-box;padding:11px 18px;background:rgba(255,255,255,.9);border-bottom:1px solid #e0ede5;display:flex;align-items:center;gap:12px}.chat-window-header>div:last-child{min-width:0}.chat-window-messages{flex:1;overflow-y:auto;padding:22px clamp(12px,3vw,30px);display:flex;flex-direction:column;gap:9px;scroll-behavior:smooth}.message-bubble-row{display:flex;width:100%;animation:messageIn .25s ease both}.message-bubble-row.sender{justify-content:flex-end}.message-bubble-row.receiver{justify-content:flex-start}.message-bubble{max-width:min(72%,620px);padding:11px 14px;border-radius:17px;font-size:14px;line-height:1.48;word-break:break-word;box-shadow:0 4px 14px rgba(15,67,35,.05)}.message-bubble.sender{background:linear-gradient(135deg,#20bf60,#119345);color:#fff;border-bottom-right-radius:5px}.message-bubble.receiver{background:#fff;color:#17241c;border:1px solid #e0ece4;border-bottom-left-radius:5px}.message-meta{font-size:9px;margin-top:5px;display:flex;justify-content:flex-end;gap:5px;opacity:.7}.message-meta span[title]{cursor:pointer}.chat-input-footer{padding:12px 15px;background:rgba(255,255,255,.94);border-top:1px solid #e0ede5;display:flex;gap:9px}.chat-text-input{min-width:0;flex:1;height:44px;box-sizing:border-box;padding:0 15px;background:#f5faf6;border:1px solid #d9e9de;border-radius:14px;outline:0;color:#15251b;transition:.2s}.chat-text-input:focus{background:#fff;border-color:#35c96b;box-shadow:0 0 0 3px rgba(34,197,94,.1)}.btn-send-msg{height:44px;padding:0 20px;border:0;border-radius:14px;background:linear-gradient(135deg,#21c767,#0f9343);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(22,163,74,.2);transition:.2s}.btn-send-msg:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(22,163,74,.28)}.empty-chat-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;color:#718477}.empty-chat-state:before{content:"💬";font-size:44px;margin-bottom:12px;animation:floatIcon 3s ease-in-out infinite}.empty-chat-state h3{margin:0 0 7px;color:#173022;font-size:21px}.empty-chat-state p{margin:0;line-height:1.6;font-size:13px}
        .profile-modal-backdrop{position:fixed;inset:0;z-index:999;display:grid;place-items:center;padding:18px;background:rgba(7,24,13,.38);backdrop-filter:blur(7px);animation:fadeIn .18s ease}.profile-modal{width:min(430px,100%);background:#fff;border:1px solid #dcebe1;border-radius:24px;padding:22px;box-shadow:0 30px 90px rgba(4,35,17,.25);animation:modalIn .25s cubic-bezier(.2,.8,.2,1)}.profile-modal-top{display:flex;justify-content:space-between;align-items:flex-start}.profile-modal-top h3{margin:3px 0 0;font-size:21px}.profile-kicker{font-size:9px;font-weight:950;letter-spacing:1.5px;color:#159447}.profile-close{border:0;background:#eff8f1;width:34px;height:34px;border-radius:10px;font-size:23px;color:#51705d;cursor:pointer}.profile-preview{display:flex;align-items:center;gap:15px;margin:20px 0}.profile-big-avatar{width:78px;height:78px;border-radius:22px;background:linear-gradient(145deg,#23c968,#0c8740);display:grid;place-items:center;color:#fff;font-size:29px;font-weight:950;overflow:hidden}.profile-big-avatar img{width:100%;height:100%;object-fit:cover}.photo-upload-btn{display:inline-flex;padding:10px 13px;border:1px solid #cde7d5;border-radius:12px;background:#f3fcf5;color:#12843e;font-size:12px;font-weight:850;cursor:pointer}.photo-upload-btn input{display:none}.profile-field{display:grid;gap:7px;font-size:11px;font-weight:850;color:#4e6657}.profile-field input{height:44px;box-sizing:border-box;border:1px solid #d9e9de;border-radius:12px;padding:0 13px;outline:0;font-size:14px}.profile-field input:focus{border-color:#35c96b;box-shadow:0 0 0 3px rgba(34,197,94,.1)}.profile-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.profile-cancel,.profile-save{border:0;border-radius:12px;padding:10px 14px;font-weight:850;cursor:pointer}.profile-cancel{background:#eef5f0;color:#496152}.profile-save{background:#159c48;color:#fff}.profile-modal small{display:block;margin-top:12px;color:#809387;font-size:10px}
        .chat-card-item .avatar-container img,.chat-window-header .avatar-container img{animation:avatarSync .35s ease both}.chat-card-name{transition:color .2s}.chat-card-item.active .chat-card-name{color:#0f9343}
        .add-friend-search-btn{border:1px solid #bde8ca;background:#effcf3;color:#12833d;border-radius:10px;padding:8px 10px;font-size:10px;font-weight:900;cursor:pointer;white-space:nowrap}.friend-zone-btn{border:1px solid #bde8ca;background:linear-gradient(135deg,#effff4,#ddf8e7);color:#0c873d;border-radius:12px;padding:9px 12px;font-weight:900;cursor:pointer;margin-left:auto}.friend-zone-panel{position:fixed;right:20px;top:90px;width:min(430px,calc(100vw - 28px));max-height:78vh;overflow:auto;z-index:1100;background:#fff;border:1px solid #cfe9d7;border-radius:24px;padding:18px;box-shadow:0 30px 90px rgba(15,67,35,.24);animation:friendPanelIn .25s ease}.friend-zone-title{display:flex;align-items:center;justify-content:space-between}.friend-zone-title h3{margin:3px 0 13px}.friend-zone-title span{font-size:9px;font-weight:900;letter-spacing:1px;color:#159447}.friend-section-label{font-size:11px;font-weight:900;color:#526b5b;margin:13px 0 7px}.friend-request-card,.friend-card{display:flex;align-items:center;gap:9px;padding:10px;border:1px solid #dfede4;border-radius:15px;background:#fbfffc;margin:7px 0}.friend-avatar{width:44px;height:44px;flex:0 0 44px;border-radius:14px;overflow:hidden;display:grid;place-items:center;background:linear-gradient(145deg,#24c968,#0c893e);color:#fff;font-weight:950}.friend-avatar img{width:100%;height:100%;object-fit:cover}.friend-card-copy{min-width:0;flex:1}.friend-card-copy strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.friend-card-copy small{display:block;color:#789081;font-size:10px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.friend-actions{display:flex;gap:5px}.friend-accept,.friend-decline,.friend-remove{border:0;border-radius:9px;padding:7px 9px;font-size:10px;font-weight:900;cursor:pointer}.friend-accept{background:#159b48;color:#fff}.friend-decline,.friend-remove{background:#eef5f0;color:#526b5b}.friend-success-banner{margin-top:10px;padding:11px;border-radius:14px;background:linear-gradient(135deg,#e9fff0,#d8f8e3);border:1px solid #bce8c9;color:#0e803b;font-size:11px;font-weight:900;animation:friendGlow 2s infinite}.friend-zone-empty{text-align:center;padding:18px;color:#789081;font-size:12px}.attachment-btn{height:44px;width:44px;border:1px solid #c7e8d0;border-radius:13px;background:#effcf3;color:#13863f;font-size:18px;cursor:pointer}.study-file-card{width:min(310px,78vw);padding:9px;border:1px solid #dbeae0;border-radius:16px;background:#fff;box-shadow:0 7px 20px rgba(15,67,35,.07)}.study-file-card.sender{background:#ecfff2}.study-photo-preview{display:block;width:100%;max-height:240px;object-fit:contain;border-radius:12px;background:#f2f6f3;margin-bottom:8px}.study-file-top{display:flex;align-items:center;gap:9px;margin-bottom:9px}.study-file-icon{width:38px;height:38px;border-radius:11px;background:#e7f8ec;display:grid;place-items:center;font-size:18px}.study-file-info{min-width:0;flex:1}.study-file-info strong{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.study-file-info small{font-size:9px;color:#789081}.study-download-btn{width:100%;border:0;border-radius:10px;padding:9px;background:#138b40;color:#fff;font-weight:900;cursor:pointer}@keyframes friendPanelIn{from{opacity:0;transform:translateY(-9px) scale(.98)}to{opacity:1;transform:none}}@keyframes friendGlow{50%{box-shadow:0 0 0 5px rgba(34,197,94,.07)}}
                @keyframes avatarSync{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
        @keyframes notezRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes dropIn{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}@keyframes messageIn{from{opacity:0;transform:translateY(5px) scale(.99)}to{opacity:1;transform:none}}@keyframes pulseDot{50%{box-shadow:0 0 0 5px rgba(34,197,94,.1)}}@keyframes floatIcon{50%{transform:translateY(-5px)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes modalIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
        @media(max-width:800px){.chat-container-main{padding:12px;min-height:calc(100vh - 120px)}.chat-workspace{height:calc(100vh - 245px);min-height:480px;border-radius:18px}.chat-sidebar{width:100%;flex-basis:100%;display:${mobileShowChat ? 'none' : 'flex'}}.chat-window-area{display:${mobileShowChat ? 'flex' : 'none'}}.mobile-back-btn{display:block!important}.message-bubble{max-width:84%}.profile-edit-btn{padding:8px 10px;font-size:11px}.chat-profile-strip{padding:10px 11px}.chat-search-input{height:48px}}
        @media(max-width:620px){.chat-profile-strip{flex-wrap:wrap}.friend-zone-btn{margin-left:0;flex:1}.profile-edit-btn{margin-left:0}.friend-zone-panel{right:10px;top:75px;width:calc(100vw - 20px)}}@media(max-width:480px){.chat-container-main{padding:9px;gap:9px}.chat-workspace{height:calc(100dvh - 225px);min-height:440px}.sidebar-header-title{padding:14px 15px}.chat-window-messages{padding:15px 10px}.chat-input-footer{padding:9px}.btn-send-msg{padding:0 14px}.message-bubble{font-size:13px;max-width:88%}.profile-copy span{display:none}.profile-modal{padding:18px;border-radius:20px}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
      `}</style>

      <div className="chat-container-main">
        {/* Search Users Input */}
        <div className="chat-search-bar-wrapper">
          <span className="search-icon-pos">🔍</span>
          <input
            type="text"
            className="chat-search-input"
            placeholder="Search classmates by name, email, or @chatId..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {isSearching && searchResults.length > 0 && (
            <div className="search-results-dropdown">
              {searchResults.map((user) => (
                <div 
                  key={user.uid} 
                  className="search-user-item"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="avatar-container">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" />
                    ) : (
                      <span>{user.displayName?.charAt(0) || "U"}</span>
                    )}
                    {user.isOnline && <div className="online-dot" />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{user.chatUsername || user.displayName || user.email?.split("@")[0] || "Student"}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis" }}>{user.chatId ? `@${user.chatId}` : user.email}</div>
                  </div>
                  <button
                    type="button"
                    className="add-friend-search-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendFriendRequest(user);
                    }}
                  >
                    {friends.includes(user.uid) ? "✓ Friend" : "+ Friend"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="chat-profile-strip">
          <div className="profile-mini" onClick={openProfileEditor} title="Edit your profile">
            {profile.photo ? <img src={profile.photo} alt="Profile" /> : <span>{profile.name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="profile-copy">
            <strong>{profile.name}</strong>
            <span>Personal NoteZ Chat profile</span>
          </div>
          <button className="friend-zone-btn" onClick={() => setFriendZoneOpen((v) => !v)}>
            💚 Friends {friends.length}/5{incomingFriendRequests.length ? ` • ${incomingFriendRequests.length}` : ""}
          </button>
          <button className="profile-edit-btn" onClick={openProfileEditor}>Edit profile</button>
        </div>

        {friendZoneOpen && (
          <div className="friend-zone-panel">
            <div className="friend-zone-title">
              <div>
                <span>NOTEZ SPECIAL ZONE</span>
                <h3>💚 Friend Zone</h3>
              </div>
              <button className="profile-close" onClick={() => setFriendZoneOpen(false)}>×</button>
            </div>

            {incomingFriendRequests.length > 0 && (
              <>
                <div className="friend-section-label">Friend requests</div>
                {incomingFriendRequests.map((request) => (
                  <div className="friend-request-card" key={request.id}>
                    <div className="friend-avatar">
                      {request.senderPhoto ? <img src={request.senderPhoto} alt="" /> : (request.senderName || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-card-copy">
                      <strong>{request.senderName || "Student"}</strong>
                      <small>Wants to be your NoteZ friend</small>
                    </div>
                    <div className="friend-actions">
                      <button className="friend-accept" onClick={() => acceptFriendRequest(request)}>Accept</button>
                      <button className="friend-decline" onClick={() => declineFriendRequest(request)}>Decline</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div className="friend-section-label">Your special friends ({friends.length}/5)</div>
            {friends.length === 0 ? (
              <div className="friend-zone-empty">Search a classmate and press <b>+ Friend</b>.</div>
            ) : (
              friends.map((friendId) => {
                const fp = friendProfiles[friendId] || {};
                const name = fp.chatUsername || fp.displayName || fp.email?.split("@")[0] || "Student";
                return (
                  <div className="friend-card" key={friendId}>
                    <div className="friend-avatar">
                      {fp.photoURL ? <img src={fp.photoURL} alt={name} /> : name.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-card-copy">
                      <strong>{name}</strong>
                      <small>{fp.email || "NoteZ friend"}</small>
                    </div>
                    <button className="friend-remove" onClick={() => removeFriend(friendId)}>Remove</button>
                  </div>
                );
              })
            )}

            {friends.length > 0 && (
              <div className="friend-success-banner">
                ✓ You are now in each other's NoteZ Special Friend Zone.
              </div>
            )}
          </div>
        )}

        {profileOpen && (
          <div className="profile-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setProfileOpen(false)}>
            <div className="profile-modal">
              <div className="profile-modal-top">
                <div><span className="profile-kicker">NOTEZ PROFILE</span><h3>Your chat identity</h3></div>
                <button className="profile-close" onClick={() => setProfileOpen(false)}>×</button>
              </div>
              <div className="profile-preview">
                <div className="profile-big-avatar">
                  {profilePhotoInput ? <img src={profilePhotoInput} alt="Preview" /> : <span>{(profileNameInput || "S").charAt(0).toUpperCase()}</span>}
                </div>
                <label className="photo-upload-btn">Upload photo<input type="file" accept="image/*" onChange={handleProfilePhoto} /></label>
              </div>
              <label className="profile-field">Display name<input value={profileNameInput} maxLength={40} onChange={(e) => setProfileNameInput(e.target.value)} placeholder="Your name" /></label>
              <div className="profile-actions"><button className="profile-cancel" onClick={() => setProfileOpen(false)}>Cancel</button><button className="profile-save" onClick={saveProfile}>Save profile</button></div>
              <small>Your name and photo stay saved after refresh until you change them.</small>
            </div>
          </div>
        )}

        {/* Workspace */}
        <div className="chat-workspace">
          {/* Chat List Sidebar */}
          <div className="chat-sidebar">
            <div className="sidebar-header-title">Messages</div>
            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#6B7280", fontSize: "0.9rem" }}>
                  No active conversations yet. Search above to message a classmate!
                </div>
              ) : (
                conversations.map((conv) => {
                  const peer = getPeerProfile(conv);
                  const peerName = peer?.chatUsername || peer?.displayName || peer?.name || peer?.email?.split("@")[0] || "Classmate";
                  const peerPhoto = peer?.photoURL || peer?.photo || "";

                  return (
                    <div
                      key={conv.id}
                      className={`chat-card-item ${activeConversation?.id === conv.id ? "active" : ""}`}
                      onClick={() => {
                        setActiveConversation({ ...conv, peer: peer || conv.peer || null });
                        setMobileShowChat(true);
                      }}
                    >
                      <div className="avatar-container" title={peerName}>
                        {peerPhoto ? (
                          <img src={peerPhoto} alt={peerName} />
                        ) : (
                          <span>{peerName.charAt(0).toUpperCase()}</span>
                        )}
                        {peer?.isOnline && <div className="online-dot" />}
                      </div>
                      <div className="chat-card-info">
                        <div className="chat-card-top">
                          <span className="chat-card-name">{peerName}</span>
                          <span className="chat-card-time">{peer?.isOnline ? "Online" : "Chat"}</span>
                        </div>
                        <div className="chat-card-preview">{conv.lastMessage || `Message ${peerName}...`}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window Area */}
          <div className="chat-window-area">
            {activeConversation ? (
              <>
                {/* Window Header */}
                {(() => {
                  const peer = peerProfile || getPeerProfile(activeConversation);
                  const peerName = peer?.chatUsername || peer?.displayName || peer?.name || peer?.email?.split("@")[0] || "Classmate";
                  const peerPhoto = peer?.photoURL || peer?.photo || "";
                  const online = Boolean(peer?.isOnline);
                  return (
                    <div className="chat-window-header">
                      <button
                        style={{ display: "none", background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer" }}
                        className="mobile-back-btn"
                        onClick={() => setMobileShowChat(false)}
                      >
                        ← Back
                      </button>
                      <div className="avatar-container" style={{ width: "36px", height: "36px" }} title={peerName}>
                        {peerPhoto ? <img src={peerPhoto} alt={peerName} /> : <span>{peerName.charAt(0).toUpperCase()}</span>}
                        {online && <div className="online-dot" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {peerName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: online ? "#22C55E" : "#7b9183", display: "flex", alignItems: "center", gap: "4px" }}>
                          {online ? "● Online" : "○ Offline"}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Messages Stream */}
                <div className="chat-window-messages">
                  {messages.map((msg) => {
                    const isSender = msg.senderId === currentUser?.uid;
                    return (
                      <div key={msg.id} className={`message-bubble-row ${isSender ? "sender" : "receiver"}`}>
                        {msg.type === "studyPhoto" || msg.type === "studyDocument" ? (
                          <div className={`study-file-card ${isSender ? "sender" : ""}`}>
                            {msg.type === "studyPhoto" && msg.fileData && (
                              <img className="study-photo-preview" src={msg.fileData} alt={msg.fileName || "Study photo"} />
                            )}
                            <div className="study-file-top">
                              <div className="study-file-icon">{msg.type === "studyPhoto" ? "📷" : "📄"}</div>
                              <div className="study-file-info">
                                <strong>{msg.fileName || "Study file"}</strong>
                                <small>{msg.type === "studyPhoto" ? "Photo • downloadable" : "Document • downloadable"}</small>
                              </div>
                            </div>
                            <button type="button" className="study-download-btn" onClick={() => downloadAttachment(msg)}>⬇ Download</button>
                            <div className="message-meta">
                              <span>{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                              {isSender && !msg.deleted && (
                                <span style={{cursor:"pointer",marginLeft:"6px"}} onClick={() => handleDeleteMessage(msg.id)} title="Delete file">🗑️</span>
                              )}
                            </div>
                          </div>
                        ) : (
                        <div className={`message-bubble ${isSender ? "sender" : "receiver"}`}>
                          <div>{msg.text}</div>
                          <div className="message-meta">
                            <span>{msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                            {isSender && !msg.deleted && (
                              <span 
                                style={{ cursor: "pointer", marginLeft: "6px" }}
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete message"
                              >
                                🗑️
                              </span>
                            )}
                            <span 
                              style={{ cursor: "pointer", marginLeft: "6px" }}
                              onClick={() => handleCopyMessage(msg.text)}
                              title="Copy text"
                            >
                              📋
                            </span>
                          </div>
                        </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Footer */}
                <input ref={photoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleSendAttachment} />
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv" style={{display:"none"}} onChange={handleSendAttachment} />
                <form className="chat-input-footer" onSubmit={handleSendMessage}>
                  <button type="button" className="attachment-btn" disabled={sendingAttachment} onClick={() => photoInputRef.current?.click()} title="Send study photo">📷</button>
                  <button type="button" className="attachment-btn" disabled={sendingAttachment} onClick={() => fileInputRef.current?.click()} title="Send study document">📄</button>
                  <input
                    type="text"
                    className="chat-text-input"
                    placeholder="Type your study message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button type="submit" className="btn-send-msg">Send</button>
                </form>
              </>
            ) : (
              <div className="empty-chat-state">
                <h3>Welcome to NoteZ Chat</h3>
                <p>Start a conversation with your classmates.<br />Search by name or Chat ID above.</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export default Chat;