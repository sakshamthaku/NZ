import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "../firebase/Firebase";
import "./Usereditor.css";

const storage = getStorage();
const UE_IMAGE_CACHE_KEY = "notez_usereditor_shared_images_v1";
const UE_PRESENCE_HEARTBEAT_MS = 20000;
const UE_LIVE_WINDOW_MS = 60000;
const UE_SHARED_FILE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UE_LARGE_FILE_WARNING_BYTES = 25 * 1024 * 1024;

export default function Usereditor() {
  const navigate = useNavigate();
  const location = useLocation();

  const passedGroup = location.state?.group || null;
  const groupId =
    location.state?.groupId ||
    passedGroup?.id ||
    passedGroup?.groupId ||
    new URLSearchParams(location.search).get("groupId");

  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(
    passedGroup || {
      id: groupId,
      groupName: location.state?.groupName,
      hostName: location.state?.hostName,
    }
  );

  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);

  const [activeRoom, setActiveRoom] = useState("chat");

  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileWarning, setFileWarning] = useState("");
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fileSendPhase, setFileSendPhase] = useState("idle");
  const sendingRef = useRef(false);

  const [showMembers, setShowMembers] = useState(false);
  
  // Host & Security States
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showHostPasswordModal, setShowHostPasswordModal] = useState(false);
  const [hostPasswordInput, setHostPasswordInput] = useState("");
  const [hostAuthenticated, setHostAuthenticated] = useState(false);
  
  const [editingGroup, setEditingGroup] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const bottomRef = useRef(null);
  const presenceHeartbeatRef = useRef(null);
  const imageObjectUrlsRef = useRef(new Set());

  useEffect(() => {
    return () => {
      imageObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      imageObjectUrlsRef.current.clear();
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * TOAST HELPER
   * ---------------------------------------------------------
   */
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /*
   * ---------------------------------------------------------
   * AUTH & RACE CONDITION FIX (PART 1)
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser && groupId) {
        try {
          const memberDocRef = doc(db, "Group", groupId, "members", currentUser.uid);
          const memberSnap = await getDoc(memberDocRef);

          if (!memberSnap.exists()) {
            showToast("Access denied — you are not a member of this group.");
            navigate("/so");
            return;
          }

          await setDoc(memberDocRef, {
            isOnline: true,
            lastSeenAt: serverTimestamp(),
          }, { merge: true });

          if (presenceHeartbeatRef.current) clearInterval(presenceHeartbeatRef.current);

          presenceHeartbeatRef.current = window.setInterval(() => {
            setDoc(memberDocRef, {
              isOnline: true,
              lastSeenAt: serverTimestamp(),
            }, { merge: true }).catch((err) =>
              console.error("Presence heartbeat error:", err)
            );
          }, UE_PRESENCE_HEARTBEAT_MS);

          setLoading(false);
        } catch (err) {
          console.error("Membership verification error:", err);
          setLoading(false);
        }
      } else if (!currentUser) {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = null;
      }
    };
  }, [groupId, navigate]);

  /*
   * ---------------------------------------------------------
   * PRESENCE LEAVE CLEANUP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!groupId || !user?.uid) return;

    const memberDocRef = doc(db, "Group", groupId, "members", user.uid);

    return () => {
      if (presenceHeartbeatRef.current) {
        clearInterval(presenceHeartbeatRef.current);
        presenceHeartbeatRef.current = null;
      }

      // Mark user offline when unmounting/leaving Usereditor
      setDoc(
        memberDocRef,
        {
          isOnline: false,
          lastSeenAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((err) => console.error("Presence cleanup error:", err));
    };
  }, [groupId, user?.uid]);

  /*
   * ---------------------------------------------------------
   * GROUP DETAILS & INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "Group", groupId),
      (snapshot) => {
        if (!snapshot.exists()) {
          showToast("Group not found.");
          navigate("/so");
          return;
        }

        const groupData = {
          id: snapshot.id,
          ...snapshot.data(),
        };
        setGroup(groupData);
        setLoading(false);
      },
      (error) => {
        console.error("Group loading error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId, navigate]);

  /*
   * ---------------------------------------------------------
   * REAL-TIME MEMBERS LISTENER & LIVE NOW (PART 2)
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!groupId) return;

    const membersRef = collection(
      db,
      "Group",
      groupId,
      "members"
    );

    const unsubscribe = onSnapshot(
      membersRef,
      (snapshot) => {
        const memberList = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setMembers(memberList);
      },
      (error) => {
        console.error("Members error:", error);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  /*
   * ---------------------------------------------------------
   * LIVE MEMBERS FILTER
   * ---------------------------------------------------------
   */

  const liveMembers = useMemo(() => {
    const now = Date.now();
    return members.filter((member) => {
      if (!member.isOnline) return false;
      const lastSeen = member.lastSeenAt?.toDate
        ? member.lastSeenAt.toDate().getTime()
        : member.lastSeenAt?.seconds
          ? member.lastSeenAt.seconds * 1000
          : 0;
      return lastSeen > 0 && now - lastSeen <= UE_LIVE_WINDOW_MS;
    });
  }, [members]);

  /*
   * ---------------------------------------------------------
   * MESSAGES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!groupId) return;

    const messagesRef = collection(
      db,
      "Group",
      groupId,
      "messages"
    );

    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setMessages(list);
      },
      (error) => {
        console.error("Messages error:", error);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  /*
   * ---------------------------------------------------------
   * AUTO SCROLL
   * ---------------------------------------------------------
   */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, activeRoom]);

  /*
   * ---------------------------------------------------------
   * CURRENT USER & HOST CHECK
   * ---------------------------------------------------------
   */

  const currentUid = user?.uid || "";

  const isHost = useMemo(() => {
    if (!user || !group) return false;

    return (
      group.hostUid === user.uid ||
      group.hostEmail === user.email
    );
  }, [user, group]);

  /*
   * ---------------------------------------------------------
   * HOST ACCESS FLOW & VERIFICATION
   * ---------------------------------------------------------
   */
  const openHostusereditor = () => {
    if (!user) {
      showToast("Please login first.");
      navigate("/login");
      return;
    }

    if (!isHost) {
      showToast("Host access denied. Only the group host can enter.");
      return;
    }

    setHostPasswordInput("");
    setShowHostPasswordModal(true);
  };

  const closeHostAccess = () => {
    setShowHostPasswordModal(false);
    setHostPasswordInput("");
  };

  const handleHostPasswordSubmit = (event) => {
    event?.preventDefault();
    verifyHostAccess();
  };

const verifyHostAccess = () => {
  if (!user) {
    showToast("Please login first.", "error");
    navigate("/login");
    return;
  }

  // Security check: only the actual group host can continue
  if (!isHost) {
    showToast(
      "Host access denied. Only the group host can enter.",
      "error"
    );

    closeHostAccess();
    return;
  }

  // Support both old and new host-password fields
  const savedPassword =
    group?.hostPassword ||
    group?.hostPanelPassword ||
    "";

  // Old groups may not have a host password
  if (!savedPassword) {
    showToast(
      "Host password is not configured for this group.",
      "error"
    );
    return;
  }

  // WRONG PASSWORD
  if (hostPasswordInput !== String(savedPassword)) {
    showToast(
      "Incorrect host password.",
      "error"
    );
    return;
  }

  // =====================================================
  // CORRECT PASSWORD
  // DIRECTLY OPEN USERINTERFACED
  // =====================================================

  setHostAuthenticated(true);
  setShowHostPanel(false);
  closeHostAccess();

  showToast("Correct host password! Opening Host Hub...");

  navigate("/hostenterfaced", {
    state: {
      groupId: group?.id || groupId,
      groupName: group?.groupName || "Study Group",
      hostName:
        group?.hostName ||
        user?.displayName ||
        "Host",
      group: {
        ...group,
        id: group?.id || groupId,
      },
    },
  });
};
  /*
   * ---------------------------------------------------------
   * ROOM FILTER
   * ---------------------------------------------------------
   */

  const visibleMessages = useMemo(() => {
    return messages.filter(
      (item) => (item.room || "chat") === activeRoom
    );
  }, [messages, activeRoom]);

  /*
   * ---------------------------------------------------------
   * SEND TEXT MESSAGE
   * ---------------------------------------------------------
   */

  const sendMessage = async (event) => {
    event?.preventDefault();

    if (!user) {
      navigate("/login");
      return;
    }

    if (!groupId) return;

    const cleanMessage = message.trim();

    if (!cleanMessage) return;

    try {
      setSending(true);

      await addDoc(
        collection(db, "Group", groupId, "messages"),
        {
          text: cleanMessage,
          senderUid: user.uid,
          senderName:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Student",
          senderPhoto: user.photoURL || "",
          room: activeRoom,
          type: "text",
          createdAt: serverTimestamp(),
        }
      );

      setMessage("");
    } catch (error) {
      console.error("Message sending failed:", error);
      showToast("Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * IMAGE SELECT & SEND
   * ---------------------------------------------------------
   */

  /*
   * ---------------------------------------------------------
   * FILE SELECT & SEND
   * ---------------------------------------------------------
   * Photos and PDFs are uploaded directly to Firebase Storage.
   * There is intentionally no artificial app-level size limit.
   * A 7-day expiry is stored with every shared file.
   */
  const clearSelectedFile = () => {
    if (selectedImage?.preview) {
      try {
        URL.revokeObjectURL(selectedImage.preview);
      } catch {}
      imageObjectUrlsRef.current.delete(selectedImage.preview);
    }

    setSelectedImage(null);
    setUploadProgress(0);
    setFileWarning("");
    setFileSendPhase("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageSelect = (event) => {
    event?.preventDefault?.();

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      showToast("Only photos and PDF files can be shared.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const previewUrl = isImage ? URL.createObjectURL(file) : "";

    if (previewUrl) {
      imageObjectUrlsRef.current.add(previewUrl);
    }

    if (file.size >= UE_LARGE_FILE_WARNING_BYTES) {
      setFileWarning(
        "Large file warning: this file can take longer to upload and may affect smoothness on slower networks. You can still send it."
      );
    } else {
      setFileWarning("");
    }

    setUploadProgress(0);
    setSelectedImage({
      file,
      preview: previewUrl,
      name: file.name,
      size: file.size,
      type: file.type || (isPdf ? "application/pdf" : "application/octet-stream"),
      kind: isPdf ? "pdf" : "image",
    });
  };

  const sendImage = async (event) => {
    event?.preventDefault?.();

    // Synchronous lock prevents double uploads even before React has re-rendered.
    if (sendingRef.current) return;

    if (!selectedImage || !user || !groupId) {
      if (!selectedImage) showToast("Please select a photo or PDF first.");
      return;
    }

    const fileToSend = selectedImage.file;
    const fileName = selectedImage.name;
    const fileSize = selectedImage.size || fileToSend?.size || 0;
    const mimeType =
      selectedImage.type ||
      fileToSend?.type ||
      (selectedImage.kind === "pdf"
        ? "application/pdf"
        : "application/octet-stream");
    const fileKind = selectedImage.kind === "pdf" ? "pdf" : "image";
    const senderName =
      user.displayName || user.email?.split("@")[0] || "Student";

    if (!fileToSend) {
      showToast("The selected file is no longer available. Please select it again.");
      clearSelectedFile();
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setFileSendPhase("uploading");
    setUploadProgress(0);

    let uploadedStoragePath = "";
    let uploadCompleted = false;

    try {
      /*
       * STEP 1: Upload the real File object to Firebase Storage.
       * No Firestore message is created until Storage confirms completion
       * and getDownloadURL() returns the real Firebase URL.
       */
      const now = Date.now();
      const expiresAtMs = now + UE_SHARED_FILE_TTL_MS;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueName = `${now}_${user.uid}_${safeName}`;

      const filePath =
        `Group/${groupId}/shared-files/${user.uid}/${uniqueName}`;

      uploadedStoragePath = filePath;

      const fileRef = storageRef(storage, filePath);

      const uploadTask = uploadBytesResumable(
        fileRef,
        fileToSend,
        {
          contentType: mimeType,
          customMetadata: {
            groupId: String(groupId),
            senderUid: String(user.uid),
            originalName: fileName,
            mimeType: String(mimeType),
            fileKind: String(fileKind),
            expiresAt: String(expiresAtMs),
          },
        }
      );

      const downloadUrl = await new Promise((resolve, reject) => {
        let settled = false;

        const fail = (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };

        const succeed = (url) => {
          if (settled) return;
          settled = true;
          resolve(url);
        };

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const total = snapshot.totalBytes || fileToSend.size || 0;
            const progress =
              total > 0
                ? Math.min(
                    100,
                    Math.round((snapshot.bytesTransferred / total) * 100)
                  )
                : 0;

            setUploadProgress(progress);

            if (progress >= 100) {
              setFileSendPhase("uploading");
            }
          },
          (error) => {
            console.error("Firebase Storage upload failed:", {
              code: error?.code,
              message: error?.message,
              name: error?.name,
              serverResponse: error?.serverResponse,
              fileName,
              fileSize,
              mimeType,
              storagePath: filePath,
              groupId,
              uid: user.uid,
            });
            fail(error);
          },
          async () => {
            try {
              // This is the important boundary: Storage must be complete
              // before the Firestore message is created.
              const url = await getDownloadURL(uploadTask.snapshot.ref);

              if (!url || !url.startsWith("http")) {
                throw new Error("Firebase returned an invalid download URL.");
              }

              setUploadProgress(100);
              uploadCompleted = true;
              succeed(url);
            } catch (error) {
              console.error("Firebase Storage download URL failed:", {
                code: error?.code,
                message: error?.message,
                name: error?.name,
                fileName,
                storagePath: filePath,
                groupId,
                uid: user.uid,
              });
              fail(error);
            }
          }
        );
      });

      /*
       * STEP 2: Storage is confirmed. Only now create the Firestore message.
       * Never store blob: URLs in Firestore.
       */
      setFileSendPhase("sending");

      const messagePayload = {
        text: "",
        type: "file",
        fileKind,
        fileName,
        fileSize,
        mimeType,
        storagePath: filePath,
        downloadUrl,
        // Keep these legacy fields so existing Usereditor rendering/cache logic
        // continues to work without removing any old functionality.
        fileUrl: downloadUrl,
        imageUrl: downloadUrl,

        senderUid: user.uid,
        senderName,
        senderPhoto: user.photoURL || "",

        room: activeRoom,
        groupId: String(groupId),

        createdAt: serverTimestamp(),

        // Preserve the existing 7-day expiry logic.
        expiresAt: new Date(expiresAtMs),
        expiresAtMs,
        retentionDays: 7,
      };

      let messageRef;

      try {
        messageRef = await addDoc(
          collection(db, "Group", groupId, "messages"),
          messagePayload
        );
      } catch (firestoreError) {
        /*
         * Storage succeeded but Firestore failed. Do NOT leave a broken
         * message behind. Also clean up the now-orphaned Storage object.
         */
        console.error("Firestore file message creation failed:", {
          code: firestoreError?.code,
          message: firestoreError?.message,
          name: firestoreError?.name,
          fileName,
          storagePath: filePath,
          groupId,
          uid: user.uid,
        });

        try {
          await deleteObject(fileRef);
          uploadedStoragePath = "";
          console.warn("Orphaned Storage upload cleaned up after Firestore failure.");
        } catch (cleanupError) {
          console.error(
            "Could not clean up Storage file after Firestore failure:",
            {
              code: cleanupError?.code,
              message: cleanupError?.message,
              storagePath: filePath,
            }
          );
        }

        throw firestoreError;
      }

      /*
       * Keep the existing local cache behavior. This is only a convenience
       * cache; Firebase remains the source of truth for delivery.
       */
      try {
        const cache = JSON.parse(
          localStorage.getItem(UE_IMAGE_CACHE_KEY) || "{}"
        );

        cache[messageRef.id] = {
          imageUrl: downloadUrl,
          downloadUrl,
          fileName,
          storagePath: filePath,
          fileKind,
          expiresAtMs,
          cachedAt: Date.now(),
        };

        const trimmed = Object.entries(cache)
          .sort(([, a], [, b]) => (b.cachedAt || 0) - (a.cachedAt || 0))
          .slice(0, 30);

        localStorage.setItem(
          UE_IMAGE_CACHE_KEY,
          JSON.stringify(Object.fromEntries(trimmed))
        );
      } catch (cacheError) {
        console.warn("Local file cache unavailable:", cacheError);
      }

      /*
       * STEP 3: Firestore message exists. Clear the selected file and
       * physically reset the input so the same filename can be selected again.
       */
      if (selectedImage.preview) {
        try {
          URL.revokeObjectURL(selectedImage.preview);
        } catch {}
        imageObjectUrlsRef.current.delete(selectedImage.preview);
      }

      setSelectedImage(null);
      setUploadProgress(100);
      setFileWarning("");
      setFileSendPhase("sent");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      showToast(
        `${fileKind === "pdf" ? "PDF" : "Photo"} sent successfully. It will be available for 7 days.`
      );

      window.setTimeout(() => {
        setUploadProgress(0);
        setFileSendPhase("idle");
      }, 1500);
    } catch (error) {
      console.error("File send flow failed:", {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        serverResponse: error?.serverResponse,
        fileName,
        fileSize,
        mimeType,
        storagePath: uploadedStoragePath,
        storageUploadCompleted: uploadCompleted,
        groupId,
        uid: user?.uid,
      });

      const errorCode = error?.code || "";

      let messageText =
        "File could not be sent. Please try again.";

      if (
        errorCode === "storage/unauthorized" ||
        errorCode === "storage/permission-denied"
      ) {
        messageText =
          "Upload permission denied. Check Firebase Storage Rules.";
      } else if (errorCode === "storage/canceled") {
        messageText = "Upload canceled. Please try again.";
      } else if (errorCode === "storage/quota-exceeded") {
        messageText = "Firebase Storage quota exceeded.";
      } else if (errorCode === "storage/retry-limit-exceeded") {
        messageText =
          "Upload stopped after too many retries. Check your internet connection and try again.";
      } else if (errorCode === "storage/network-request-failed") {
        messageText =
          "Network error while uploading. Check your connection and retry.";
      } else if (
        errorCode === "permission-denied" ||
        errorCode === "firestore/permission-denied"
      ) {
        messageText =
          "File uploaded, but Firestore denied the message. Check Firestore Rules.";
      } else if (error?.message) {
        messageText = `File could not be sent: ${error.message}`;
      }

      setFileSendPhase("idle");
      setUploadProgress(0);
      showToast(messageText);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const getFileExpiryInfo = (item) => {
    const raw =
      item?.expiresAtMs ||
      (item?.expiresAt?.toDate
        ? item.expiresAt.toDate().getTime()
        : item?.expiresAt?.seconds
          ? item.expiresAt.seconds * 1000
          : 0);

    if (!raw) {
      return {
        expiresAtMs: 0,
        expired: false,
        warning: false,
        label: "7-day shared file",
      };
    }

    const remaining = raw - Date.now();

    if (remaining <= 0) {
      return {
        expiresAtMs: raw,
        expired: true,
        warning: true,
        label: "Expired",
      };
    }

    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.ceil(remaining / (60 * 60 * 1000));

    return {
      expiresAtMs: raw,
      expired: false,
      warning: days <= 1,
      label:
        days > 1
          ? `Available for ${days} more days`
          : `Expires in about ${hours} hour${hours === 1 ? "" : "s"}`,
    };
  };

  const visibleFileMessages = useMemo(() => {
    return visibleMessages.filter((item) => {
      if (item.type !== "file" && item.type !== "image") return true;
      return !getFileExpiryInfo(item).expired;
    });
  }, [visibleMessages]);

  /*
   * ---------------------------------------------------------
   * DELETE MESSAGE
   * ---------------------------------------------------------
   */

  const deleteMessage = async (messageId, senderUid) => {
    if (!groupId || !messageId) return;

    const allowed = isHost || senderUid === currentUid;

    if (!allowed) return;

    const confirmed = window.confirm("Delete this message?");

    if (!confirmed) return;

    try {
      const messageRef = doc(db, "Group", groupId, "messages", messageId);
      const messageSnap = await getDoc(messageRef);
      const messageData = messageSnap.exists() ? messageSnap.data() : null;

      await deleteDoc(messageRef);

      if (messageData?.storagePath) {
        try {
          await deleteObject(storageRef(storage, messageData.storagePath));
        } catch (storageError) {
          console.warn("Shared image cleanup skipped:", storageError);
        }
      }

      try {
        const cache = JSON.parse(localStorage.getItem(UE_IMAGE_CACHE_KEY) || "{}");
        delete cache[messageId];
        localStorage.setItem(UE_IMAGE_CACHE_KEY, JSON.stringify(cache));
      } catch {}
    } catch (error) {
      console.error("Delete message error:", error);
      showToast("Message could not be deleted.");
    }
  };

  /*
   * ---------------------------------------------------------
   * FORMAT TIME
   * ---------------------------------------------------------
   */

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "now";

    return timestamp.toDate().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ---------------------------------------------------------
   * GROUP NOT FOUND
   * ---------------------------------------------------------
   */

  if (!loading && !groupId) {
    return (
      <div className="ue-page ue-empty-page">
        <div className="ue-empty-card">
          <div className="ue-book-icon">📖</div>

          <h1>No group selected</h1>

          <p>Open a study group from the NoteZ lobby to enter the workspace.</p>

          <button
            onClick={() => navigate("/so")}
            className="ue-primary-btn"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * MAIN UI
   * ---------------------------------------------------------
   */

  return (
    <div className="ue-page ue-scroll-stage">

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="ue-toast-notification">
          {toastMessage}
        </div>
      )}

      {/* BACKGROUND BOOK ANIMATION */}
      <div className="ue-floating-book ue-book-one">
        <span>📖</span>
      </div>
      <div className="ue-floating-book ue-book-two">
        <span>📚</span>
      </div>
      <div className="ue-floating-book ue-book-three">
        <span>✦</span>
      </div>

      {/* HEADER */}
      <header className="ue-header ue-snap-section">
        <div className="ue-brand-area">
          <button
            className="ue-back-button"
            onClick={() => navigate("/so")}
            aria-label="Back"
          >
            ←
          </button>

          <div className="ue-brand-mark">N</div>

          <div className="ue-brand-text">
            <strong>NoteZ</strong>
            <span>Study Space</span>
          </div>
        </div>

        <div className="ue-header-center">
          <div className="ue-live-indicator">
            <span></span>
            LIVE NOW: {liveMembers.length}
          </div>
          <div className="ue-header-title">
            {group?.groupName || "Study Group"}
          </div>
        </div>

        <div className="ue-header-actions">
          <button
            className="ue-header-icon"
            onClick={() => setShowMembers((value) => !value)}
            title="Members"
          >
            👥
            <span>{members.length}</span>
          </button>

         <button
             className="ue-header-icon ue-host-button"
            onClick={openHostusereditor}
                 title="Host controls"
                 >
                      👑
                   </button>

          <button
            className="ue-profile-mini"
            onClick={() => navigate("/profile")}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              <span>
                {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* GROUP INFO STRIP */}
      <section className="ue-group-strip ue-snap-section">
        <div className="ue-group-avatar">
          {group?.groupPhoto ? (
            <img src={group.groupPhoto} alt={group.groupName} />
          ) : (
            <span>{(group?.groupName || "G").charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="ue-group-main">
          <div className="ue-group-title-line">
            <h1>{group?.groupName || "Study Group"}</h1>
            {group?.isPrivate && <span className="ue-private-badge">🔒 Private</span>}
          </div>
          <p>{group?.groupDescription || "A shared NoteZ study workspace."}</p>
        </div>

        <div className="ue-group-stats">
          <div>
            <strong>{members.length}</strong>
            <span>Members</span>
          </div>
          <div>
            <strong>{liveMembers.length}</strong>
            <span>Live Now</span>
          </div>
          <div>
            <strong>{group?.maxMembers || 10}</strong>
            <span>Limit</span>
          </div>
          <div>
            <strong>{isHost ? "HOST" : "MEMBER"}</strong>
            <span>Role</span>
          </div>
        </div>
      </section>

      {/* MAIN WORKSPACE */}
      <main className="ue-workspace ue-snap-section">
        {/* LEFT SIDEBAR */}
        <aside className="ue-sidebar">
          <div className="ue-sidebar-heading">
            <span>WORKSPACE</span>
          </div>

          <button
            className={`ue-room-button ${activeRoom === "chat" ? "active" : ""}`}
            onClick={() => setActiveRoom("chat")}
          >
            <span className="ue-room-icon">💬</span>
            <span>
              <strong>Casual Chat</strong>
              <small>Talk with everyone</small>
            </span>
          </button>

          <button
            className={`ue-room-button ${activeRoom === "discussion" ? "active" : ""}`}
            onClick={() => setActiveRoom("discussion")}
          >
            <span className="ue-room-icon">🗣</span>
            <span>
              <strong>Discussion</strong>
              <small>Project conversation</small>
            </span>
          </button>

          <div className="ue-sidebar-divider"></div>

          <div className="ue-mini-book">
            <div className="ue-mini-book-cover">N</div>
            <div>
              <strong>NoteZ</strong>
              <span>Group Workspace</span>
            </div>
          </div>

          <div className="ue-sidebar-note">
            <span>✦</span>
            Work together. Learn together.
          </div>
        </aside>

        {/* CHAT AREA */}
        <section className="ue-chat">
          <div className="ue-chat-header">
            <div className="ue-chat-heading">
              <div className="ue-chat-symbol">
                {activeRoom === "chat" ? "💬" : "🗣️"}
              </div>
              <div>
                <h2>{activeRoom === "chat" ? "Casual Chat" : "Discussion Room"}</h2>
                <p>
                  {activeRoom === "chat"
                    ? "Everyone in the group can talk here."
                    : "Discuss your project and important topics."}
                </p>
              </div>
            </div>

            <div className="ue-chat-status">
              <span></span>
              Real-time
            </div>
          </div>

          {activeRoom === "discussion" && (
            <div className="ue-discussion-notice">
              <div className="ue-notice-icon">📚</div>
              <div>
                <strong>Project Discussion</strong>
                <p>Keep this room focused on your group project and study discussions.</p>
              </div>
            </div>
          )}

          <div className="ue-messages">
            {visibleMessages.length === 0 && (
              <div className="ue-no-messages">
                <div className="ue-empty-book">📖</div>
                <h3>This room is quiet.</h3>
                <p>Start the conversation with your group.</p>
              </div>
            )}

            {visibleFileMessages.map((item) => {
              const mine = item.senderUid === currentUid;
              const canDelete = isHost || mine;

              return (
                <article
                  key={item.id}
                  className={`ue-message ${mine ? "mine" : ""}`}
                >
                  <div className="ue-message-avatar">
                    {item.senderPhoto ? (
                      <img src={item.senderPhoto} alt="" />
                    ) : (
                      <span>{(item.senderName || "S").charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="ue-message-content">
                    <div className="ue-message-meta">
                      <strong>{item.senderName || "Student"}</strong>
                      {item.senderUid === group?.hostUid && (
                        <span className="ue-host-tag">HOST</span>
                      )}
                      <time>{formatTime(item.createdAt)}</time>
                    </div>

                    <div className="ue-message-bubble">
                      {(item.type === "file" || item.type === "image") &&
                        (item.fileUrl || item.imageUrl) && (
                          (() => {
                            const fileInfo = getFileExpiryInfo(item);
                            const isPdf =
                              item.fileKind === "pdf" ||
                              item.mimeType === "application/pdf" ||
                              item.fileName?.toLowerCase().endsWith(".pdf");
                            const fileUrl = item.fileUrl || item.imageUrl;

                            return (
                              <div className={`ue-image-post ${isPdf ? "ue-file-post" : ""}`}>
                                {isPdf ? (
                                  <a
                                    className="ue-pdf-card"
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <span className="ue-pdf-icon">PDF</span>
                                    <span>
                                      <strong>{item.fileName || "Shared PDF"}</strong>
                                      <small>Open PDF</small>
                                    </span>
                                  </a>
                                ) : (
                                  <a
                                    className="ue-image-open"
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={fileUrl}
                                      alt={item.fileName || "Shared image"}
                                      loading="lazy"
                                    />
                                  </a>
                                )}

                                <div className="ue-image-footer">
                                  <div className="ue-image-file-info">
                                    <strong>{item.fileName || (isPdf ? "Shared PDF" : "Shared photo")}</strong>
                                    <span className={fileInfo.warning ? "ue-expiry-warning" : ""}>
                                      ⚠ {fileInfo.label} • auto-delete after 7 days
                                    </span>
                                  </div>

                                  <a
                                    className="ue-image-download"
                                    href={fileUrl}
                                    download={item.fileName || (isPdf ? "NoteZ-file.pdf" : "NoteZ-photo")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Download file"
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      {item.text && <p>{item.text}</p>}
                    </div>

                    {canDelete && (
                      <button
                        className="ue-delete-message"
                        onClick={() => deleteMessage(item.id, item.senderUid)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            <div ref={bottomRef}></div>
          </div>

          {selectedImage && (
            <div className="ue-upload-preview">
              {selectedImage.kind === "pdf" ? (
                <div className="ue-preview-pdf-icon">PDF</div>
              ) : (
                <img src={selectedImage.preview} alt="Preview" />
              )}

              <div className="ue-upload-preview-info">
                <strong>{selectedImage.name}</strong>
                <span>
                  {sending
                    ? fileSendPhase === "uploading"
                      ? `Uploading ${uploadProgress}%`
                      : fileSendPhase === "sending"
                        ? "Sending…"
                        : fileSendPhase === "sent"
                          ? "Sent"
                          : "Preparing…"
                    : "Ready to share • 7-day retention"}
                  {selectedImage.size
                    ? ` • ${(selectedImage.size / (1024 * 1024)).toFixed(1)} MB`
                    : ""}
                </span>
                {sending && (
                  <small>
                    {fileSendPhase === "uploading"
                      ? `Uploading ${uploadProgress}%`
                      : fileSendPhase === "sending"
                        ? "Sending to the group…"
                        : fileSendPhase === "sent"
                          ? "Sent ✓"
                          : "Preparing…"}
                  </small>
                )}
                {fileWarning && (
                  <small className="ue-large-file-warning">⚠ {fileWarning}</small>
                )}
              </div>

              <button
                type="button"
                onClick={clearSelectedFile}
                disabled={sending}
                title="Cancel selected file"
              >
                ×
              </button>
            </div>
          )}

          {fileSendPhase !== "idle" && (
            <div
              className="ue-file-send-status"
              role="status"
              aria-live="polite"
              style={{
                margin: "0 0 10px",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
              }}
            >
              {fileSendPhase === "uploading" &&
                `Uploading ${uploadProgress}%`}
              {fileSendPhase === "sending" && "Sending to the group…"}
              {fileSendPhase === "sent" && "Sent ✓"}
            </div>
          )}

          <form className="ue-composer" onSubmit={sendMessage} noValidate>
            <label className="ue-attach-button" title="Share photo or PDF">
              ＋
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={handleImageSelect}
              />
            </label>

            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                activeRoom === "chat"
                  ? "Write something to your group..."
                  : "Start a project discussion..."
              }
            />

            {selectedImage ? (
              <button
                type="button"
                className="ue-send-button"
                onClick={sendImage}
                disabled={sending}
              >
                {sending
                  ? fileSendPhase === "uploading"
                    ? `Uploading ${uploadProgress}%`
                    : fileSendPhase === "sending"
                      ? "Sending..."
                      : fileSendPhase === "sent"
                        ? "Sent ✓"
                        : "Preparing..."
                  : selectedImage?.kind === "pdf"
                    ? "Send PDF"
                    : "Send Photo"}
              </button>
            ) : (
              <button
                type="submit"
                className="ue-send-button"
                disabled={sending || !message.trim()}
              >
                {sending ? "..." : "Send"}
              </button>
            )}
          </form>
        </section>

        {/* RIGHT MEMBER PANEL WITH LIVE NOW WIDGET */}
        <aside
          className={`ue-members-panel ${showMembers ? "mobile-visible" : ""}`}
        >
          <div className="ue-members-header">
            <div>
              <h3>People</h3>
              <span>{members.length} total members</span>
            </div>
            <button
              onClick={() => setShowMembers(false)}
              className="ue-close-mobile"
            >
              ×
            </button>
          </div>

          {/* LIVE NOW WIDGET */}
          <div className="ue-livenow-widget">
            <div className="ue-livenow-title">
              <span>🔴 LIVE NOW</span>
              <small>{liveMembers.length} active</small>
            </div>
            <div className="ue-livenow-list">
              {liveMembers.length === 0 ? (
                <p className="ue-livenow-empty">No active users</p>
              ) : (
                liveMembers.map((member) => (
                  <div className="ue-livenow-item" key={`live-${member.id}`}>
                    <span className="ue-livenow-dot" aria-label="Live"></span>
                    <span className="ue-livenow-name">
                      {member.name || member.displayName || "Student"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="ue-members-header" style={{ borderTop: "1px solid var(--ue-border)" }}>
            <h3>All Members</h3>
          </div>

          <div className="ue-member-list">
            {members.map((member) => {
              const memberIsHost = member.uid === group?.hostUid;

              return (
                <div className="ue-member" key={member.id}>
                  <div className="ue-member-avatar">
                    {member.photoURL ? (
                      <img src={member.photoURL} alt="" />
                    ) : (
                      <span>{(member.name || "S").charAt(0).toUpperCase()}</span>
                    )}
                    <i
  className={
    liveMembers.some((liveMember) => liveMember.id === member.id)
      ? "ue-presence-dot is-live"
      : "ue-presence-dot"
  }
/>
                  </div>

                  <div className="ue-member-info">
                    <strong>
                      {member.name || member.displayName || "Student"}
                    </strong>
                    <span>{memberIsHost ? "Group Host" : "Member"}</span>
                  </div>

                  {memberIsHost && <span className="ue-crown">👑</span>}
                </div>
              );
            })}
          </div>
        </aside>
      </main>

      {/* HOST PASSWORD MODAL */}
      {showHostPasswordModal && (
        <div
          className="ue-host-overlay"
          onClick={() => setShowHostPasswordModal(false)}
        >
          <div
            className="ue-host-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ue-host-modal-header">
              <div>
                <span>HOST CONTROL</span>
                <h2>Secure Host Verification</h2>
              </div>
              <button onClick={() => setShowHostPasswordModal(false)}>×</button>
            </div>

            <div className="ue-host-card">
              <div className="ue-host-card-icon">🔒</div>
              <div>
                <strong>Enter your host password to continue.</strong>
                <p>Host privileges require security clearance password authentication.</p>
              </div>
            </div>

            <form onSubmit={handleHostPasswordSubmit}>
              <div style={{ marginBottom: "15px" }}>
                <input
                  type="password"
                  placeholder="Host password"
                  value={hostPasswordInput}
                  onChange={(e) => setHostPasswordInput(e.target.value)}
                  className="ue-host-password-input"
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="ue-secondary-btn"
                  onClick={() => setShowHostPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="ue-primary-btn">
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HOST PANEL */}
      {isHost && hostAuthenticated && showHostPanel && (
        <div
          className="ue-host-overlay"
          onClick={() => setShowHostPanel(false)}
        >
          <div
            className="ue-host-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ue-host-modal-header">
              <div>
                <span>HOST CONTROL</span>
                <h2>Manage Group</h2>
              </div>
              <button onClick={() => setShowHostPanel(false)}>×</button>
            </div>

            <div className="ue-host-card">
              <div className="ue-host-card-icon">👑</div>
              <div>
                <strong>You are the group host</strong>
                <p>You can manage the group workspace and moderate messages.</p>
              </div>
            </div>

            <button
              className="ue-host-action"
              onClick={() => setEditingGroup(true)}
            >
              <span>✏️</span>
              <div>
                <strong>Edit Group Profile</strong>
                <small>Update your group information</small>
              </div>
              <b>›</b>
            </button>

            <button
              className="ue-host-action"
              onClick={() => {
                setActiveRoom("discussion");
                setShowHostPanel(false);
              }}
            >
              <span>🗣️</span>
              <div>
                <strong>Open Discussion</strong>
                <small>Project discussion room</small>
              </div>
              <b>›</b>
            </button>

            <div className="ue-host-warning">
              <strong>Moderation</strong>
              <p>You can delete messages from members when necessary.</p>
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE GROUP EDIT PANEL */}
      {editingGroup && (
        <div className="ue-host-overlay">
          <div className="ue-host-modal">
            <div className="ue-host-modal-header">
              <div>
                <span>GROUP PROFILE</span>
                <h2>Edit Group</h2>
              </div>
              <button onClick={() => setEditingGroup(false)}>×</button>
            </div>

            <div className="ue-edit-preview">
              <div className="ue-edit-avatar">
                {group?.groupPhoto ? (
                  <img src={group.groupPhoto} alt="" />
                ) : (
                  "N"
                )}
              </div>
              <div>
                <strong>{group?.groupName}</strong>
                <span>{group?.groupDescription}</span>
              </div>
            </div>

            <p className="ue-edit-info">
              Your existing Group collection remains unchanged. This panel is prepared for your group-edit logic.
            </p>

            <button
              className="ue-primary-btn"
              onClick={() => setEditingGroup(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}