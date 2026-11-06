import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFunctions, httpsCallable } from "firebase/functions";
import { onAuthStateChanged } from "firebase/auth";
import { auth, app } from "../../firebase/Firebase";

export default function Echest2() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [activeStorage, setActiveStorage] = useState("documents");
  const [typedText, setTypedText] = useState("");
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [usedStorage, setUsedStorage] = useState(0);
  const [currentUser, setCurrentUser] = useState(auth.currentUser || null);
  const [storedFiles, setStoredFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const functions = getFunctions(app);
  const createEChestUploadUrl = httpsCallable(functions, "createEChestUploadUrl");
  const finalizeEChestUpload = httpsCallable(functions, "finalizeEChestUpload");
  const getEChestFiles = httpsCallable(functions, "getEChestFiles");
  const deleteEChestFile = httpsCallable(functions, "deleteEChestFile");

  const toastTimer = useRef(null);

  const loadingMessages = [
    "Initializing your premium space...",
    "Preparing your 10 GB student vault...",
    "Securing your document storage...",
    "Preparing your photo storage...",
    "Optimizing your NoteZ workspace...",
    "Premium environment ready."
  ];

  const [loadingIndex, setLoadingIndex] = useState(0);

  /* -----------------------------------------
     SMART LOADING
  ----------------------------------------- */

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 4200);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const messageTimer = setInterval(() => {
      setLoadingIndex((previous) => {
        return (previous + 1) % loadingMessages.length;
      });
    }, 700);

    return () => clearInterval(messageTimer);
  }, [loading]);

  /* -----------------------------------------
     REAL-TIME SEARCH TEXT
  ----------------------------------------- */

  useEffect(() => {
    if (loading) return;

    const words = [
      "Search your documents...",
      "Search your photos...",
      "Find your certificates...",
      "Find your student files...",
      "Search your NoteZ vault..."
    ];

    let wordIndex = 0;
    let characterIndex = 0;
    let deleting = false;

    const typingTimer = setInterval(() => {
      const currentWord = words[wordIndex];

      if (!deleting) {
        characterIndex++;

        setTypedText(
          currentWord.substring(0, characterIndex)
        );

        if (characterIndex >= currentWord.length) {
          deleting = true;
        }
      } else {
        characterIndex--;

        setTypedText(
          currentWord.substring(0, characterIndex)
        );

        if (characterIndex <= 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
        }
      }
    }, deleting ? 45 : 85);

    return () => clearInterval(typingTimer);
  }, [loading]);

  /* -----------------------------------------
     TOAST
  ----------------------------------------- */

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type
    });

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  /* -----------------------------------------
     THEME
  ----------------------------------------- */

  const changeTheme = () => {
    setDarkMode((previous) => !previous);

    setTimeout(() => {
      showToast(
        darkMode
          ? "Light premium mode activated"
          : "Dark premium mode activated",
        "theme"
      );
    }, 100);
  };

  /* -----------------------------------------
     STORAGE SELECT
  ----------------------------------------- */

  const selectStorage = (type) => {
    setActiveStorage(type);

    showToast(
      type === "documents"
        ? "Document vault selected"
        : "Photo vault selected",
      "info"
    );
  };

  /* -----------------------------------------
     FILE HANDLING
  ----------------------------------------- */

  const validateFiles = async (files) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);
    let accepted = [];

    if (activeStorage === "documents") {
      accepted = incomingFiles.filter((file) => {
        const allowed = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain"
        ];
        return allowed.includes(file.type) ||
          /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i.test(file.name);
      });
    } else {
      accepted = incomingFiles.filter((file) => file.type.startsWith("image/"));
    }

    if (accepted.length === 0) {
      showToast(
        activeStorage === "documents"
          ? "Please select a supported document."
          : "Please select an image.",
        "error"
      );
      return;
    }

    const totalBytes = accepted.reduce((sum, file) => sum + file.size, 0);
    const totalMB = totalBytes / (1024 * 1024);
    const totalGB = totalBytes / (1024 * 1024 * 1024);

    if (usedStorage + totalGB > 10) {
      showToast("Storage limit reached. Your 10 GB plan is full.", "error");
      return;
    }

    let completed = 0;
    for (const file of accepted) {
      const ok = await uploadToS3(file);
      if (ok) completed += 1;
    }

    await loadEChestFiles();

    if (completed > 0) {
      showToast(
        `${completed} ${activeStorage === "documents" ? "document" : "photo"}${completed > 1 ? "s" : ""} uploaded • ${totalMB.toFixed(2)} MB`,
        "success"
      );
    }
  };

  const handleFileChange = (event) => {
    validateFiles(event.target.files);

    event.target.value = "";
  };

  const openFilePicker = () => {
    const input =
      activeStorage === "documents"
        ? document.getElementById("echest2-documents")
        : document.getElementById("echest2-photos");

    if (input) {
      input.click();
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    validateFiles(event.dataTransfer.files);
  };

  /* -----------------------------------------
     AUTH + AWS E-CHEST FILES
  ----------------------------------------- */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  const loadEChestFiles = async () => {
    try {
      if (!auth.currentUser) return;
      const result = await getEChestFiles();
      const data = result.data || {};
      setStoredFiles(Array.isArray(data.files) ? data.files : []);
      setUsedStorage(Number(data.usedBytes || 0) / (1024 * 1024 * 1024));
    } catch (error) {
      console.error("E-Chest load error:", error);
      showToast(error?.message || "Could not load your E-Chest files.", "error");
    }
  };

  useEffect(() => {
    if (!loading) loadEChestFiles();
  }, [loading, currentUser]);

  const uploadToS3 = async (file) => {
    if (!auth.currentUser) {
      showToast("Please login before uploading to E-Chest.", "error");
      return false;
    }

    try {
      setUploading(true);
      setUploadProgress(5);
      setUploadStatus(`Preparing ${file.name}...`);

      const category = activeStorage === "photos" ? "photos" : "documents";
      const ticket = await createEChestUploadUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        category,
      });

      const { uploadUrl, fileId } = ticket.data || {};
      if (!uploadUrl || !fileId) throw new Error("Upload authorization was not created.");

      setUploadProgress(15);
      setUploadStatus(`Uploading ${file.name}...`);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(15 + Math.round((event.loaded / event.total) * 75));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`AWS upload failed (${xhr.status}).`));
        };
        xhr.onerror = () => reject(new Error("Network error while uploading to AWS S3."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(file);
      });

      setUploadProgress(94);
      setUploadStatus("Securing file record...");
      await finalizeEChestUpload({ fileId });
      setUploadProgress(100);
      setUploadStatus("Upload complete");
      return true;
    } catch (error) {
      console.error("AWS E-Chest upload error:", error);
      showToast(error?.message || "Upload failed.", "error");
      return false;
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus("");
      }, 700);
    }
  };

  const deleteStoredFile = async (fileId) => {
    if (!window.confirm("Delete this file permanently from your NoteZ E-Chest?")) return;
    try {
      await deleteEChestFile({ fileId });
      showToast("File deleted from your E-Chest.", "success");
      await loadEChestFiles();
    } catch (error) {
      console.error("E-Chest delete error:", error);
      showToast(error?.message || "Could not delete the file.", "error");
    }
  };

  /* -----------------------------------------
     LOADING SCREEN
  ----------------------------------------- */

  if (loading) {
    return (
      <>
        <style>{`

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #050505;
          }

          .e2-loader {
            min-height: 100vh;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
            background:
              radial-gradient(
                circle at 50% 50%,
                rgba(255, 193, 7, .13),
                transparent 28%
              ),
              #050505;
            color: white;
            font-family:
              Inter,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .e2-loader-ring {
            position: absolute;
            width: 390px;
            height: 390px;
            border-radius: 50%;
            border: 1px solid rgba(255,193,7,.12);
            animation: e2Ring 7s linear infinite;
          }

          .e2-loader-ring::before {
            content: "";
            position: absolute;
            inset: 45px;
            border-radius: 50%;
            border: 1px dashed rgba(255,193,7,.17);
          }

          .e2-loader-ring::after {
            content: "";
            position: absolute;
            inset: 105px;
            border-radius: 50%;
            border: 1px solid rgba(255,193,7,.16);
          }

          .e2-loader-content {
            width: min(700px, 90%);
            text-align: center;
            position: relative;
            z-index: 5;
          }

          .e2-loader-logo {
            font-size: clamp(44px, 9vw, 82px);
            font-weight: 950;
            letter-spacing: -5px;
            animation: e2Appear .8s ease both;
          }

          .e2-loader-logo span {
            color: #ffc107;
            text-shadow:
              0 0 15px rgba(255,193,7,.65),
              0 0 50px rgba(255,193,7,.25);
          }

          .e2-loader-premium {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-top: 10px;
            padding: 8px 14px;
            border: 1px solid rgba(255,193,7,.25);
            border-radius: 999px;
            color: #ffc107;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 2px;
            background: rgba(255,193,7,.05);
            animation: e2Appear .8s ease .15s both;
          }

          .e2-loader-dot {
            width: 6px;
            height: 6px;
            background: #ffc107;
            border-radius: 50%;
            box-shadow: 0 0 14px #ffc107;
            animation: e2Pulse 1s infinite;
          }

          .e2-loader-message {
            margin-top: 30px;
            min-height: 28px;
            color: #a7a7a7;
            font-size: 14px;
            animation: e2Text .45s ease;
          }

          .e2-loader-bar {
            width: min(440px, 80%);
            height: 3px;
            margin: 28px auto 0;
            background: rgba(255,255,255,.08);
            border-radius: 99px;
            overflow: hidden;
          }

          .e2-loader-bar span {
            display: block;
            height: 100%;
            width: 30%;
            background: #ffc107;
            box-shadow: 0 0 20px #ffc107;
            animation: e2Bar 1.3s ease-in-out infinite;
          }

          .e2-loader-status {
            margin-top: 18px;
            color: #666;
            font-size: 10px;
            letter-spacing: 1px;
          }

          @keyframes e2Ring {
            from {
              transform: rotate(0deg) scale(.95);
            }

            50% {
              transform: rotate(180deg) scale(1.08);
            }

            to {
              transform: rotate(360deg) scale(.95);
            }
          }

          @keyframes e2Bar {
            0% {
              transform: translateX(-150%);
            }

            50% {
              transform: translateX(200%);
            }

            100% {
              transform: translateX(360%);
            }
          }

          @keyframes e2Appear {
            from {
              opacity: 0;
              transform: translateY(18px) scale(.96);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes e2Text {
            from {
              opacity: 0;
              transform: translateY(5px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes e2Pulse {
            0%,100% {
              transform: scale(.8);
              opacity: .5;
            }

            50% {
              transform: scale(1.2);
              opacity: 1;
            }
          }

        `}</style>

        <div className="e2-loader">

          <div className="e2-loader-ring"></div>

          <div className="e2-loader-content">

            <div className="e2-loader-logo">
              NoteZ<span>.</span>
            </div>

            <div className="e2-loader-premium">
              <span className="e2-loader-dot"></span>
              E-CHEST 02 • PREMIUM
            </div>

            <div
              className="e2-loader-message"
              key={loadingIndex}
            >
              {loadingMessages[loadingIndex]}
            </div>

            <div className="e2-loader-bar">
              <span></span>
            </div>

            <div className="e2-loader-status">
              INITIALIZING SECURE STORAGE ENVIRONMENT
            </div>

          </div>

        </div>
      </>
    );
  }

  /* -----------------------------------------
     MAIN PAGE
  ----------------------------------------- */

  return (
    <>
      <style>{`

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          padding: 0;
        }

        button,
        input {
          font: inherit;
        }

        .e2-page {
          --accent: ${darkMode ? "#ffc107" : "#173b72"};
          --accent-soft: ${
            darkMode
              ? "rgba(255,193,7,.10)"
              : "rgba(23,59,114,.09)"
          };

          --background: ${
            darkMode ? "#050505" : "#f4f7fb"
          };

          --surface: ${
            darkMode ? "#0b0b0b" : "#ffffff"
          };

          --surface-two: ${
            darkMode ? "#101010" : "#edf2f8"
          };

          --text: ${
            darkMode ? "#ffffff" : "#101827"
          };

          --muted: ${
            darkMode ? "#888888" : "#667085"
          };

          --border: ${
            darkMode
              ? "rgba(255,255,255,.08)"
              : "rgba(23,59,114,.12)"
          };

          min-height: 100vh;
          color: var(--text);
          background:
            radial-gradient(
              circle at 8% 8%,
              var(--accent-soft),
              transparent 25%
            ),
            radial-gradient(
              circle at 92% 30%,
              var(--accent-soft),
              transparent 27%
            ),
            var(--background);

          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;

          transition:
            background .45s ease,
            color .45s ease;
          overflow-x: hidden;
          position: relative;
        }

        .e2-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: ${darkMode ? ".35" : ".16"};
          background-image:
            linear-gradient(
              rgba(120,120,120,.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(120,120,120,.08) 1px,
              transparent 1px
            );
          background-size: 55px 55px;
          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 75%
          );
        }

        /* HEADER */

        .e2-header {
          height: 78px;
          padding: 0 6%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${
            darkMode
              ? "rgba(5,5,5,.72)"
              : "rgba(244,247,251,.75)"
          };
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          transition:
            background .45s ease,
            border .45s ease;
        }

        .e2-logo {
          font-size: 25px;
          font-weight: 950;
          letter-spacing: -1px;
        }

        .e2-logo span {
          color: var(--accent);
          text-shadow: 0 0 20px var(--accent);
        }

        .e2-header-right {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .e2-plan-badge {
          padding: 8px 13px;
          border-radius: 999px;
          border: 1px solid var(--border);
          color: var(--accent);
          background: var(--accent-soft);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
          transition: .4s ease;
        }

        /* THEME TOGGLE */

        .e2-theme-toggle {
          width: 62px;
          height: 33px;
          border: 1px solid var(--border);
          background: var(--surface-two);
          border-radius: 999px;
          padding: 3px;
          cursor: pointer;
          position: relative;
          transition: .4s ease;
        }

        .e2-theme-toggle:hover {
          transform: scale(1.04);
          border-color: var(--accent);
        }

        .e2-toggle-ball {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: var(--accent);
          display: grid;
          place-items: center;
          color: ${
            darkMode ? "#111" : "#fff"
          };
          position: absolute;
          top: 3px;
          left: ${
            darkMode ? "3px" : "32px"
          };
          transition:
            left .4s cubic-bezier(.2,.9,.2,1),
            transform .2s ease;
          box-shadow:
            0 3px 15px var(--accent);
          font-size: 13px;
        }

        .e2-theme-toggle:active .e2-toggle-ball {
          transform: scale(.82);
        }

        /* HERO */

        .e2-hero {
          width: min(1160px, 92%);
          margin: auto;
          text-align: center;
          padding: 85px 0 45px;
          position: relative;
        }

        .e2-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          background: var(--accent-soft);
          color: var(--accent);
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.7px;
          animation: e2FadeUp .7s ease both;
        }

        .e2-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 12px var(--accent);
          animation: e2SmallPulse 1.6s infinite;
        }

        .e2-title {
          margin: 25px 0 0;
          font-size: clamp(45px, 8vw, 82px);
          line-height: .94;
          letter-spacing: -5px;
          font-weight: 950;
          animation: e2FadeUp .75s ease .1s both;
        }

        .e2-title span {
          color: var(--accent);
          text-shadow: 0 0 35px var(--accent-soft);
          transition: color .45s ease;
        }

        .e2-description {
          width: min(650px, 94%);
          margin: 25px auto 0;
          color: var(--muted);
          line-height: 1.7;
          font-size: 14px;
          animation: e2FadeUp .75s ease .2s both;
        }

        /* OVAL SEARCH */

        .e2-search-wrapper {
          width: min(820px, 95%);
          margin: 44px auto 0;
          padding: 2px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--accent),
            transparent
          );
          background-size: 220% 100%;
          animation:
            e2SearchGlow 5s linear infinite,
            e2FadeUp .8s ease .3s both;
        }

        .e2-search {
          height: 72px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 0 25px;
          background: var(--surface);
          border: 1px solid var(--border);
          text-align: left;
          box-shadow:
            0 25px 80px rgba(0,0,0,.12);
        }

        .e2-search-icon {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 18px;
        }

        .e2-search-text {
          flex: 1;
          overflow: hidden;
          white-space: nowrap;
          color: var(--muted);
          font-size: 14px;
        }

        .e2-search-cursor {
          color: var(--accent);
          animation: e2Cursor .8s infinite;
        }

        .e2-search-status {
          font-size: 9px;
          font-weight: 900;
          color: var(--accent);
          letter-spacing: 1px;
          white-space: nowrap;
        }

        /* MAIN */

        .e2-content {
          width: min(1080px, 92%);
          margin: 15px auto 100px;
        }

        .e2-overview {
          display: grid;
          grid-template-columns: 1.4fr .6fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .e2-card {
          background: ${
            darkMode
              ? "rgba(255,255,255,.035)"
              : "rgba(255,255,255,.78)"
          };
          border: 1px solid var(--border);
          border-radius: 25px;
          backdrop-filter: blur(18px);
          box-shadow:
            0 20px 70px rgba(0,0,0,.08);
          transition:
            background .45s ease,
            border .45s ease,
            transform .3s ease,
            box-shadow .3s ease;
        }

        .e2-card:hover {
          transform: translateY(-2px);
        }

        .e2-usage {
          padding: 26px;
        }

        .e2-usage-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .e2-usage-title {
          font-size: 17px;
          font-weight: 900;
        }

        .e2-usage-subtitle {
          margin-top: 6px;
          color: var(--muted);
          font-size: 11px;
        }

        .e2-usage-number {
          color: var(--accent);
          font-size: 21px;
          font-weight: 950;
          white-space: nowrap;
        }

        .e2-progress {
          height: 9px;
          margin-top: 21px;
          border-radius: 999px;
          overflow: hidden;
          background: ${
            darkMode
              ? "rgba(255,255,255,.07)"
              : "rgba(23,59,114,.09)"
          };
        }

        .e2-progress-bar {
          height: 100%;
          width: ${Math.min((usedStorage / 10) * 100, 100)}%;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 20px var(--accent);
          transition:
            width .6s cubic-bezier(.2,.8,.2,1),
            background .45s ease;
        }

        .e2-plan {
          padding: 26px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .e2-plan small {
          color: var(--muted);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .e2-plan-price {
          margin-top: 7px;
          font-size: 29px;
          font-weight: 950;
        }

        .e2-plan-price span {
          color: var(--accent);
        }

        .e2-plan-note {
          color: var(--muted);
          font-size: 10px;
          margin-top: 3px;
        }

        /* STORAGE SELECTOR */

        .e2-storage-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 16px;
        }

        .e2-storage-button {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border);
          background: ${
            darkMode
              ? "rgba(255,255,255,.025)"
              : "rgba(255,255,255,.68)"
          };
          color: var(--text);
          border-radius: 21px;
          padding: 20px;
          text-align: left;
          cursor: pointer;
          transition:
            transform .25s ease,
            border .3s ease,
            background .3s ease;
        }

        .e2-storage-button::after {
          content: "";
          position: absolute;
          width: 100px;
          height: 100px;
          right: -50px;
          bottom: -50px;
          border-radius: 50%;
          background: var(--accent-soft);
          transition: .4s ease;
        }

        .e2-storage-button:hover {
          transform: translateY(-3px);
          border-color: var(--accent);
        }

        .e2-storage-button:active {
          transform: scale(.98);
        }

        .e2-storage-button.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .e2-storage-icon {
          font-size: 23px;
          color: var(--accent);
        }

        .e2-storage-name {
          margin-top: 10px;
          font-size: 14px;
          font-weight: 900;
        }

        .e2-storage-info {
          margin-top: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        /* VAULT */

        .e2-vault {
          padding: 28px;
        }

        .e2-vault-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
        }

        .e2-vault-head h2 {
          margin: 0;
          font-size: 23px;
          font-weight: 950;
        }

        .e2-vault-head p {
          margin: 7px 0 0;
          color: var(--muted);
          font-size: 11px;
        }

        .e2-back {
          border: 1px solid var(--border);
          color: var(--muted);
          background: transparent;
          border-radius: 12px;
          padding: 9px 13px;
          cursor: pointer;
          transition: .25s ease;
        }

        .e2-back:hover {
          color: var(--accent);
          border-color: var(--accent);
        }

        /* DROP ZONE */

        .e2-drop {
          min-height: 310px;
          border: 1px dashed var(--border);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              var(--accent-soft),
              transparent 55%
            );
          transition:
            border .3s ease,
            transform .3s ease,
            background .3s ease;
        }

        .e2-drop::before {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          border: 1px solid var(--accent-soft);
          animation: e2Orbit 8s linear infinite;
        }

        .e2-drop.dragging {
          border-color: var(--accent);
          transform: scale(1.01);
          background: var(--accent-soft);
        }

        .e2-drop-content {
          position: relative;
          z-index: 3;
        }

        .e2-upload-icon {
          width: 70px;
          height: 70px;
          margin: auto;
          border-radius: 23px;
          display: grid;
          place-items: center;
          color: var(--accent);
          background: var(--accent-soft);
          border: 1px solid var(--border);
          font-size: 27px;
          animation: e2Float 3s ease-in-out infinite;
        }

        .e2-upload-title {
          margin-top: 21px;
          font-size: 20px;
          font-weight: 950;
        }

        .e2-upload-subtitle {
          margin-top: 7px;
          color: var(--muted);
          font-size: 11px;
        }

        .e2-upload-button {
          margin-top: 20px;
          border: 0;
          padding: 13px 22px;
          border-radius: 13px;
          background: var(--accent);
          color: ${
            darkMode ? "#101010" : "#ffffff"
          };
          font-weight: 950;
          cursor: pointer;
          box-shadow:
            0 8px 30px var(--accent-soft);
          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .e2-upload-button:hover {
          transform: translateY(-3px);
          box-shadow:
            0 15px 40px var(--accent-soft);
        }

        .e2-upload-button:active {
          transform: scale(.94);
        }

        .e2-security {
          margin-top: 16px;
          color: var(--muted);
          font-size: 9px;
        }

        .e2-security span {
          color: var(--accent);
        }

        /* FEATURES */

        .e2-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 15px;
        }

        .e2-feature {
          padding: 20px;
          border-radius: 19px;
          border: 1px solid var(--border);
          background: var(--accent-soft);
          transition: .3s ease;
        }

        .e2-feature:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
        }

        .e2-feature-icon {
          color: var(--accent);
          font-size: 19px;
        }

        .e2-feature strong {
          display: block;
          margin-top: 10px;
          font-size: 12px;
        }

        .e2-feature p {
          color: var(--muted);
          font-size: 10px;
          line-height: 1.6;
          margin-bottom: 0;
        }

        /* AWS UPLOAD STATUS + FILE LIST */
        .e2-upload-status {
          margin-top: 14px;
          width: min(430px, 90%);
          margin-left: auto;
          margin-right: auto;
        }

        .e2-upload-status-text {
          color: var(--muted);
          font-size: 10px;
          margin-bottom: 7px;
        }

        .e2-upload-progress {
          height: 5px;
          border-radius: 999px;
          background: var(--border);
          overflow: hidden;
        }

        .e2-upload-progress span {
          display: block;
          height: 100%;
          width: ${uploadProgress}%;
          border-radius: inherit;
          background: var(--accent);
          box-shadow: 0 0 16px var(--accent);
          transition: width .25s ease;
        }

        .e2-files-list {
          margin-top: 18px;
          display: grid;
          gap: 10px;
        }

        .e2-file-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border: 1px solid var(--border);
          border-radius: 15px;
          background: var(--surface-two);
        }

        .e2-file-main { flex: 1; min-width: 0; }
        .e2-file-name {
          font-size: 11px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .e2-file-meta {
          margin-top: 4px;
          color: var(--muted);
          font-size: 9px;
        }

        .e2-file-actions { display: flex; gap: 7px; }
        .e2-file-action {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text);
          border-radius: 10px;
          padding: 7px 9px;
          cursor: pointer;
          font-size: 10px;
        }
        .e2-file-action:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* TOAST */

        .e2-toast {
          position: fixed;
          z-index: 999;
          right: 25px;
          bottom: 25px;
          min-width: 260px;
          max-width: 380px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: ${
            darkMode
              ? "rgba(14,14,14,.94)"
              : "rgba(255,255,255,.96)"
          };
          color: var(--text);
          backdrop-filter: blur(20px);
          box-shadow:
            0 20px 60px rgba(0,0,0,.25);
          animation:
            e2ToastIn .35s cubic-bezier(.2,.8,.2,1) both;
        }

        .e2-toast-icon {
          width: 29px;
          height: 29px;
          min-width: 29px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent);
          font-size: 12px;
        }

        .e2-toast-message {
          font-size: 11px;
          font-weight: 750;
          line-height: 1.4;
        }

        /* ANIMATIONS */

        @keyframes e2FadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes e2SearchGlow {
          0% {
            background-position: -100% 0;
          }

          100% {
            background-position: 200% 0;
          }
        }

        @keyframes e2Cursor {
          0%,45% {
            opacity: 1;
          }

          46%,100% {
            opacity: 0;
          }
        }

        @keyframes e2SmallPulse {
          0%,100% {
            transform: scale(.7);
            opacity: .5;
          }

          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes e2Float {
          0%,100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-7px);
          }
        }

        @keyframes e2Orbit {
          from {
            transform: rotate(0deg) scale(.85);
            opacity: .2;
          }

          50% {
            transform: rotate(180deg) scale(1.12);
            opacity: .7;
          }

          to {
            transform: rotate(360deg) scale(.85);
            opacity: .2;
          }
        }

        @keyframes e2ToastIn {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.96);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 800px) {

          .e2-header {
            padding: 0 4%;
          }

          .e2-overview {
            grid-template-columns: 1fr;
          }

          .e2-features {
            grid-template-columns: 1fr;
          }

          .e2-hero {
            padding-top: 65px;
          }

          .e2-search-status {
            display: none;
          }

        }

        @media (max-width: 560px) {

          .e2-header {
            height: 66px;
          }

          .e2-logo {
            font-size: 21px;
          }

          .e2-plan-badge {
            display: none;
          }

          .e2-title {
            font-size: 49px;
            letter-spacing: -3px;
          }

          .e2-description {
            font-size: 12px;
          }

          .e2-search {
            height: 61px;
            padding: 0 14px;
          }

          .e2-search-icon {
            width: 34px;
            min-width: 34px;
            height: 34px;
          }

          .e2-search-text {
            font-size: 11px;
          }

          .e2-content {
            width: 94%;
          }

          .e2-storage-options {
            grid-template-columns: 1fr;
          }

          .e2-usage,
          .e2-plan,
          .e2-vault {
            padding: 20px;
          }

          .e2-usage-number {
            font-size: 17px;
          }

          .e2-vault-head {
            flex-direction: column;
          }

          .e2-back {
            display: none;
          }

          .e2-drop {
            min-height: 275px;
          }

          .e2-toast {
            left: 15px;
            right: 15px;
            bottom: 15px;
            min-width: 0;
          }

        }

        @media (prefers-reduced-motion: reduce) {

          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }

        }

      `}</style>

      <div className="e2-page">

        {/* HEADER */}

        <header className="e2-header">

          <div className="e2-logo">
            NoteZ<span>.</span>
          </div>

          <div className="e2-header-right">

            <div className="e2-plan-badge">
              E-CHEST 02 • 10 GB
            </div>

            <button
              className="e2-theme-toggle"
              onClick={changeTheme}
              aria-label="Change theme"
            >
              <div className="e2-toggle-ball">
                {darkMode ? "☾" : "☀"}
              </div>
            </button>

          </div>

        </header>

        {/* HERO */}

        <section className="e2-hero">

          <div className="e2-eyebrow">
            <span className="e2-eyebrow-dot"></span>
            NOTEZ PREMIUM STORAGE
          </div>

          <h1 className="e2-title">
            More space.
            <br />
            <span>More control.</span>
          </h1>

          <p className="e2-description">
            A mature, simple and focused storage environment
            for your academic documents, certificates and
            important photos.
          </p>

          <div className="e2-search-wrapper">

            <div className="e2-search">

              <div className="e2-search-icon">
                ⌕
              </div>

              <div className="e2-search-text">
                {typedText}
                <span className="e2-search-cursor">
                  |
                </span>
              </div>

              <div className="e2-search-status">
                READY
              </div>

            </div>

          </div>

        </section>

        {/* MAIN CONTENT */}

        <main className="e2-content">

          {/* USAGE */}

          <section className="e2-overview">

            <div className="e2-card e2-usage">

              <div className="e2-usage-top">

                <div>

                  <div className="e2-usage-title">
                    Storage overview
                  </div>

                  <div className="e2-usage-subtitle">
                    E-Chest 02 • Student Premium Vault
                  </div>

                </div>

                <div className="e2-usage-number">
                  {usedStorage.toFixed(2)} / 10 GB
                </div>

              </div>

              <div className="e2-progress">

                <div className="e2-progress-bar"></div>

              </div>

            </div>

            <div className="e2-card e2-plan">

              <small>
                PREMIUM PLAN
              </small>

              <div className="e2-plan-price">
                ₹<span>100</span>
              </div>

              <div className="e2-plan-note">
                10 GB • Monthly
              </div>

            </div>

          </section>

          {/* STORAGE TYPES */}

          <section className="e2-storage-options">

            <button
              className={`e2-storage-button ${
                activeStorage === "documents"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                selectStorage("documents")
              }
            >

              <div className="e2-storage-icon">
                ▣
              </div>

              <div className="e2-storage-name">
                Document Storage
              </div>

              <div className="e2-storage-info">
                PDF, DOC, PPT, certificates and
                academic files
              </div>

            </button>

            <button
              className={`e2-storage-button ${
                activeStorage === "photos"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                selectStorage("photos")
              }
            >

              <div className="e2-storage-icon">
                ▧
              </div>

              <div className="e2-storage-name">
                Photo Storage
              </div>

              <div className="e2-storage-info">
                Store important student photos
                and images
              </div>

            </button>

          </section>

          {/* VAULT */}

          <section className="e2-card e2-vault">

            <div className="e2-vault-head">

              <div>

                <h2>
                  {activeStorage === "documents"
                    ? "Document Vault"
                    : "Photo Vault"}
                </h2>

                <p>
                  {activeStorage === "documents"
                    ? "Organize your academic documents in one premium space."
                    : "Keep your important student photos together."}
                </p>

              </div>

              <button
                className="e2-back"
                onClick={() => navigate("/MONEY")}
              >
                ← Plans
              </button>

            </div>

            <div
              className={`e2-drop ${
                dragging ? "dragging" : ""
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={handleDrop}
            >

              <div className="e2-drop-content">

                <div className="e2-upload-icon">
                  {activeStorage === "documents"
                    ? "▣"
                    : "▧"}
                </div>

                <div className="e2-upload-title">
                  {dragging
                    ? "Release to add files"
                    : activeStorage === "documents"
                    ? "Drop documents here"
                    : "Drop photos here"}
                </div>

                <div className="e2-upload-subtitle">
                  or choose files from your device
                </div>

                <button
                  className="e2-upload-button"
                  onClick={openFilePicker}
                >
                  + Add{" "}
                  {activeStorage === "documents"
                    ? "Document"
                    : "Photo"}
                </button>

                <div className="e2-security">
                  <span>●</span> Premium student
                  storage • 10 GB available
                </div>

              </div>

            </div>

            {uploading && (
              <div className="e2-upload-status">
                <div className="e2-upload-status-text">
                  {uploadStatus} • {uploadProgress}%
                </div>
                <div className="e2-upload-progress">
                  <span></span>
                </div>
              </div>
            )}

            {storedFiles.filter((file) => file.category === activeStorage).length > 0 && (
              <div className="e2-files-list">
                {storedFiles
                  .filter((file) => file.category === activeStorage)
                  .map((file) => (
                    <div className="e2-file-row" key={file.id}>
                      <div className="e2-file-main">
                        <div className="e2-file-name">{file.name}</div>
                        <div className="e2-file-meta">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB • AWS S3 • Private
                        </div>
                      </div>
                      <div className="e2-file-actions">
                        {file.downloadUrl && (
                          <a
                            className="e2-file-action"
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download
                          </a>
                        )}
                        <button
                          className="e2-file-action"
                          onClick={() => deleteStoredFile(file.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* HIDDEN FILE INPUTS */}

            <input
              id="echest2-documents"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <input
              id="echest2-photos"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {/* FEATURES */}

            <div className="e2-features">

              <div className="e2-feature">

                <div className="e2-feature-icon">
                  ◈
                </div>

                <strong>
                  10 GB Space
                </strong>

                <p>
                  Dedicated premium storage
                  for your student files.
                </p>

              </div>

              <div className="e2-feature">

                <div className="e2-feature-icon">
                  ⌁
                </div>

                <strong>
                  Two Storage Types
                </strong>

                <p>
                  Keep documents and photos
                  organized separately.
                </p>

              </div>

              <div className="e2-feature">

                <div className="e2-feature-icon">
                  ◇
                </div>

                <strong>
                  Premium Experience
                </strong>

                <p>
                  Designed to be clean,
                  responsive and simple.
                </p>

              </div>

            </div>

          </section>

        </main>

        {/* TOAST */}

        {toast && (
          <div className="e2-toast">

            <div className="e2-toast-icon">
              {toast.type === "error"
                ? "!"
                : toast.type === "theme"
                ? "◐"
                : "✓"}
            </div>

            <div className="e2-toast-message">
              {toast.message}
            </div>

          </div>
        )}

      </div>
    </>
  );
}