import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { auth, db } from "../../firebase/Firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "react-toastify";

/*
|--------------------------------------------------------------------------
| NoteZ Connect
|--------------------------------------------------------------------------
| Frontend: React, Vite, WebRTC DataChannel, Socket.IO, Firebase
| Backend: Node.js + Socket.IO
|--------------------------------------------------------------------------
*/

const SOCKET_SERVER =
  import.meta.env.VITE_CONNECT_SERVER || "http://localhost:3001";

const CHUNK_SIZE = 64 * 1024;

const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function NoteS() {
  /* ============================================================
     AUTH
  ============================================================ */
  const [currentUser, setCurrentUser] = useState(auth.currentUser || null);

  /* ============================================================
     SOCKET
  ============================================================ */
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  /* ============================================================
     WEBRTC & REFS
  ============================================================ */
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const pendingCandidatesRef = useRef([]);

  const roleRef = useRef("");
  const sessionCodeRef = useRef("");

  const [peerConnected, setPeerConnected] = useState(false);
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [sessionActive, setSessionActive] = useState(false);
  const [role, setRole] = useState("");

  /* ============================================================
     DEVICE
  ============================================================ */
  const [remoteDevice, setRemoteDevice] = useState(null);

  /* ============================================================
     FILES & TRANSFERS OUTGOING
  ============================================================ */
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState("");

  /* ============================================================
     LINK OUTGOING
  ============================================================ */
  const [linkText, setLinkText] = useState("");

  /* ============================================================
     INCOMING TRANSFER (FILE / LINK HANDSHAKE)
  ============================================================ */
  const incomingFileRef = useRef({
    transferId: null,
    metadata: null,
    chunks: [],
    receivedBytes: 0,
  });

  const [incomingTransfer, setIncomingTransfer] = useState(null);

  /* ============================================================
     UI MODALS
  ============================================================ */
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  /* ============================================================
     AUTH LISTENER
  ============================================================ */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  /* ============================================================
     DEVICE NAME
  ============================================================ */
  const getDeviceName = useCallback(() => {
    if (currentUser) {
      return (
        currentUser.displayName ||
        currentUser.email?.split("@")[0] ||
        "NoteZ User"
      );
    }
    return "Guest Device";
  }, [currentUser]);

  /* ============================================================
     GENERATE SESSION CODE
  ============================================================ */
  const generateSessionCode = () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters[Math.floor(Math.random() * characters.length)];
    }
    return code;
  };

  /* ============================================================
     FORMAT BYTES
  ============================================================ */
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const units = ["Bytes", "KB", "MB", "GB", "TB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  };

  /* ============================================================
     FIREBASE SESSION
  ============================================================ */
  const saveSession = async (code) => {
    try {
      await setDoc(
        doc(db, "connectSessions", code),
        {
          code,
          hostId: currentUser?.uid || "guest",
          hostName: getDeviceName(),
          status: "waiting",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Firebase session error:", error);
    }
  };

  /* ============================================================
     FLUSH PENDING ICE CANDIDATES
  ============================================================ */
  const flushPendingCandidates = async (peer) => {
    if (!peer || !peer.remoteDescription) return;
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift();
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Error flushing ICE candidate:", err);
      }
    }
  };

  /* ============================================================
     DATA CHANNEL SETUP
  ============================================================ */
  const setupDataChannel = useCallback((channel) => {
    dataChannelRef.current = channel;
    channel.binaryType = "arraybuffer";

    channel.onopen = () => {
      setPeerConnected(true);
      setTransferStatus("Secure P2P channel ready");
      toast.success("Device connected successfully");
    };

    channel.onclose = () => {
      setPeerConnected(false);
      setTransferStatus("Transfer channel closed");
    };

    channel.onerror = (error) => {
      console.error("Data channel error:", error);
      toast.error("Transfer connection error");
    };

    channel.onmessage = async (event) => {
      try {
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data);

          // FILE OFFER (Receiver side)
          if (message.type === "file-offer") {
            incomingFileRef.current = {
              transferId: message.transferId,
              metadata: message.metadata,
              chunks: [],
              receivedBytes: 0,
            };

            setIncomingTransfer({
              type: "file-offer",
              transferId: message.transferId,
              name: message.metadata.name,
              size: message.metadata.size,
              sizeFormatted: formatBytes(message.metadata.size),
              status: "pending-approval",
            });
            toast.info(`Incoming file: ${message.metadata.name}`);
            return;
          }

          // FILE REJECTED (Sender side)
          if (message.type === "file-reject") {
            if (incomingFileRef.current.transferId === message.transferId) {
              setTransferStatus("Transfer rejected");
              setIsTransferring(false);
              toast.warn("Receiver rejected the file");
            }
            return;
          }

          // FILE ACCEPTED (Sender side)
          if (message.type === "file-accept") {
            return;
          }

          // FILE START
          if (message.type === "file-start") {
            incomingFileRef.current = {
              ...incomingFileRef.current,
              metadata: message.metadata,
              chunks: [],
              receivedBytes: 0,
            };
            setIncomingTransfer((prev) => ({
              ...prev,
              status: "receiving",
              progress: 0,
            }));
            return;
          }

          // FILE END
          if (message.type === "file-end") {
            const transfer = incomingFileRef.current;
            if (!transfer.metadata) return;

            const blob = new Blob(transfer.chunks, {
              type: transfer.metadata.type || "application/octet-stream",
            });
            const objectUrl = URL.createObjectURL(blob);

            setIncomingTransfer((prev) => ({
              ...prev,
              status: "ready",
              blob,
              objectUrl,
            }));
            toast.success("File received and ready");
            return;
          }

          // LINK OFFER (Receiver side)
          if (message.type === "link-offer") {
            setIncomingTransfer({
              type: "link-offer",
              transferId: message.transferId,
              url: message.url,
              status: "pending-approval",
            });
            toast.info("Incoming link received");
            return;
          }

          // LINK REJECTED
          if (message.type === "link-reject") {
            toast.warn("Receiver rejected the link");
            return;
          }

          // LINK ACCEPTED -> SENDER SENDS ACTUAL LINK
          if (message.type === "link-accept") {
            const currentChannel = dataChannelRef.current;
            if (currentChannel && currentChannel.readyState === "open") {
              currentChannel.send(
                JSON.stringify({
                  type: "link",
                  transferId: message.transferId,
                  url: message.url,
                })
              );
            }
            return;
          }

          // LINK FINAL
          if (message.type === "link") {
            setIncomingTransfer({
              type: "link",
              url: message.url,
              status: "ready",
            });
            toast.success("New link received");
            return;
          }

          return;
        }

        // Incoming binary file chunk
        const transfer = incomingFileRef.current;
        if (!transfer.metadata) return;

        transfer.chunks.push(event.data);
        transfer.receivedBytes += event.data.byteLength;

        const progress = (transfer.receivedBytes / transfer.metadata.size) * 100;
        setIncomingTransfer((prev) => ({
          ...prev,
          progress: Math.min(progress, 100),
        }));
      } catch (error) {
        console.error("Incoming transfer error:", error);
        toast.error("Unable to receive transfer");
      }
    };
  }, []);

  /* ============================================================
     CREATE PEER CONNECTION
  ============================================================ */
  const createPeerConnection = useCallback(
    (code) => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
      peerConnectionRef.current = peer;
      pendingCandidatesRef.current = [];

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        socketRef.current?.emit("signal", {
          roomId: code,
          data: {
            type: "candidate",
            candidate: event.candidate,
          },
        });
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        console.log("WebRTC state:", state);
        if (state === "connected") {
          setPeerConnected(true);
          setRemoteDevice({ name: "NoteZ Device" });
        }
        if (["disconnected", "failed", "closed"].includes(state)) {
          setPeerConnected(false);
          setTransferStatus("Device disconnected");
        }
      };

      return peer;
    },
    []
  );

  /* ============================================================
     SOCKET SETUP (ONCE ON MOUNT)
  ============================================================ */
  useEffect(() => {
    const socket = io(SOCKET_SERVER, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to NoteZ Connect server:", socket.id);
      setSocketConnected(true);

      if (sessionCodeRef.current) {
        socket.emit("join-room", sessionCodeRef.current);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setSocketConnected(false);
      setPeerConnected(false);
    });

    socket.on("peer-joined", async () => {
      console.log("Another device joined");
      setRemoteDevice({ name: "NoteZ Device" });

      if (roleRef.current !== "host") return;

      try {
        const peer = peerConnectionRef.current;
        if (!peer) return;

        const channel = peer.createDataChannel("notez-transfer", {
          ordered: true,
        });
        setupDataChannel(channel);

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("signal", {
          roomId: sessionCodeRef.current,
          data: { type: "offer", offer },
        });
      } catch (error) {
        console.error("Offer error:", error);
        toast.error("Unable to connect device");
      }
    });

    socket.on("signal", async (data) => {
      try {
        const peer = peerConnectionRef.current;
        if (!peer) return;

        if (data.type === "offer") {
          const offer = new RTCSessionDescription(data.offer);
          await peer.setRemoteDescription(offer);
          await flushPendingCandidates(peer);

          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit("signal", {
            roomId: sessionCodeRef.current,
            data: { type: "answer", answer },
          });
          return;
        }

        if (data.type === "answer") {
          const answer = new RTCSessionDescription(data.answer);
          await peer.setRemoteDescription(answer);
          await flushPendingCandidates(peer);
          return;
        }

        if (data.type === "candidate") {
          if (!peer.remoteDescription) {
            pendingCandidatesRef.current.push(data.candidate);
          } else {
            await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (error) {
        console.error("Signal processing error:", error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [setupDataChannel]);

  /* ============================================================
     CREATE SESSION
  ============================================================ */
  const createSession = async () => {
    if (!socketConnected) {
      toast.error("NoteZ Connect server is offline");
      return;
    }

    const code = generateSessionCode();
    sessionCodeRef.current = code;
    roleRef.current = "host";

    setSessionCode(code);
    setRole("host");
    setSessionActive(true);

    const peer = createPeerConnection(code);
    peerConnectionRef.current = peer;

    socketRef.current.emit("join-room", code);
    await saveSession(code);

    toast.success("Transfer session created");
  };

  /* ============================================================
     JOIN SESSION
  ============================================================ */
  const joinSession = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Enter a valid 6-character code");
      return;
    }

    if (!socketConnected) {
      toast.error("NoteZ Connect server is offline");
      return;
    }

    sessionCodeRef.current = code;
    roleRef.current = "guest";

    setSessionCode(code);
    setRole("guest");
    setSessionActive(true);

    const peer = createPeerConnection(code);
    peerConnectionRef.current = peer;

    peer.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    socketRef.current.emit("join-room", code);
    toast.success("Joined transfer session");
  };

  /* ============================================================
     FILE SELECT & REMOVE
  ============================================================ */
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    toast.success(`${files.length} file(s) added`);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /* ============================================================
     SEND SINGLE FILE WITH HANDSHAKE
  ============================================================ */
  const sendFile = async (file) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      throw new Error("Transfer channel is not ready");
    }

    setIsTransferring(true);
    setTransferProgress(0);
    setTransferStatus(`Waiting for receiver approval for ${file.name}...`);

    const transferId = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    // Send file-offer
    channel.send(
      JSON.stringify({
        type: "file-offer",
        transferId,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          lastModified: file.lastModified,
        },
      })
    );

    // Wait for file-accept or file-reject
    const accepted = await new Promise((resolve) => {
      const listener = (event) => {
        if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data);
            if (msg.transferId === transferId) {
              if (msg.type === "file-accept") {
                channel.removeEventListener("message", listener);
                resolve(true);
              } else if (msg.type === "file-reject") {
                channel.removeEventListener("message", listener);
                resolve(false);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      };
      channel.addEventListener("message", listener);
    });

    if (!accepted) {
      setIsTransferring(false);
      setTransferStatus("Transfer rejected");
      throw new Error(`Transfer rejected for ${file.name}`);
    }

    setTransferStatus(`Sending ${file.name}`);

    // Send file-start
    channel.send(
      JSON.stringify({
        type: "file-start",
        transferId,
        metadata: {
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
      })
    );

    let offset = 0;
    while (offset < file.size) {
      if (channel.bufferedAmount > CHUNK_SIZE * 8) {
        await new Promise((resolve) => {
          const waitForBuffer = () => {
            if (channel.bufferedAmount <= CHUNK_SIZE * 2) {
              channel.removeEventListener("bufferedamountlow", waitForBuffer);
              resolve();
            }
          };
          channel.bufferedAmountLowThreshold = CHUNK_SIZE * 2;
          channel.addEventListener("bufferedamountlow", waitForBuffer);
        });
      }

      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await chunk.arrayBuffer();
      channel.send(buffer);

      offset += chunk.size;
      const progress = (offset / file.size) * 100;
      setTransferProgress(Math.min(progress, 100));
      setTransferStatus(`Sending ${file.name} • ${Math.round(progress)}%`);

      await new Promise((res) => setTimeout(res, 0));
    }

    channel.send(
      JSON.stringify({
        type: "file-end",
        transferId,
      })
    );

    setTransferProgress(100);
    setTransferStatus(`${file.name} transferred`);
    setIsTransferring(false);
  };

  /* ============================================================
     SEND ALL FILES (SEQUENTIAL)
  ============================================================ */
  const sendAllFiles = async () => {
    if (!peerConnected) {
      toast.error("Connect another device first");
      return;
    }
    if (!selectedFiles.length) {
      toast.error("Select files first");
      return;
    }

    try {
      for (const file of [...selectedFiles]) {
        try {
          await sendFile(file);
        } catch (err) {
          console.warn("Skipping file due to error/rejection:", err);
        }
      }
      setSelectedFiles([]);
      toast.success("Batch transfer completed");
    } catch (error) {
      console.error("Transfer error:", error);
      setIsTransferring(false);
      toast.error(error.message || "File transfer failed");
    }
  };

  /* ============================================================
     SEND LINK WITH HANDSHAKE
  ============================================================ */
  const sendLink = async () => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      toast.error("Connect another device first");
      return;
    }

    const url = linkText.trim();
    if (!url) {
      toast.error("Enter a link");
      return;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      toast.error("Only http and https links are allowed");
      return;
    }

    const transferId = Math.random().toString(36).substring(2);

    channel.send(
      JSON.stringify({
        type: "link-offer",
        transferId,
        url,
      })
    );
    toast.success("Link offer sent");
  };

  /* ============================================================
     ACCEPT INCOMING FILE / LINK
  ============================================================ */
  const acceptIncomingFile = () => {
    const channel = dataChannelRef.current;
    if (!channel || !incomingTransfer) return;

    channel.send(
      JSON.stringify({
        type: "file-accept",
        transferId: incomingTransfer.transferId,
      })
    );

    setIncomingTransfer((prev) => ({
      ...prev,
      status: "receiving",
    }));
    toast.success("File transfer accepted");
  };

  const acceptIncomingLink = () => {
    const channel = dataChannelRef.current;
    if (!channel || !incomingTransfer) return;

    channel.send(
      JSON.stringify({
        type: "link-accept",
        transferId: incomingTransfer.transferId,
        url: incomingTransfer.url,
      })
    );

    toast.success("Link accepted");
    setIncomingTransfer(null);
  };

  const rejectIncoming = () => {
    const channel = dataChannelRef.current;
    if (channel && incomingTransfer?.transferId) {
      const isLink = incomingTransfer.type === "link-offer";
      channel.send(
        JSON.stringify({
          type: isLink ? "link-reject" : "file-reject",
          transferId: incomingTransfer.transferId,
        })
      );
    }

    if (incomingTransfer?.objectUrl) {
      URL.revokeObjectURL(incomingTransfer.objectUrl);
    }

    setIncomingTransfer(null);
    incomingFileRef.current = {
      transferId: null,
      metadata: null,
      chunks: [],
      receivedBytes: 0,
    };
    toast.info("Transfer dismissed");
  };

  /* ============================================================
     DOWNLOAD RECEIVED FILE & OPEN LINK
  ============================================================ */
  const downloadIncomingFile = () => {
    if (!incomingTransfer?.blob) {
      toast.error("File is not ready");
      return;
    }

    const url = incomingTransfer.objectUrl;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = incomingTransfer.name || "NoteZ-file";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    toast.success("Download started");
    setIncomingTransfer(null);
    incomingFileRef.current = {
      transferId: null,
      metadata: null,
      chunks: [],
      receivedBytes: 0,
    };

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  };

  const openIncomingLink = () => {
    if (!incomingTransfer?.url) return;
    window.open(incomingTransfer.url, "_blank", "noopener,noreferrer");
    setIncomingTransfer(null);
  };

  /* ============================================================
     COPY SESSION CODE
  ============================================================ */
  const copySession = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      toast.success("Session code copied");
    } catch {
      toast.error("Unable to copy session code");
    }
  };

  /* ============================================================
     CLOSE SESSION & CLEANUP
  ============================================================ */
  const closeSession = () => {
    try {
      dataChannelRef.current?.close();
      peerConnectionRef.current?.close();
      if (sessionCode) {
        socketRef.current?.emit("leave-room", sessionCode);
      }
    } catch (error) {
      console.warn(error);
    }

    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
    sessionCodeRef.current = "";
    roleRef.current = "";

    setPeerConnected(false);
    setSessionActive(false);
    setSessionCode("");
    setJoinCode("");
    setRole("");
    setRemoteDevice(null);
    setSelectedFiles([]);
    setTransferProgress(0);
    setTransferStatus("");

    if (incomingTransfer?.objectUrl) {
      URL.revokeObjectURL(incomingTransfer.objectUrl);
    }
    setIncomingTransfer(null);

    toast.info("Transfer session closed");
  };

  useEffect(() => {
    return () => {
      try {
        dataChannelRef.current?.close();
        peerConnectionRef.current?.close();
        socketRef.current?.disconnect();
      } catch (error) {
        console.warn("Connect cleanup:", error);
      }
    };
  }, []);

  /* ============================================================
     UI RENDER
  ============================================================ */
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .nz-connect {
          min-height: 100vh;
          color: #eafff0;
          background: radial-gradient(circle at 50% -10%, rgba(34,197,94,.18), transparent 34%),
                      radial-gradient(circle at 0% 80%, rgba(22,163,74,.10), transparent 30%), #020705;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          position: relative;
          overflow: hidden;
        }
        .nz-connect::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(34,197,94,.045) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(34,197,94,.045) 1px, transparent 1px);
          background-size: 45px 45px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }
        .nz-connect::after {
          content: "";
          position: fixed;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: rgba(34,197,94,.07);
          filter: blur(130px);
          top: 30%;
          left: 50%;
          transform: translate(-50%,-50%);
          pointer-events: none;
        }
        .nz-topbar {
          height: 76px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(34,197,94,.13);
          background: rgba(2,7,5,.72);
          backdrop-filter: blur(22px);
          position: relative;
          z-index: 10;
        }
        .nz-brand { display: flex; align-items: center; gap: 12px; }
        .nz-logo {
          width: 42px; height: 42px; display: grid; place-items: center; border-radius: 13px;
          color: #021006; background: #22c55e; font-size: 19px; font-weight: 1000;
          box-shadow: 0 0 25px rgba(34,197,94,.42);
        }
        .nz-brand-title { font-size: 15px; font-weight: 900; }
        .nz-brand-subtitle { color: #5f7569; font-size: 9px; margin-top: 3px; }
        .nz-server {
          display: flex; align-items: center; gap: 8px; color: #779084; font-size: 9px; font-weight: 800; letter-spacing: .5px;
        }
        .nz-server-dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
        .nz-server-dot.online { background: #22c55e; box-shadow: 0 0 13px rgba(34,197,94,.9); }
        .nz-main {
          width: min(1160px,92%); margin: auto; padding: 65px 0 50px; position: relative; z-index: 2;
          max-height: calc(100vh - 76px); overflow-y: auto;
        }
        .nz-main::-webkit-scrollbar { width: 5px; }
        .nz-main::-webkit-scrollbar-thumb { background: rgba(34,197,94,.25); border-radius: 20px; }
        .nz-hero { text-align: center; max-width: 700px; margin: auto; }
        .nz-badge {
          display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 999px;
          color: #69df91; border: 1px solid rgba(34,197,94,.23); background: rgba(34,197,94,.055);
          font-size: 9px; font-weight: 900; letter-spacing: 1.4px;
        }
        .nz-badge b { color: #22c55e; }
        .nz-hero h1 {
          margin: 22px 0 13px; font-size: clamp(42px,6vw,76px); line-height: .95; letter-spacing: -4px; font-weight: 1000;
        }
        .nz-hero h1 span { color: #22c55e; text-shadow: 0 0 40px rgba(34,197,94,.28); }
        .nz-hero p { margin: auto; max-width: 570px; color: #70847a; font-size: 13px; line-height: 1.7; }
        .nz-radar-wrap { display: flex; justify-content: center; margin: 45px 0; }
        .nz-radar {
          width: 280px; height: 280px; border-radius: 50%; position: relative; overflow: hidden;
          border: 1px solid rgba(34,197,94,.28);
          background: radial-gradient(circle, rgba(34,197,94,.08), transparent 62%), rgba(2,10,6,.75);
          box-shadow: 0 0 70px rgba(34,197,94,.08), inset 0 0 45px rgba(34,197,94,.08);
        }
        .nz-radar-ring { position: absolute; border: 1px solid rgba(34,197,94,.16); border-radius: 50%; }
        .nz-ring-1 { inset: 12%; }
        .nz-ring-2 { inset: 25%; }
        .nz-ring-3 { inset: 38%; }
        .nz-radar-horizontal { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: rgba(34,197,94,.13); }
        .nz-radar-vertical { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: rgba(34,197,94,.13); }
        .nz-scan {
          position: absolute; width: 50%; height: 2px; left: 50%; top: 50%; transform-origin: left center;
          background: linear-gradient(90deg, #22c55e, transparent); box-shadow: 0 0 14px rgba(34,197,94,.9);
          animation: nzRadarScan 3s linear infinite;
        }
        @keyframes nzRadarScan { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .nz-radar-center {
          position: absolute; inset: 39%; border-radius: 50%; display: grid; place-items: center; align-content: center; gap: 4px;
          background: rgba(3,15,8,.95); border: 1px solid rgba(34,197,94,.42); box-shadow: 0 0 28px rgba(34,197,94,.18); z-index: 4;
        }
        .nz-radar-n { color: #22c55e; font-weight: 1000; font-size: 20px; }
        .nz-radar-state { color: #61796c; font-size: 6px; font-weight: 900; letter-spacing: 1px; }
        .nz-device-node {
          position: absolute; top: 13%; right: 7%; min-width: 108px; padding: 8px; text-align: center;
          border: 1px solid rgba(34,197,94,.32); border-radius: 12px; background: rgba(3,12,7,.94);
          box-shadow: 0 0 30px rgba(34,197,94,.12); z-index: 6; animation: nzFloat 2s ease-in-out infinite;
        }
        @keyframes nzFloat { 50% { transform: translateY(-5px); } }
        .nz-device-icon { font-size: 19px; }
        .nz-device-node strong { display: block; margin-top: 3px; font-size: 9px; }
        .nz-device-node small { display: block; color: #22c55e; margin-top: 3px; font-size: 6px; font-weight: 900; letter-spacing: 1px; }
        .nz-choice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .nz-card {
          padding: 28px; border: 1px solid rgba(34,197,94,.13); border-radius: 20px;
          background: linear-gradient(145deg, rgba(13,28,18,.88), rgba(3,10,6,.92));
          box-shadow: 0 20px 70px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.02);
          backdrop-filter: blur(20px);
        }
        .nz-card:hover { border-color: rgba(34,197,94,.26); transition: .25s ease; }
        .nz-card-icon {
          width: 43px; height: 43px; display: grid; place-items: center; color: #22c55e;
          border: 1px solid rgba(34,197,94,.22); border-radius: 13px; background: rgba(34,197,94,.06); font-size: 20px;
        }
        .nz-card h2 { margin: 17px 0 7px; font-size: 18px; }
        .nz-card p { color: #687c71; font-size: 11px; line-height: 1.6; min-height: 43px; }
        .nz-primary {
          width: 100%; border: 0; border-radius: 11px; padding: 13px 15px; background: #22c55e; color: #031007;
          font-weight: 950; font-size: 11px; cursor: pointer; box-shadow: 0 8px 25px rgba(34,197,94,.14); transition: .2s ease;
        }
        .nz-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(34,197,94,.25); }
        .nz-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
        .nz-join-row { display: flex; gap: 8px; }
        .nz-input {
          width: 100%; min-width: 0; border: 1px solid rgba(34,197,94,.15); outline: none; border-radius: 11px;
          padding: 13px; color: #dffff0; background: rgba(0,0,0,.25); font-size: 12px;
        }
        .nz-input:focus { border-color: rgba(34,197,94,.55); box-shadow: 0 0 0 3px rgba(34,197,94,.06); }
        .nz-join-row .nz-primary { width: auto; min-width: 78px; }
        .nz-workspace { animation: nzWorkspaceIn .35s ease; }
        @keyframes nzWorkspaceIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .nz-session-bar {
          display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 16px 19px;
          border: 1px solid rgba(34,197,94,.16); border-radius: 16px; background: rgba(5,15,9,.84); margin-bottom: 12px;
        }
        .nz-session-label { display: block; color: #52695d; font-size: 7px; font-weight: 900; letter-spacing: 1.5px; }
        .nz-session-code { margin-top: 4px; color: #22c55e; font-size: 24px; font-weight: 1000; letter-spacing: 5px; }
        .nz-actions { display: flex; gap: 7px; }
        .nz-secondary, .nz-danger {
          border: 1px solid rgba(34,197,94,.16); border-radius: 9px; padding: 9px 12px; background: rgba(34,197,94,.035);
          color: #91a49a; font-size: 9px; font-weight: 850; cursor: pointer;
        }
        .nz-secondary:hover { color: #22c55e; border-color: rgba(34,197,94,.38); }
        .nz-danger { color: #e88b8b; border-color: rgba(239,68,68,.15); }
        .nz-device-status {
          display: flex; align-items: center; gap: 12px; padding: 15px; margin-bottom: 12px;
          border: 1px solid rgba(34,197,94,.10); border-radius: 15px; background: rgba(5,15,9,.65);
        }
        .nz-avatar {
          width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px;
          background: rgba(34,197,94,.07); border: 1px solid rgba(34,197,94,.18); font-size: 18px;
        }
        .nz-device-details { flex: 1; }
        .nz-device-details strong { display: block; font-size: 11px; }
        .nz-device-details span { display: block; margin-top: 4px; color: #61756b; font-size: 9px; }
        .nz-pill { display: flex; align-items: center; gap: 6px; padding: 6px 9px; border-radius: 999px; font-size: 7px; font-weight: 900; }
        .nz-pill i { width: 6px; height: 6px; border-radius: 50%; }
        .nz-pill.connected { color: #22c55e; background: rgba(34,197,94,.07); }
        .nz-pill.connected i { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .nz-pill.waiting { color: #a99258; background: rgba(169,146,88,.07); }
        .nz-pill.waiting i { background: #a99258; }
        .nz-transfer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .nz-kicker { color: #22c55e; font-size: 7px; font-weight: 950; letter-spacing: 1.4px; }
        .nz-transfer-title { margin: 5px 0 20px; font-size: 17px; }
        .nz-drop {
          min-height: 155px; display: flex; flex-direction: column; justify-content: center; align-items: center;
          border: 1px dashed rgba(34,197,94,.24); border-radius: 15px; cursor: pointer; background: rgba(34,197,94,.02);
        }
        .nz-drop:hover { background: rgba(34,197,94,.05); border-color: rgba(34,197,94,.55); }
        .nz-drop input { display: none; }
        .nz-upload-icon {
          width: 45px; height: 45px; display: grid; place-items: center; border-radius: 14px;
          color: #22c55e; background: rgba(34,197,94,.07); font-size: 22px; margin-bottom: 9px;
        }
        .nz-drop strong { font-size: 11px; }
        .nz-drop span { margin-top: 5px; color: #586d62; font-size: 8px; }
        .nz-file-list { display: grid; gap: 6px; max-height: 170px; overflow-y: auto; margin-top: 10px; }
        .nz-file {
          display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid rgba(34,197,94,.08);
          border-radius: 10px; background: rgba(0,0,0,.16);
        }
        .nz-file-icon { font-size: 16px; }
        .nz-file-info { min-width: 0; flex: 1; }
        .nz-file-info strong { display: block; overflow: hidden; color: #b9c9c0; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
        .nz-file-info span { display: block; margin-top: 2px; color: #51645a; font-size: 7px; }
        .nz-remove { border: 0; background: transparent; color: #61736a; font-size: 17px; cursor: pointer; }
        .nz-transfer-button { margin-top: 10px; }
        .nz-progress { margin-top: 13px; }
        .nz-progress-top { display: flex; justify-content: space-between; gap: 8px; color: #667a70; font-size: 8px; }
        .nz-progress-top strong { color: #22c55e; }
        .nz-progress-track { height: 5px; margin-top: 6px; border-radius: 999px; overflow: hidden; background: rgba(34,197,94,.07); }
        .nz-progress-fill { height: 100%; border-radius: inherit; background: #22c55e; box-shadow: 0 0 12px rgba(34,197,94,.75); transition: width .12s linear; }
        .nz-link-row { display: flex; gap: 7px; }
        .nz-link-row .nz-primary { width: auto; }
        .nz-security { display: flex; gap: 9px; margin-top: 28px; padding: 13px; border: 1px solid rgba(34,197,94,.09); border-radius: 12px; background: rgba(34,197,94,.025); }
        .nz-security-icon { font-size: 16px; }
        .nz-security strong { display: block; color: #96aa9f; font-size: 9px; }
        .nz-security p { margin: 3px 0 0; color: #596d62; font-size: 8px; line-height: 1.5; }
        .nz-incoming {
          display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 14px;
          border: 1px solid rgba(34,197,94,.28); border-radius: 15px; background: rgba(34,197,94,.045);
          box-shadow: 0 0 35px rgba(34,197,94,.06); animation: nzIncoming .3s ease;
        }
        @keyframes nzIncoming { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .nz-incoming-icon {
          width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px;
          color: #031007; background: #22c55e; font-size: 19px; font-weight: 900;
        }
        .nz-incoming-info { flex: 1; min-width: 0; }
        .nz-incoming-info > span { color: #22c55e; font-size: 7px; font-weight: 950; letter-spacing: 1px; }
        .nz-incoming-info strong { display: block; margin-top: 4px; color: #c7d7ce; font-size: 10px; }
        .nz-incoming-info small { display: block; color: #63776c; margin-top: 3px; font-size: 7px; }
        .nz-incoming-actions { display: flex; gap: 6px; }
        .nz-modal-bg {
          position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px;
          background: rgba(0,0,0,.72); backdrop-filter: blur(12px);
        }
        .nz-modal {
          width: min(470px,100%); padding: 25px; border: 1px solid rgba(34,197,94,.23); border-radius: 20px;
          background: #06100a; box-shadow: 0 30px 100px rgba(0,0,0,.6);
        }
        .nz-modal h2 { margin: 0 0 9px; font-size: 20px; }
        .nz-modal p { color: #71847a; font-size: 11px; line-height: 1.7; }
        .nz-modal-close { width: 100%; margin-top: 15px; }
        .nz-footer { display: flex; justify-content: center; gap: 8px; padding: 25px; color: #3d5147; font-size: 8px; position: relative; z-index: 2; }
        .nz-footer strong { color: #5e7569; }
        @media (max-width: 760px) {
          .nz-main { padding-top: 45px; }
          .nz-choice-grid, .nz-transfer-grid { grid-template-columns: 1fr; }
          .nz-topbar { padding: 0 4%; }
          .nz-server { font-size: 7px; }
          .nz-hero h1 { letter-spacing: -2.5px; }
          .nz-session-bar { align-items: flex-start; flex-direction: column; }
          .nz-actions { width: 100%; }
          .nz-actions button { flex: 1; }
          .nz-device-status { align-items: flex-start; flex-wrap: wrap; }
          .nz-pill { margin-left: 54px; }
        }
        @media (max-width: 480px) {
          .nz-brand-subtitle { display: none; }
          .nz-brand-title { font-size: 13px; }
          .nz-logo { width: 38px; height: 38px; }
          .nz-hero h1 { font-size: 45px; }
          .nz-hero p { font-size: 11px; }
          .nz-card { padding: 20px; }
          .nz-join-row, .nz-link-row { flex-direction: column; }
          .nz-join-row .nz-primary, .nz-link-row .nz-primary { width: 100%; }
          .nz-incoming { align-items: flex-start; flex-direction: column; }
          .nz-incoming-actions { width: 100%; }
          .nz-incoming-actions button { flex: 1; }
        }
      `}</style>

      <div className="nz-connect">
        {/* HEADER */}
        <header className="nz-topbar">
          <div className="nz-brand">
            <div className="nz-logo">N</div>
            <div>
              <div className="nz-brand-title">NoteZ Connect</div>
              <div className="nz-brand-subtitle">Direct device-to-device sharing</div>
            </div>
          </div>
          <div className="nz-server">
            <span className={socketConnected ? "nz-server-dot online" : "nz-server-dot"} />
            {socketConnected ? "CONNECT SERVER ONLINE" : "CONNECT SERVER OFFLINE"}
          </div>
        </header>

        <main className="nz-main">
          {/* HERO */}
          {!sessionActive && (
            <section className="nz-hero">
              <div className="nz-badge">
                <b>✦</b> NOTEZ CONNECT
              </div>
              <h1>
                Share<br />
                <span>Anything.</span>
              </h1>
              <p>
                Transfer photos, videos, documents and links between devices using a direct peer-to-peer connection.
              </p>
            </section>
          )}

          {/* RADAR */}
          <div className="nz-radar-wrap">
            <div className="nz-radar">
              <div className="nz-radar-ring nz-ring-1" />
              <div className="nz-radar-ring nz-ring-2" />
              <div className="nz-radar-ring nz-ring-3" />
              <div className="nz-radar-horizontal" />
              <div className="nz-radar-vertical" />
              <div className="nz-scan" />
              <div className="nz-radar-center">
                <div className="nz-radar-n">N</div>
                <div className="nz-radar-state">
                  {peerConnected ? "CONNECTED" : "SCANNING"}
                </div>
              </div>
              {peerConnected && (
                <div className="nz-device-node">
                  <div className="nz-device-icon">📱</div>
                  <strong>{remoteDevice?.name || "NoteZ Device"}</strong>
                  <small>P2P READY</small>
                </div>
              )}
            </div>
          </div>

          {/* CREATE / JOIN */}
          {!sessionActive && (
            <section className="nz-choice-grid">
              <div className="nz-card">
                <div className="nz-card-icon">＋</div>
                <h2>Create Session</h2>
                <p>Create a temporary transfer room and share the generated code with another device.</p>
                <button
                  className="nz-primary"
                  onClick={createSession}
                  disabled={!socketConnected}
                >
                  Create Transfer Session
                </button>
              </div>

              <div className="nz-card">
                <div className="nz-card-icon">↗</div>
                <h2>Join Session</h2>
                <p>Enter the six-character session code from the sending device.</p>
                <div className="nz-join-row">
                  <input
                    className="nz-input"
                    value={joinCode}
                    maxLength={6}
                    placeholder="ABC123"
                    onChange={(event) => {
                      setJoinCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                      );
                    }}
                  />
                  <button
                    className="nz-primary"
                    onClick={joinSession}
                    disabled={!socketConnected}
                  >
                    Join
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ACTIVE SESSION */}
          {sessionActive && (
            <section className="nz-workspace">
              <div className="nz-session-bar">
                <div>
                  <span className="nz-session-label">TRANSFER SESSION</span>
                  <div className="nz-session-code">{sessionCode}</div>
                </div>
                <div className="nz-actions">
                  <button className="nz-secondary" onClick={copySession}>
                    Copy Code
                  </button>
                  <button className="nz-danger" onClick={closeSession}>
                    Close Session
                  </button>
                </div>
              </div>

              <div className="nz-device-status">
                <div className="nz-avatar">📱</div>
                <div className="nz-device-details">
                  <strong>
                    {peerConnected ? "Device Connected" : "Waiting for Device"}
                  </strong>
                  <span>
                    {peerConnected
                      ? "Secure WebRTC P2P channel is ready"
                      : "Open NoteZ Connect on another device and join this session"}
                  </span>
                </div>
                <div className={peerConnected ? "nz-pill connected" : "nz-pill waiting"}>
                  <i />
                  {peerConnected ? "CONNECTED" : "WAITING"}
                </div>
              </div>

              <div className="nz-transfer-grid">
                {/* FILE TRANSFER */}
                <div className="nz-card">
                  <span className="nz-kicker">FILE TRANSFER</span>
                  <h2 className="nz-transfer-title">Send Files</h2>
                  <label className="nz-drop">
                    <input type="file" multiple onChange={handleFileSelect} />
                    <div className="nz-upload-icon">↑</div>
                    <strong>Select files</strong>
                    <span>Photo • Video • PDF • DOC • ZIP • Any file</span>
                  </label>

                  {selectedFiles.length > 0 && (
                    <div className="nz-file-list">
                      {selectedFiles.map((file, index) => (
                        <div className="nz-file" key={`${file.name}-${index}`}>
                          <div className="nz-file-icon">📄</div>
                          <div className="nz-file-info">
                            <strong>{file.name}</strong>
                            <span>{formatBytes(file.size)}</span>
                          </div>
                          <button
                            className="nz-remove"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className="nz-primary nz-transfer-button"
                    onClick={sendAllFiles}
                    disabled={!peerConnected || !selectedFiles.length || isTransferring}
                  >
                    {isTransferring ? "Transferring..." : "Transfer Files →"}
                  </button>

                  {isTransferring && (
                    <div className="nz-progress">
                      <div className="nz-progress-top">
                        <span>{transferStatus}</span>
                        <strong>{Math.round(transferProgress)}%</strong>
                      </div>
                      <div className="nz-progress-track">
                        <div
                          className="nz-progress-fill"
                          style={{ width: `${transferProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* LINK TRANSFER */}
                <div className="nz-card">
                  <span className="nz-kicker">LINK TRANSFER</span>
                  <h2 className="nz-transfer-title">Send a Link</h2>
                  <div className="nz-link-row">
                    <input
                      className="nz-input"
                      value={linkText}
                      placeholder="https://example.com"
                      onChange={(event) => setLinkText(event.target.value)}
                    />
                    <button className="nz-primary" onClick={sendLink} disabled={!peerConnected}>
                      Send
                    </button>
                  </div>

                  <div className="nz-security">
                    <div className="nz-security-icon">🔐</div>
                    <div>
                      <strong>Peer-to-peer connection</strong>
                      <p>WebRTC handles the actual transfer between connected browsers.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INCOMING TRANSFER CARD */}
              {incomingTransfer && (
                <div className="nz-incoming">
                  <div className="nz-incoming-icon">↓</div>
                  <div className="nz-incoming-info">
                    <span>INCOMING TRANSFER</span>

                    {incomingTransfer.type === "file-offer" && (
                      <>
                        <strong>{incomingTransfer.name}</strong>
                        <small>
                          {incomingTransfer.sizeFormatted} • Approval required
                        </small>
                      </>
                    )}

                    {incomingTransfer.status === "receiving" && (
                      <>
                        <strong>{incomingTransfer.name}</strong>
                        <small>
                          {incomingTransfer.sizeFormatted} • {Math.round(incomingTransfer.progress || 0)}% receiving
                        </small>
                        <div className="nz-progress-track">
                          <div
                            className="nz-progress-fill"
                            style={{ width: `${incomingTransfer.progress || 0}%` }}
                          />
                        </div>
                      </>
                    )}

                    {incomingTransfer.status === "ready" && incomingTransfer.blob && (
                      <>
                        <strong>{incomingTransfer.name}</strong>
                        <small>Ready to download</small>
                      </>
                    )}

                    {incomingTransfer.type === "link-offer" && (
                      <>
                        <strong>Incoming Link</strong>
                        <small>{incomingTransfer.url}</small>
                      </>
                    )}

                    {incomingTransfer.type === "link" && (
                      <>
                        <strong>Received Link</strong>
                        <small>{incomingTransfer.url}</small>
                      </>
                    )}
                  </div>

                  <div className="nz-incoming-actions">
                    {incomingTransfer.type === "file-offer" && incomingTransfer.status === "pending-approval" && (
                      <>
                        <button className="nz-primary" onClick={acceptIncomingFile}>
                          Accept
                        </button>
                        <button className="nz-secondary" onClick={rejectIncoming}>
                          Reject
                        </button>
                      </>
                    )}

                    {incomingTransfer.status === "ready" && incomingTransfer.blob && (
                      <button className="nz-primary" onClick={downloadIncomingFile}>
                        Download
                      </button>
                    )}

                    {incomingTransfer.type === "link-offer" && incomingTransfer.status === "pending-approval" && (
                      <>
                        <button className="nz-primary" onClick={acceptIncomingLink}>
                          Accept
                        </button>
                        <button className="nz-secondary" onClick={rejectIncoming}>
                          Reject
                        </button>
                      </>
                    )}

                    {incomingTransfer.type === "link" && (
                      <button className="nz-primary" onClick={openIncomingLink}>
                        Open Link
                      </button>
                    )}

                    {incomingTransfer.status !== "pending-approval" && incomingTransfer.type !== "link" && (
                      <button className="nz-secondary" onClick={rejectIncoming}>
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* HOW IT WORKS BUTTON */}
          <div style={{ textAlign: "center", marginTop: "35px" }}>
            <button className="nz-secondary" onClick={() => setShowHowItWorks(true)}>
              How NoteZ Connect Works
            </button>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="nz-footer">
          <strong>NoteZ Connect</strong>
          <span>•</span>
          <span>WebRTC P2P</span>
          <span>•</span>
          <span>Secure Transfer</span>
        </footer>

        {/* HOW IT WORKS MODAL */}
        {showHowItWorks && (
          <div className="nz-modal-bg" onClick={() => setShowHowItWorks(false)}>
            <div className="nz-modal" onClick={(event) => event.stopPropagation()}>
              <h2>How NoteZ Connect Works</h2>
              <p>1. Create a temporary session on the first device.</p>
              <p>2. The second device enters the six-character session code.</p>
              <p>3. NoteZ uses Socket.IO for WebRTC signaling.</p>
              <p>4. WebRTC establishes the peer-to-peer connection.</p>
              <p>5. Files are transferred through a WebRTC DataChannel after explicit receiver acceptance.</p>
              <p>
                The current prototype uses a Google STUN server. A TURN server should be added before production deployment.
              </p>
              <button
                className="nz-primary nz-modal-close"
                onClick={() => setShowHowItWorks(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default NoteS;