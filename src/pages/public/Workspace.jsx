import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

/*
  NoteZ Personal Student Workspace & NICO AI 2.0
  -----------------------------------------------
  Upgraded single-file production version:
  - Preserved all existing working functionality (Files, Preview, Calculator, Tasks, Remember AI, Local Music)
  - Uses a normal local workspace session; authentication is handled by the Home/login flow.
  - Added Global Toast Notification System
  - Upgraded Calculator with Scientific & Simple Modes + Safe Expression Parser
  - Upgraded Music Player with persistent playlists, robust object URL lifecycle, and loop support
  - Professional White + Soft Green SaaS Design System
  - Fully Responsive Desktop, Tablet, and Mobile Layouts with Intro Welcome Modals
*/

const MEMORY_KEY = "notez_workspace_memories_v2";
const TASK_KEY = "notez_workspace_tasks_v2";
const PLAYLIST_KEY = "notez_workspace_playlists_v2";
const SETTINGS_KEY = "notez_workspace_settings_v2";
const INTRO_SHOWN_KEY = "notez_workspace_intro_shown_v2";

// Per-user durable browser storage. Metadata/history live in localStorage;
// real File/Blob data lives in IndexedDB because localStorage cannot safely
// persist binary File objects across refreshes. Both stores are scoped by uid.
const HISTORY_KEY = "notez_workspace_history_v3";
const FILE_META_KEY = "notez_workspace_files_v3";
const WORKSPACE_DB_NAME = "NoteZWorkspacePersistentDB";
const WORKSPACE_DB_VERSION = 1;
const WORKSPACE_FILE_STORE = "files";

const userStorageKey = (baseKey, uid) => `${baseKey}_${uid || "anonymous"}`;

function openWorkspaceDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = window.indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_FILE_STORE)) {
        db.createObjectStore(WORKSPACE_FILE_STORE, { keyPath: "storageKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open workspace storage."));
  });
}

async function putWorkspaceFile(uid, item) {
  const db = await openWorkspaceDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_FILE_STORE, "readwrite");
    tx.objectStore(WORKSPACE_FILE_STORE).put({
      storageKey: `${uid}:${item.id}`,
      uid,
      id: item.id,
      name: item.name,
      size: item.size,
      type: item.type,
      icon: item.icon,
      kind: item.kind,
      addedAt: item.addedAt,
      file: item.file,
    });
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function deleteWorkspaceFile(uid, id) {
  const db = await openWorkspaceDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_FILE_STORE, "readwrite");
    tx.objectStore(WORKSPACE_FILE_STORE).delete(`${uid}:${id}`);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getWorkspaceFiles(uid) {
  const db = await openWorkspaceDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_FILE_STORE, "readonly");
    const request = tx.objectStore(WORKSPACE_FILE_STORE).getAll();
    request.onsuccess = () => {
      const rows = (request.result || []).filter((row) => row.uid === uid);
      db.close();
      resolve(rows);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function requestPersistentBrowserStorage() {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {}
}

export default function WORKPLACE() {
  /* =========================================================
     1. AUTHENTICATION & STATE ARCHITECTURE
  ========================================================= */

  const [user] = useState({
    uid: "local-workspace-user",
    displayName: "Student User",
    email: "Local Workspace"
  });

  const [activeTool, setActiveTool] = useState("workplace"); // workplace, calculator, tasks, progress, ai, profile
  const [files, setFiles] = useState([]);
  const [history, setHistory] = useState([]);
  const filesHydratedRef = useRef(false);
  const userDataHydratedRef = useRef(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Intro Welcome Modal State
  const [showWorkspaceIntro, setShowWorkspaceIntro] = useState(() => {
    try {
      return !localStorage.getItem(INTRO_SHOWN_KEY);
    } catch {
      return true;
    }
  });

  // Music State
  const [showMusic, setShowMusic] = useState(false);
  const [musicList, setMusicList] = useState([]);
  const [musicIndex, setMusicIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.75);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicLoop, setMusicLoop] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  // Calculator State
  const [calculator, setCalculator] = useState("");
  const [calcMode, setCalcMode] = useState("simple"); // simple | scientific
  const [calcAngleMode, setCalcAngleMode] = useState("deg"); // deg | rad
  const [calcHistory, setCalcHistory] = useState([]);

  // Clock State
  const [time, setTime] = useState(new Date());

  // Task State
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // Remember AI / Memories State
  const [memories, setMemories] = useState([]);
  const [memoryText, setMemoryText] = useState("");
  const [memorySearch, setMemorySearch] = useState("");

  // Toast State
  const [toast, setToast] = useState(null);

  // References
  const fileInputRef = useRef(null);
  const musicInputRef = useRef(null);
  const audioRef = useRef(null);
  const objectUrlsRef = useRef(new Map());
  
  // Stale-safe Music Refs
  const musicListRef = useRef([]);
  const musicIndexRef = useRef(0);
  const musicLoopRef = useRef(false);
  const musicPlayingRef = useRef(false);
  const musicWakeLockRef = useRef(null);

  /* =========================================================
     2. GLOBAL TOAST SYSTEM & LOCAL WORKSPACE STATE
  ========================================================= */

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Load a completely separate workspace for the authenticated user.
  // Nothing from another uid is reused. Files are restored from IndexedDB,
  // while lightweight metadata, tasks, memories and history come from localStorage.
  useEffect(() => {
    let cancelled = false;

    const hydrateUserWorkspace = async () => {
      if (!user?.uid) {
        filesHydratedRef.current = false;
        userDataHydratedRef.current = false;
        setFiles([]);
        setTasks([]);
        setMemories([]);
        setHistory([]);
        return;
      }

      filesHydratedRef.current = false;
      userDataHydratedRef.current = false;
      setFiles([]);
      setSelectedFileId(null);

      try {
        requestPersistentBrowserStorage();

        const readJson = (key, fallback = []) => {
          try {
            const raw = localStorage.getItem(userStorageKey(key, user.uid));
            return raw ? JSON.parse(raw) : fallback;
          } catch {
            return fallback;
          }
        };

        const [storedFiles, storedHistory] = await Promise.all([
          getWorkspaceFiles(user.uid).catch(() => []),
          Promise.resolve(readJson(HISTORY_KEY, [])),
        ]);

        if (cancelled) return;

        const restoredFiles = storedFiles.map(({ file, ...meta }) => ({ ...meta, file }));
        const metadataFallback = readJson(FILE_META_KEY, []);
        const finalFiles = restoredFiles.length
          ? restoredFiles
          : metadataFallback.filter((item) => item?.name).map((item) => ({ ...item, file: null }));

        setFiles(finalFiles);
        setSelectedFileId(finalFiles[0]?.id || null);
        setTasks(readJson(TASK_KEY, []));
        setMemories(readJson(MEMORY_KEY, []));
        setPlaylists(readJson(PLAYLIST_KEY, []));
        const loginEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          action: "Workspace opened",
          details: "Authenticated session started",
          fileName: "",
          createdAt: Date.now(),
          userId: user.uid,
        };
        const restoredHistory = Array.isArray(storedHistory) ? storedHistory.slice(0, 99) : [];
        const nextHistory = [loginEntry, ...restoredHistory];
        setHistory(nextHistory);
        try { localStorage.setItem(userStorageKey(HISTORY_KEY, user.uid), JSON.stringify(nextHistory)); } catch {}
        filesHydratedRef.current = true;
        userDataHydratedRef.current = true;
      } catch {
        if (!cancelled) {
          setFiles([]);
          setTasks([]);
          setMemories([]);
          setPlaylists([]);
          setHistory([]);
          filesHydratedRef.current = true;
          userDataHydratedRef.current = true;
          showToast("Workspace storage could not be restored", "error");
        }
      }
    };

    hydrateUserWorkspace();
    return () => { cancelled = true; };
  }, [user?.uid, showToast]);

  // Record activity instantly and persist it for the current user.
  const addHistory = useCallback((action, details = "", fileName = "") => {
    if (!user?.uid) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      action,
      details,
      fileName,
      createdAt: Date.now(),
      userId: user.uid,
    };
    setHistory((old) => {
      const next = [entry, ...old].slice(0, 100);
      try {
        localStorage.setItem(userStorageKey(HISTORY_KEY, user.uid), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [user?.uid]);

  const lastActivity = history[0] || null;

  /* =========================================================
     3. CLOCK & STORAGE EFFECTS
  ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.uid || !userDataHydratedRef.current) return;
    try { localStorage.setItem(userStorageKey(TASK_KEY, user.uid), JSON.stringify(tasks)); } catch {}
  }, [tasks, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !userDataHydratedRef.current) return;
    try { localStorage.setItem(userStorageKey(MEMORY_KEY, user.uid), JSON.stringify(memories)); } catch {}
  }, [memories, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !userDataHydratedRef.current) return;
    try { localStorage.setItem(userStorageKey(PLAYLIST_KEY, user.uid), JSON.stringify(playlists)); } catch {}
  }, [playlists, user?.uid]);

  // Keep file metadata in localStorage and actual file bytes in IndexedDB.
  useEffect(() => {
    if (!user?.uid || !filesHydratedRef.current) return;
    const metadata = files.map(({ file, ...meta }) => meta);
    try { localStorage.setItem(userStorageKey(FILE_META_KEY, user.uid), JSON.stringify(metadata)); } catch {}

    const persistFiles = async () => {
      for (const item of files) {
        if (item?.file) {
          try { await putWorkspaceFile(user.uid, item); } catch {}
        }
      }
    };
    persistFiles();
  }, [files, user?.uid]);

  useEffect(() => {
    if (!user?.uid || !userDataHydratedRef.current) return;
    try { localStorage.setItem(userStorageKey(HISTORY_KEY, user.uid), JSON.stringify(history.slice(0, 100))); } catch {}
  }, [history, user?.uid]);

  // Synchronize refs for reliable callbacks
  useEffect(() => {
    musicListRef.current = musicList;
  }, [musicList]);

  useEffect(() => {
    musicIndexRef.current = musicIndex;
  }, [musicIndex]);

  useEffect(() => {
    musicLoopRef.current = musicLoop;
  }, [musicLoop]);

  useEffect(() => {
    musicPlayingRef.current = musicPlaying;
  }, [musicPlaying]);

  /* =========================================================
     4. FORMATTERS & HELPERS
  ========================================================= */

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${
      units[index]
    }`;
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  const getExtension = (name = "") => {
    const parts = name.toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() : "";
  };

  const getFileIcon = (file) => {
    const ext = getExtension(file?.name);
    if (["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext)) return "▧";
    if (ext === "pdf") return "PDF";
    if (["doc", "docx", "odt", "rtf"].includes(ext)) return "DOC";
    if (["ppt", "pptx", "odp"].includes(ext)) return "PPT";
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return "SHEET";
    if (["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) return "VID";
    if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "♪";
    if (["txt", "md", "json", "js", "jsx", "css", "html", "py", "java", "cpp"].includes(ext)) return "TXT";
    if (["zip", "rar", "7z"].includes(ext)) return "ZIP";
    return "FILE";
  };

  const getKind = (file) => {
    const type = file?.type || "";
    const ext = getExtension(file?.name);
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (type === "application/pdf" || ext === "pdf") return "pdf";
    if (
      type.startsWith("text/") ||
      ["txt", "md", "json", "js", "jsx", "css", "html", "py", "java", "cpp", "csv"].includes(ext)
    ) {
      return "text";
    }
    if (["doc", "docx", "odt", "rtf", "ppt", "pptx", "odp", "xls", "xlsx", "ods"].includes(ext)) {
      return "office";
    }
    return "other";
  };

  /* =========================================================
     5. OBJECT URL MANAGEMENT (Leak-free)
  ========================================================= */

  const getObjectUrl = (item) => {
    if (!item?.file) return "";
    if (!objectUrlsRef.current.has(item.id)) {
      objectUrlsRef.current.set(item.id, URL.createObjectURL(item.file));
    }
    return objectUrlsRef.current.get(item.id);
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      musicListRef.current.forEach((item) => {
        if (item?.url) URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  /* =========================================================
     6. FILE MANAGEMENT
  ========================================================= */

  const addFiles = (selectedFiles) => {
    const list = Array.from(selectedFiles || []);
    if (!list.length) return;

    const newFiles = list.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 10)}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      icon: getFileIcon(file),
      kind: getKind(file),
      addedAt: Date.now(),
    }));

    setFiles((oldFiles) => [...oldFiles, ...newFiles]);
    if (!selectedFileId) {
      setSelectedFileId(newFiles[0].id);
    }
    newFiles.forEach((item) => {
      addHistory("File added", "Added to Workspace", item.name);
    });
    showToast(`${newFiles.length} ${newFiles.length === 1 ? "file" : "files"} added successfully`);
  };

  const handleFileSelect = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const selectFile = (id) => {
    const item = files.find((file) => file.id === id);
    setSelectedFileId(id);
    setActiveTool("workplace");
    if (item) addHistory("File opened", "Preview opened", item.name);
    showToast("Preview opened", "info");
  };

  const removeFile = (id) => {
    const url = objectUrlsRef.current.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(id);
    }
    const removedItem = files.find((item) => item.id === id);
    setFiles((oldFiles) => oldFiles.filter((item) => item.id !== id));
    if (user?.uid) deleteWorkspaceFile(user.uid, id).catch(() => {});
    if (removedItem) addHistory("File removed", "Removed from Workspace", removedItem.name);
    if (selectedFileId === id) {
      const remaining = files.filter((item) => item.id !== id);
      setSelectedFileId(remaining[0]?.id || null);
    }
    showToast("File removed");
  };

  const downloadFile = (item) => {
    if (!item?.file) return;
    const url = getObjectUrl(item);
    const link = document.createElement("a");
    link.href = url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    addHistory("File downloaded", "Download started", item.name);
    showToast("Download started", "info");
  };

  const openFileNewTab = (item) => {
    if (!item?.file) return;
    window.open(getObjectUrl(item), "_blank", "noopener,noreferrer");
    addHistory("File opened", "Opened in new browser tab", item.name);
  };

  const selectedFile = files.find((item) => item.id === selectedFileId) || null;
  const totalSize = files.reduce((total, item) => total + item.size, 0);

  // Text File Preview Loader
  const [textPreview, setTextPreview] = useState("");
  const [textLoading, setTextLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadText = async () => {
      if (!selectedFile || selectedFile.kind !== "text") {
        setTextPreview("");
        return;
      }
      setTextLoading(true);
      try {
        const text = await selectedFile.file.text();
        if (!cancelled) setTextPreview(text.slice(0, 200000));
      } catch {
        if (!cancelled) setTextPreview("Unable to preview this text file.");
      } finally {
        if (!cancelled) setTextLoading(false);
      }
    };
    loadText();
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  /* =========================================================
     7. CALCULATOR (Simple + Scientific Modes)
  ========================================================= */

  const calculatorPress = (value) => {
    setCalculator((old) => `${old}${value}`);
  };

  const calculatorClear = () => setCalculator("");

  const calculatorBackspace = () => {
    setCalculator((old) => old.slice(0, -1));
  };

  const calculatorCalculate = () => {
    try {
      if (!calculator.trim()) return;
      let expr = calculator
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/%/g, "/100")
        .replace(/π/g, "Math.PI")
        .replace(/e/g, "Math.E")
        .replace(/sqrt\(/g, "Math.sqrt(")
        .replace(/sin\(/g, calcAngleMode === "deg" ? "Math.sin((Math.PI/180)*" : "Math.sin(")
        .replace(/cos\(/g, calcAngleMode === "deg" ? "Math.cos((Math.PI/180)*" : "Math.cos(")
        .replace(/tan\(/g, calcAngleMode === "deg" ? "Math.tan((Math.PI/180)*" : "Math.tan(")
        .replace(/log\(/g, "Math.log10(")
        .replace(/ln\(/g, "Math.log(");

      const result = Function(`"use strict"; return (${expr})`)();
      if (!Number.isFinite(result)) throw new Error("Invalid result");
      
      setCalcHistory((prev) => [`${calculator} = ${result}`, ...prev.slice(0, 9)]);
      setCalculator(String(result));
      showToast("Calculation completed", "info");
    } catch {
      showToast("Invalid mathematical expression", "error");
      setCalculator("Error");
      window.setTimeout(() => setCalculator(""), 800);
    }
  };

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (activeTool !== "calculator") return;
      const key = event.key;
      if (/^[0-9+\-*/().%]$/.test(key)) {
        event.preventDefault();
        calculatorPress(key);
      }
      if (key === "Enter") {
        event.preventDefault();
        calculatorCalculate();
      }
      if (key === "Backspace") {
        event.preventDefault();
        calculatorBackspace();
      }
      if (key === "Escape") {
        event.preventDefault();
        calculatorClear();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [activeTool, calculator]);

  /* =========================================================
     8. TASK SYSTEM & REALISTIC PROGRESS
  ========================================================= */

  const addTask = () => {
    const clean = newTask.trim();
    if (!clean) {
      showToast("Write a task first", "error");
      return;
    }
    const task = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text: clean,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks((old) => [task, ...old]);
    setNewTask("");
    addHistory("Assignment/task created", clean);
    showToast("Task created");
  };

  const toggleTask = (id) => {
    setTasks((old) =>
      old.map((task) => {
        if (task.id === id) {
          const nextState = !task.completed;
          addHistory(nextState ? "Assignment/task completed" : "Assignment/task reopened", task.text);
          showToast(nextState ? "Task completed" : "Task updated");
          return { ...task, completed: nextState };
        }
        return task;
      })
    );
  };

  const deleteTask = (id) => {
    const deletedTask = tasks.find((task) => task.id === id);
    setTasks((old) => old.filter((task) => task.id !== id));
    if (deletedTask) addHistory("Assignment/task deleted", deletedTask.text);
    showToast("Task deleted");
  };

  const completedTasks = tasks.filter((task) => task.completed).length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  /* =========================================================
     9. REMEMBER AI & MEMORY MANAGER API
  ========================================================= */

  const addMemory = (textOverride, sourceOverride = "Workspace") => {
    const clean = (textOverride || memoryText).trim();
    if (!clean) {
      showToast("Write something for Remember AI", "error");
      return;
    }
    const memory = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      text: clean,
      createdAt: Date.now(),
      source: sourceOverride,
    };
    setMemories((old) => [memory, ...old]);
    if (!textOverride) setMemoryText("");
    addHistory("AI memory saved", clean, sourceOverride);
    showToast("AI memory saved");
  };

  const rememberSelectedFile = () => {
    if (!selectedFile) {
      showToast("Open a file first", "error");
      return;
    }
    addMemory(`Workspace file: ${selectedFile.name} (${formatSize(selectedFile.size)})`, "File");
  };

  const deleteMemory = (id) => {
    const deletedMemory = memories.find((m) => m.id === id);
    setMemories((old) => old.filter((m) => m.id !== id));
    if (deletedMemory) addHistory("AI memory deleted", deletedMemory.text, deletedMemory.source);
    showToast("AI memory deleted");
  };

  const filteredMemories = useMemo(() => {
    const query = memorySearch.trim().toLowerCase();
    if (!query) return memories;
    return memories.filter((m) => m.text.toLowerCase().includes(query));
  }, [memories, memorySearch]);

  /* =========================================================
     10. PERSISTENT MUSIC ENGINE & LOOP MANAGEMENT
  ========================================================= */

  const currentMusic = musicList[musicIndex] || null;

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setMusicPlaying(false);
    setMusicProgress(0);
  }, []);

  const addMusic = useCallback((selectedMusic) => {
    const list = Array.from(selectedMusic || []).filter((file) =>
      file && (
        (file.type && file.type.startsWith("audio/")) ||
        /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name || "")
      )
    );

    if (!list.length) {
      showToast("Please choose a supported audio file", "error");
      return;
    }

    const newMusic = list.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 10)}`,
      name: file.name,
      file,
      url: URL.createObjectURL(file),
    }));

    const wasEmpty = musicListRef.current.length === 0;
    setMusicList((old) => [...old, ...newMusic]);

    if (wasEmpty) {
      setMusicIndex(0);
      setMusicProgress(0);
    }

    setShowMusic(true);
    showToast(`${newMusic.length} ${newMusic.length === 1 ? "track" : "tracks"} added to Music Library`);
  }, [showToast]);

  const handleMusicSelect = (event) => {
    addMusic(event.target.files);
    event.target.value = "";
  };

  const loadTrack = useCallback(async (index, shouldPlay = false) => {
    const list = musicListRef.current;
    const audio = audioRef.current;

    if (!list.length) {
      showToast("Add local music first", "error");
      return false;
    }
    if (!audio) return false;

    const safeIndex = ((index % list.length) + list.length) % list.length;
    const track = list[safeIndex];
    if (!track) return false;

    setMusicIndex(safeIndex);
    setMusicProgress(0);

    if (audio.src !== track.url) {
      audio.pause();
      audio.src = track.url;
      audio.currentTime = 0;
      audio.load();
    }

    audio.volume = musicVolume;
    audio.muted = musicVolume === 0;

    if (!shouldPlay) {
      setMusicPlaying(false);
      return true;
    }

    try {
      await audio.play();
      setMusicPlaying(true);
      showToast(`Playing: ${track.name}`, "info");
      return true;
    } catch {
      setMusicPlaying(false);
      showToast("Playback was blocked. Tap Play to start music.", "error");
      return false;
    }
  }, [musicVolume, showToast]);

  const playMusic = useCallback(async () => {
    const audio = audioRef.current;
    const list = musicListRef.current;

    if (!list.length) {
      showToast("Add local music first", "error");
      return;
    }
    if (!audio) return;

    const track = list[musicIndexRef.current];
    if (!track) {
      await loadTrack(0, true);
      return;
    }

    if (!audio.src || !audio.src.includes(track.url)) {
      audio.src = track.url;
      audio.load();
    }

    try {
      audio.volume = musicVolume;
      audio.muted = musicVolume === 0;
      await audio.play();
      setMusicPlaying(true);
    } catch {
      setMusicPlaying(false);
      showToast("Playback was blocked. Tap Play to start music.", "error");
    }
  }, [loadTrack, musicVolume, showToast]);

  const pauseMusic = useCallback(() => {
    audioRef.current?.pause();
    setMusicPlaying(false);
  }, []);

  const toggleMusic = useCallback(() => {
    if (musicPlayingRef.current) pauseMusic();
    else playMusic();
  }, [pauseMusic, playMusic]);

  const nextMusic = useCallback(async (autoPlay = true) => {
    const list = musicListRef.current;
    if (!list.length) return;
    const nextIndex = (musicIndexRef.current + 1) % list.length;
    await loadTrack(nextIndex, autoPlay);
  }, [loadTrack]);

  const previousMusic = useCallback(async () => {
    const list = musicListRef.current;
    if (!list.length) return;

    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setMusicProgress(0);
      return;
    }

    const previousIndex = (musicIndexRef.current - 1 + list.length) % list.length;
    await loadTrack(previousIndex, true);
  }, [loadTrack]);

  // Strict Loop ON / OFF Behavior Handler
  const handleMusicEnded = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (musicLoopRef.current) {
      audio.currentTime = 0;
      audio.play().catch(() => setMusicPlaying(false));
    } else {
      audio.pause();
      audio.currentTime = 0;
      setMusicPlaying(false);
      setMusicProgress(0);
    }
  }, []);

  const changeMusicProgress = (event) => {
    const value = Number(event.target.value);
    setMusicProgress(value);

    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (value / 100) * audio.duration;
    }
  };

  const changeVolume = (event) => {
    const value = Number(event.target.value);
    setMusicVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
      audioRef.current.muted = value === 0;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = musicVolume;
    audio.muted = musicVolume === 0;
  }, [musicVolume]);

  /* =========================================================
     11. BACKGROUND MUSIC & MEDIA SESSION
  ========================================================= */

  const updateMediaSession = useCallback((track, playing) => {
    if (!("mediaSession" in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name || "NoteZ Music",
        artist: "NoteZ Workspace",
        album: "Local Music",
      });
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    } catch {}
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers = {
      play: () => playMusic(),
      pause: () => pauseMusic(),
      nexttrack: () => nextMusic(true),
      previoustrack: () => previousMusic(),
    };

    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    });

    return () => {
      Object.keys(handlers).forEach((action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    };
  }, [playMusic, pauseMusic, nextMusic, previousMusic]);

  useEffect(() => {
    updateMediaSession(currentMusic, musicPlaying);
  }, [currentMusic, musicPlaying, updateMediaSession]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && audioRef.current && musicPlayingRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => setMusicPlaying(false));
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    const requestWakeLock = async () => {
      if (!musicPlaying || document.hidden || !("wakeLock" in navigator)) return;
      try {
        if (!musicWakeLockRef.current) {
          musicWakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {}
    };

    const releaseWakeLock = async () => {
      try {
        if (musicWakeLockRef.current) {
          await musicWakeLockRef.current.release();
          musicWakeLockRef.current = null;
        }
      } catch {
        musicWakeLockRef.current = null;
      }
    };

    if (musicPlaying && !document.hidden) requestWakeLock();
    else releaseWakeLock();
  }, [musicPlaying]);

  /* =========================================================
     12. NAVIGATION & ROUTING HELPERS
  ========================================================= */

  const openTool = (tool) => {
    setActiveTool(tool);
    setMobileMenuOpen(false);
    addHistory("Workspace tool opened", tool);
    showToast(`Opened ${tool}`, "info");
  };

  const backToWorkplace = () => {
    setActiveTool("workplace");
    setMobileMenuOpen(false);
  };

  const goToMainWebsite = () => {
    window.location.href = "/";
  };

  const handleCloseIntro = () => {
    setShowWorkspaceIntro(false);
    try {
      localStorage.setItem(INTRO_SHOWN_KEY, "true");
    } catch {}
    showToast("Workspace ready");
  };

  /* =========================================================
     13. RENDER PREVIEW ENGINE
  ========================================================= */

  const renderPreview = () => {
    if (!selectedFile) {
      return (
        <div className="empty-preview">
          <div className="empty-preview-orb">+</div>
          <span className="eyebrow">WORKSPACE PREVIEW</span>
          <h2>Select a file to start working</h2>
          <p>
            Add assignments, PDFs, photos, videos or notes. Your selected file
            opens in this high-performance preview window.
          </p>
          <button
            className="primary-button"
            onClick={() => fileInputRef.current?.click()}
          >
            + Add your first file
          </button>
        </div>
      );
    }

    const url = getObjectUrl(selectedFile);

    if (selectedFile.kind === "image") {
      return (
        <div className="media-preview image-preview">
          <img src={url} alt={selectedFile.name} />
        </div>
      );
    }

    if (selectedFile.kind === "pdf") {
      return (
        <div className="media-preview">
          <iframe title={selectedFile.name} src={url} className="preview-frame" />
        </div>
      );
    }

    if (selectedFile.kind === "video") {
      return (
        <div className="media-preview video-preview">
          <video src={url} controls playsInline />
        </div>
      );
    }

    if (selectedFile.kind === "audio") {
      return (
        <div className="audio-preview">
          <div className="audio-art">♪</div>
          <h2>{selectedFile.name}</h2>
          <p>{formatSize(selectedFile.size)}</p>
          <audio src={url} controls />
        </div>
      );
    }

    if (selectedFile.kind === "text") {
      return (
        <div className="text-preview">
          {textLoading ? (
            <div className="loading-state">Loading document preview…</div>
          ) : (
            <pre>{textPreview || "This file is empty."}</pre>
          )}
        </div>
      );
    }

    return (
      <div className="preview-fallback">
        <div className="fallback-icon">{selectedFile.icon}</div>
        <span className="eyebrow">DOCUMENT PREVIEW</span>
        <h2>{selectedFile.name}</h2>
        <p>
          Office and archive formats can be downloaded or opened directly in your browser.
        </p>
        <div className="fallback-actions">
          <button className="primary-button" onClick={() => downloadFile(selectedFile)}>
            Download
          </button>
          <button className="secondary-button" onClick={() => openFileNewTab(selectedFile)}>
            Open in Browser
          </button>
        </div>
      </div>
    );
  };

  /* =========================================================
     14. MAIN JSX LAYOUT
  ========================================================= */


  return (
    <div className="workspace-page">
      <div className="soft-grid" />
      <div className="green-glow glow-a" />
      <div className="green-glow glow-b" />

      {/* PERMANENTLY MOUNTED GLOBAL AUDIO ELEMENT */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={(e) => {
          const audio = e.currentTarget;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setMusicProgress((audio.currentTime / audio.duration) * 100);
          }
        }}
        onEnded={handleMusicEnded}
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        onError={() => setMusicPlaying(false)}
      />

      {/* WORKSPACE SaaS TOPBAR */}
      <header className="workspace-topbar">
        <div className="topbar-left-group">
          <button 
            className="mobile-menu-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            ☰
          </button>
          <div className="brand-lockup" onClick={backToWorkplace} style={{ cursor: "pointer" }}>
            <div className="brand-mark">N</div>
            <div>
              <strong className="brand-3d">NoteZ Workspace</strong>
              <span>Personal Productivity</span>
            </div>
          </div>
        </div>

        <div className="topbar-center desktop-only">
          <span className="live-dot" />
          NICO AI Active
          <b>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>
        </div>

        <div className="topbar-actions">
          <button className="main-site-button" onClick={goToMainWebsite}>
            Main Website
          </button>
          <button className="main-site-button profile-btn desktop-only" onClick={() => openTool("profile")}>
            Profile
          </button>
        </div>
      </header>

      {/* MOBILE SIDEBAR DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="brand-lockup">
                <div className="brand-mark">N</div>
                <div>
                  <strong>NoteZ</strong>
                  <span>WORKSPACE</span>
                </div>
              </div>
              <button className="icon-button" onClick={() => setMobileMenuOpen(false)}>×</button>
            </div>
            <div className="drawer-nav">
              <button className={`nav-item ${activeTool === "workplace" ? "active" : ""}`} onClick={backToWorkplace}>
                <span>▦</span>
                <div><b>Files & Workspace</b><small>Main library</small></div>
              </button>
              <button className={`nav-item ${activeTool === "calculator" ? "active" : ""}`} onClick={() => openTool("calculator")}>
                <span>＋</span>
                <div><b>Calculator</b><small>Simple & Scientific</small></div>
              </button>
              <button className={`nav-item ${activeTool === "tasks" ? "active" : ""}`} onClick={() => openTool("tasks")}>
                <span>✓</span>
                <div><b>Tasks</b><small>{completedTasks}/{tasks.length} done</small></div>
              </button>
              <button className={`nav-item ${activeTool === "progress" ? "active" : ""}`} onClick={() => openTool("progress")}>
                <span>◔</span>
                <div><b>Progress</b><small>{taskProgress}% completed</small></div>
              </button>
              <button className={`nav-item ai-nav ${activeTool === "ai" ? "active" : ""}`} onClick={() => openTool("ai")}>
                <span>✦</span>
                <div><b>Remember AI</b><small>{memories.length} memories</small></div>
              </button>
              <button className={`nav-item ${activeTool === "profile" ? "active" : ""}`} onClick={() => openTool("profile")}>
                <span>○</span>
                <div><b>Profile</b><small>{user.displayName || "Student"}</small></div>
              </button>
              <button className="nav-item music-nav" onClick={() => { setMobileMenuOpen(false); setShowMusic(true); }}>
                <span>♪</span>
                <div><b>Music Player</b><small>{musicList.length} tracks</small></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <main className="workspace-main">
        {/* DESKTOP SIDEBAR */}
        <aside className="workspace-sidebar desktop-only">
          <div>
            <div className="sidebar-label">WORKSPACE</div>
            <button
              className={`nav-item ${activeTool === "workplace" ? "active" : ""}`}
              onClick={backToWorkplace}
            >
              <span>▦</span>
              <div>
                <b>Files</b>
                <small>Workspace</small>
              </div>
            </button>

            <button
              className={`nav-item ${activeTool === "calculator" ? "active" : ""}`}
              onClick={() => openTool("calculator")}
            >
              <span>＋</span>
              <div>
                <b>Calculator</b>
                <small>Simple & Scientific</small>
              </div>
            </button>

            <button
              className={`nav-item ${activeTool === "tasks" ? "active" : ""}`}
              onClick={() => openTool("tasks")}
            >
              <span>✓</span>
              <div>
                <b>Tasks</b>
                <small>{completedTasks}/{tasks.length} done</small>
              </div>
            </button>

            <button
              className={`nav-item ${activeTool === "progress" ? "active" : ""}`}
              onClick={() => openTool("progress")}
            >
              <span>◔</span>
              <div>
                <b>Progress</b>
                <small>{taskProgress}% completed</small>
              </div>
            </button>

            <button
              className={`nav-item ai-nav ${activeTool === "ai" ? "active" : ""}`}
              onClick={() => openTool("ai")}
            >
              <span>✦</span>
              <div>
                <b>Remember AI</b>
                <small>{memories.length} memories</small>
              </div>
            </button>
          </div>

          <div className="sidebar-bottom">
            <button
              className={`nav-item ${activeTool === "profile" ? "active" : ""}`}
              onClick={() => openTool("profile")}
            >
              <span>○</span>
              <div>
                <b>Profile</b>
                <small>{user.displayName || "Student Account"}</small>
              </div>
            </button>

            <button className="nav-item music-nav" onClick={() => setShowMusic(true)}>
              <span>♪</span>
              <div>
                <b>Music</b>
                <small>{musicList.length} tracks</small>
              </div>
            </button>
          </div>
        </aside>

        {/* WORKSPACE VIEWPORT */}
        <section className="workspace-content">
          {activeTool === "workplace" && (
            <>
              <section className="workspace-heading">
                <div>
                  <span className="eyebrow">STUDENT PRODUCTIVITY OS</span>
                  <h1>
                    Your work.
                    <br />
                    <em>Intelligently organized.</em>
                  </h1>
                  <p>
                    Manage your assignments, files, tasks, and study sessions with lightning-fast performance and NICO AI assistance.
                  </p>
                </div>

                <div className="workspace-stats">
                  <div className="autosave-status-card">
                    <strong>●</strong>
                    <span>AUTO-SAVED</span>
                    <small>{lastActivity ? new Date(lastActivity.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "READY"}</small>
                  </div>
                  <div>
                    <strong>{files.length}</strong>
                    <span>FILES</span>
                  </div>
                  <div>
                    <strong>{formatSize(totalSize)}</strong>
                    <span>STORAGE</span>
                  </div>
                  <div>
                    <strong>{taskProgress}%</strong>
                    <span>PROGRESS</span>
                  </div>
                </div>
              </section>

              {/* DRAG & DROP FILE ZONE */}
              <section
                className={`drop-zone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="drop-icon">↑</div>
                <div>
                  <strong>
                    {isDragging ? "Release to add files" : "Drop files into workspace"}
                  </strong>
                  <p>Support for PDFs, images, documents, code, video, and audio.</p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add Files
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={handleFileSelect}
                />
              </section>

              {/* FILE LIBRARY & LARGE PREVIEW SPLIT */}
              <section className="work-area">
                <div className="file-library">
                  <div className="section-title">
                    <div>
                      <span className="eyebrow">LIBRARY</span>
                      <h2>Files</h2>
                    </div>
                    <span className="file-count">{files.length}</span>
                  </div>

                  {files.length === 0 ? (
                    <div className="library-empty">
                      <span>▧</span>
                      <p>No files yet</p>
                      <small>Add material to begin.</small>
                    </div>
                  ) : (
                    <div className="file-list">
                      {files.map((item) => (
                        <div
                          key={item.id}
                          className={`file-row ${
                            selectedFileId === item.id ? "selected" : ""
                          }`}
                          onClick={() => selectFile(item.id)}
                        >
                          <div className={`file-icon kind-${item.kind}`}>
                            {item.icon}
                          </div>
                          <div className="file-row-info">
                            <strong title={item.name}>{item.name}</strong>
                            <span>{formatSize(item.size)}</span>
                          </div>
                          <button
                            className="file-remove"
                            title="Remove file"
                            aria-label="Remove file"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeFile(item.id);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LARGE PREVIEW PANEL */}
                <div className="preview-workspace">
                  <div className="preview-header">
                    <div className="preview-file-name">
                      <span className="preview-status-dot" />
                      <div>
                        <span>DOCUMENT PREVIEW MODE</span>
                        <strong>{selectedFile?.name || "No file selected"}</strong>
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="preview-actions">
                        <button
                          className="icon-button"
                          onClick={() => downloadFile(selectedFile)}
                          title="Download"
                          aria-label="Download file"
                        >
                          ↓
                        </button>
                        <button
                          className="icon-button"
                          onClick={() => openFileNewTab(selectedFile)}
                          title="Open in new tab"
                          aria-label="Open in new tab"
                        >
                          ↗
                        </button>
                        <button
                          className="icon-button danger"
                          onClick={() => removeFile(selectedFile.id)}
                          title="Remove"
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="preview-body">{renderPreview()}</div>

                  {selectedFile && (
                    <div className="preview-footer">
                      <span>{selectedFile.kind.toUpperCase()}</span>
                      <span>{formatSize(selectedFile.size)}</span>
                      <span>{new Date(selectedFile.addedAt).toLocaleDateString()}</span>

                      <button
                        className="remember-file-button"
                        onClick={rememberSelectedFile}
                      >
                        ✦ Remember with AI
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* QUICK TOOLS SHORTCUTS */}
              <section className="quick-tools">
                <button onClick={() => openTool("calculator")}>
                  <span>＋</span>
                  <div>
                    <b>Calculator</b>
                    <small>Scientific & Simple</small>
                  </div>
                  <i>→</i>
                </button>

                <button onClick={() => openTool("tasks")}>
                  <span>✓</span>
                  <div>
                    <b>Tasks</b>
                    <small>{completedTasks} completed</small>
                  </div>
                  <i>→</i>
                </button>

                <button onClick={() => openTool("ai")} className="ai-card">
                  <span>✦</span>
                  <div>
                    <b>Remember AI</b>
                    <small>{memories.length} saved notes</small>
                  </div>
                  <i>→</i>
                </button>

                <button onClick={() => setShowMusic(true)}>
                  <span>♪</span>
                  <div>
                    <b>Focus Music</b>
                    <small>{musicList.length} tracks</small>
                  </div>
                  <i>→</i>
                </button>
              </section>

              {/* REAL-TIME ACTIVITY HISTORY */}
              <section className="activity-history-card">
                <div className="section-title">
                  <div>
                    <span className="eyebrow">REAL-TIME HISTORY</span>
                    <h2>Recent Activity</h2>
                  </div>
                  <span className="history-live"><i /> LIVE</span>
                </div>
                {history.length === 0 ? (
                  <div className="history-empty">Your workspace activity will appear here automatically.</div>
                ) : (
                  <div className="activity-history-list">
                    {history.slice(0, 12).map((entry) => (
                      <div className="activity-history-row" key={entry.id}>
                        <div className="activity-history-icon">✓</div>
                        <div className="activity-history-main">
                          <strong>{entry.action}</strong>
                          <span>{entry.fileName ? `${entry.fileName} · ` : ""}{entry.details || "Workspace activity"}</span>
                        </div>
                        <time dateTime={new Date(entry.createdAt).toISOString()}>
                          {new Date(entry.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                        </time>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* CALCULATOR TOOL PANEL */}
          {activeTool === "calculator" && (
            <div className="tool-page">
              <button className="tool-back" onClick={backToWorkplace}>← Back to Workspace</button>

              <div className="tool-heading">
                <span className="eyebrow">MATH UTILITY</span>
                <h1>Calculator</h1>
                <p>Switch between simple arithmetic and full scientific calculation modes.</p>
              </div>

              <div className="calc-mode-selector">
                <button
                  className={calcMode === "simple" ? "active" : ""}
                  onClick={() => setCalcMode("simple")}
                >
                  Simple Mode
                </button>
                <button
                  className={calcMode === "scientific" ? "active" : ""}
                  onClick={() => setCalcMode("scientific")}
                >
                  Scientific Mode
                </button>
              </div>

              <div className="calculator-container">
                <div className="calculator-card">
                  <div className="calculator-display">{calculator || "0"}</div>

                  {calcMode === "scientific" && (
                    <div className="calc-sci-grid">
                      <button onClick={() => calculatorPress("sin(")}>sin</button>
                      <button onClick={() => calculatorPress("cos(")}>cos</button>
                      <button onClick={() => calculatorPress("tan(")}>tan</button>
                      <button onClick={() => calculatorPress("log(")}>log</button>
                      <button onClick={() => calculatorPress("ln(")}>ln</button>
                      <button onClick={() => calculatorPress("sqrt(")}>√</button>
                      <button onClick={() => calculatorPress("π")}>π</button>
                      <button onClick={() => calculatorPress("e")}>e</button>
                      <button onClick={() => setCalcAngleMode(m => m === "deg" ? "rad" : "deg")}>
                        {calcAngleMode.toUpperCase()}
                      </button>
                      <button onClick={() => calculatorPress("**2")}>x²</button>
                    </div>
                  )}

                  <div className="calculator-grid">
                    <button className="calc-danger" onClick={calculatorClear}>C</button>
                    <button onClick={calculatorBackspace}>⌫</button>
                    <button onClick={() => calculatorPress("%")}>%</button>
                    <button className="calc-op" onClick={() => calculatorPress("÷")}>÷</button>

                    {["7", "8", "9"].map((n) => (
                      <button key={n} onClick={() => calculatorPress(n)}>{n}</button>
                    ))}
                    <button className="calc-op" onClick={() => calculatorPress("×")}>×</button>

                    {["4", "5", "6"].map((n) => (
                      <button key={n} onClick={() => calculatorPress(n)}>{n}</button>
                    ))}
                    <button className="calc-op" onClick={() => calculatorPress("-")}>−</button>

                    {["1", "2", "3"].map((n) => (
                      <button key={n} onClick={() => calculatorPress(n)}>{n}</button>
                    ))}
                    <button className="calc-op" onClick={() => calculatorPress("+")}>+</button>

                    <button className="zero" onClick={() => calculatorPress("0")}>0</button>
                    <button onClick={() => calculatorPress(".")}>.</button>
                    <button className="calc-equals" onClick={calculatorCalculate}>=</button>
                  </div>
                </div>

                <div className="calc-history-card">
                  <h3>History</h3>
                  {calcHistory.length === 0 ? (
                    <small>No calculations yet</small>
                  ) : (
                    <ul>
                      {calcHistory.map((item, idx) => (
                        <li key={idx} onClick={() => setCalculator(item.split("=")[0].trim())}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TASKS TOOL PANEL */}
          {activeTool === "tasks" && (
            <div className="tool-page">
              <button className="tool-back" onClick={backToWorkplace}>← Back to Workspace</button>

              <div className="tool-heading">
                <span className="eyebrow">PRODUCTIVITY OS</span>
                <h1>Tasks & Assignments</h1>
                <p>Track your studies and automatically calculate daily progress.</p>
              </div>

              <div className="task-layout">
                <div className="task-card">
                  <div className="task-add">
                    <input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTask()}
                      placeholder="Add study task or assignment..."
                    />
                    <button className="primary-button" onClick={addTask}>Add Task</button>
                  </div>

                  <div className="task-list">
                    {tasks.length === 0 ? (
                      <div className="task-empty">
                        <span>✓</span>
                        <b>No tasks yet</b>
                        <p>Create your first task above.</p>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div className={`task-row ${task.completed ? "done" : ""}`} key={task.id}>
                          <button className="task-check" aria-label="Toggle task completion" onClick={() => toggleTask(task.id)}>
                            {task.completed ? "✓" : ""}
                          </button>
                          <div>
                            <strong>{task.text}</strong>
                            <small>{new Date(task.createdAt).toLocaleDateString()}</small>
                          </div>
                          <button className="task-delete" aria-label="Delete task" onClick={() => deleteTask(task.id)}>×</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="progress-mini-card">
                  <span className="eyebrow">TODAY'S PROGRESS</span>
                  <strong>{taskProgress}%</strong>
                  <p>Completed study rate</p>
                  <div className="progress-track">
                    <div style={{ width: `${taskProgress}%` }} />
                  </div>
                  <div className="progress-meta">
                    <span>{completedTasks} completed</span>
                    <span>{Math.max(tasks.length - completedTasks, 0)} remaining</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROGRESS TOOL PANEL */}
          {activeTool === "progress" && (
            <div className="tool-page">
              <button className="tool-back" onClick={backToWorkplace}>← Back to Workspace</button>
              <div className="tool-heading">
                <span className="eyebrow">ANALYTICS</span>
                <h1>Productivity & Progress</h1>
                <p>Real-time metrics derived from your active workspace tasks and files.</p>
              </div>

              <div className="progress-large-card">
                <div className="progress-large-top">
                  <div>
                    <span className="eyebrow">OVERALL METRIC</span>
                    <h2>Workspace Completion</h2>
                  </div>
                  <strong>{taskProgress}%</strong>
                </div>
                <div className="progress-large-track">
                  <div style={{ width: `${taskProgress}%` }} />
                </div>
                <div className="progress-large-stats">
                  <div>
                    <span>COMPLETED TASKS</span>
                    <b>{completedTasks}</b>
                  </div>
                  <div>
                    <span>PENDING TASKS</span>
                    <b>{Math.max(tasks.length - completedTasks, 0)}</b>
                  </div>
                  <div>
                    <span>WORKSPACE FILES</span>
                    <b>{files.length}</b>
                  </div>
                  <div>
                    <span>SAVED MEMORIES</span>
                    <b>{memories.length}</b>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REMEMBER AI TOOL PANEL */}
          {activeTool === "ai" && (
            <div className="tool-page">
              <button className="tool-back" onClick={backToWorkplace}>← Back to Workspace</button>
              <div className="tool-heading ai-heading">
                <span className="eyebrow">NICO AI INTELLIGENCE</span>
                <h1>Remember AI</h1>
                <p>Persistent contextual memory system for your research, preferences, and files.</p>
              </div>

              <div className="remember-layout">
                <div className="remember-compose">
                  <div className="remember-orb">✦</div>
                  <h2>Save Memory</h2>
                  <p>Store facts, goals, or instructions for NICO AI.</p>
                  <textarea
                    value={memoryText}
                    onChange={(e) => setMemoryText(e.target.value)}
                    placeholder="Enter study notes or AI instructions..."
                  />
                  <div className="remember-actions">
                    <button className="primary-button" onClick={() => addMemory()}>✦ Save Memory</button>
                    <button className="secondary-button" onClick={rememberSelectedFile}>Remember Open File</button>
                  </div>
                </div>

                <div className="memory-list-card">
                  <div className="memory-list-header">
                    <div>
                      <span className="eyebrow">STORED CONTEXT</span>
                      <h2>Memories</h2>
                    </div>
                    <span>{memories.length}</span>
                  </div>

                  <input
                    className="memory-search"
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    placeholder="Search memories..."
                  />

                  <div className="memory-list">
                    {filteredMemories.length === 0 ? (
                      <div className="memory-empty">
                        <span>✦</span>
                        <p>No memories found.</p>
                      </div>
                    ) : (
                      filteredMemories.map((m) => (
                        <div className="memory-row" key={m.id}>
                          <div className="memory-symbol">✦</div>
                          <div>
                            <strong>{m.text}</strong>
                            <small>{m.source} · {new Date(m.createdAt).toLocaleString()}</small>
                          </div>
                          <button aria-label="Delete memory" onClick={() => deleteMemory(m.id)}>×</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE TOOL PANEL */}
          {activeTool === "profile" && (
            <div className="tool-page">
              <button className="tool-back" onClick={backToWorkplace}>← Back to Workspace</button>
              <div className="tool-heading">
                <span className="eyebrow">ACCOUNT</span>
                <h1>Student Profile</h1>
                <p>Manage your NoteZ Workspace credentials and settings.</p>
              </div>
              <div className="profile-card">
                <div className="profile-avatar">{(user.displayName || user.email || "N").charAt(0).toUpperCase()}</div>
                <div>
                  <span className="eyebrow">AUTHENTICATED USER</span>
                  <h2>{user.displayName || "Student User"}</h2>
                  <p>{user.email}</p>
                </div>
              </div>
              <div className="profile-info-grid">
                <div>
                  <span>TOTAL FILES</span>
                  <strong>{files.length}</strong>
                </div>
                <div>
                  <span>TASKS CREATED</span>
                  <strong>{tasks.length}</strong>
                </div>
                <div>
                  <span>AI MEMORIES</span>
                  <strong>{memories.length}</strong>
                </div>
                <div>
                  <span>MUSIC TRACKS</span>
                  <strong>{musicList.length}</strong>
                </div>
                <div>
                  <span>ACTIVITY HISTORY</span>
                  <strong>{history.length}</strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* LOCAL MUSIC PLAYER MODAL / PANEL */}
      {showMusic && (
        <div className="music-overlay">
          <div className="music-panel">
            <div className="music-header">
              <div>
                <span className="eyebrow">FOCUS PLAYER</span>
                <h2>Music Library</h2>
              </div>
              <button className="icon-button" onClick={() => setShowMusic(false)} title="Close music player" aria-label="Close music player">×</button>
            </div>

            <div className="music-now">
              <div className={`music-disc ${musicPlaying ? "spinning" : ""}`}>♪</div>
              <strong>{currentMusic?.name || "No track selected"}</strong>
              <span>
                {currentMusic
                  ? `${musicIndex + 1} of ${musicList.length} • ${musicPlaying ? "Playing in background" : "Ready to play"}`
                  : "Add music files"}
              </span>
            </div>

            <input ref={musicInputRef} type="file" accept="audio/*" multiple hidden onChange={handleMusicSelect} />

            <div className="music-progress">
              <span>{formatTime((currentMusic && audioRef.current?.currentTime) || 0)}</span>
              <input type="range" min="0" max="100" step="0.1" value={musicProgress} onChange={changeMusicProgress} aria-label="Music progress" />
              <span>{formatTime(audioRef.current?.duration || 0)}</span>
            </div>

            <div className="music-controls">
              <button onClick={previousMusic} title="Previous track" aria-label="Previous track">↶</button>
              <button className="music-play" onClick={toggleMusic} title={musicPlaying ? "Pause music" : "Play music"} aria-label={musicPlaying ? "Pause music" : "Play music"}>
                {musicPlaying ? "Ⅱ" : "▶"}
              </button>
              <button onClick={() => nextMusic(true)} title="Next track" aria-label="Next track">↷</button>
              <button
                className={`loop-button ${musicLoop ? "active" : ""}`}
                onClick={() => setMusicLoop((old) => !old)}
                title={musicLoop ? "Loop ON" : "Loop OFF"}
                aria-label="Toggle loop"
              >
                🔁 {musicLoop ? "ON" : "OFF"}
              </button>
            </div>

            <div className="volume-row">
              <button
                className="volume-button"
                onClick={() => {
                  if (musicVolume > 0) {
                    setMusicVolume(0);
                    if (audioRef.current) audioRef.current.muted = true;
                  } else {
                    setMusicVolume(0.75);
                    if (audioRef.current) audioRef.current.muted = false;
                  }
                }}
                title={musicVolume === 0 ? "Unmute music" : "Mute music"}
                aria-label="Mute or unmute music"
              >
                {musicVolume === 0 ? "🔇" : "🔊"}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={changeVolume} aria-label="Music volume" />
              <span>{Math.round(musicVolume * 100)}%</span>
            </div>

            <button className="primary-button full-button" onClick={() => musicInputRef.current?.click()}>
              + Add Local Music
            </button>

            <div className="music-list">
              <div className="music-list-title">
                <span>PLAYLIST</span>
                <b>{musicList.length}</b>
              </div>
              {musicList.length === 0 ? (
                <div className="music-empty">Supports MP3, WAV, OGG, M4A tracks.</div>
              ) : (
                musicList.map((track, idx) => (
                  <button
                    key={track.id}
                    className={`music-track ${idx === musicIndex ? "active" : ""}`}
                    onClick={() => {
                      loadTrack(idx, true);
                    }}
                  >
                    <span>{idx === musicIndex && musicPlaying ? "▶" : "♪"}</span>
                    <strong>{track.name}</strong>
                    <small>{idx + 1}</small>
                    <span
                      className="music-track-remove"
                      title="Remove track"
                      aria-label="Remove track"
                      onClick={(event) => {
                        event.stopPropagation();
                        const removed = musicListRef.current[idx];
                        if (removed?.url) URL.revokeObjectURL(removed.url);

                        const remaining = musicListRef.current.filter((_, i) => i !== idx);
                        setMusicList(remaining);

                        if (!remaining.length) {
                          stopMusic();
                          setMusicIndex(0);
                          if (audioRef.current) {
                            audioRef.current.removeAttribute("src");
                            audioRef.current.load();
                          }
                        } else if (idx < musicIndex) {
                          setMusicIndex((old) => old - 1);
                        } else if (idx === musicIndex) {
                          setMusicIndex(Math.min(idx, remaining.length - 1));
                          setMusicProgress(0);
                        }

                        showToast("Track removed");
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMALL PERSISTENT FLOATING MUSIC INDICATOR */}
      {!showMusic && musicPlaying && currentMusic && (
        <div className="floating-music-pill" onClick={() => setShowMusic(true)} title="Open music player">
          <span className="floating-music-note">♪</span>
          <span className="floating-music-name">{currentMusic.name}</span>
          <span className="floating-music-action">▶</span>
        </div>
      )}

      {/* WORKSPACE OPENING INTRO WELCOME MODAL */}
      {showWorkspaceIntro && (
        <div className="workspace-intro-overlay">
          <div className="workspace-intro-modal">
            <div className="intro-badge">NOTEZ WORKSPACE 2.0</div>
            <h2>
              {window.innerWidth <= 768
                ? "NoteZ Workspace on Mobile"
                : "Welcome to NoteZ Workspace"}
            </h2>
            <p>
              {window.innerWidth <= 768
                ? "Your personal productivity space for files, tasks, notes, tools, music and AI-powered organization optimized for mobile."
                : "Your personal productivity space for files, tasks, notes, tools, music and AI-powered organization."}
            </p>
            <button className="primary-button full-button" onClick={handleCloseIntro}>
              OK, Let's Start
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL TOAST NOTIFICATION CONTAINER */}
      {toast && (
        <div className={`workspace-toast ${toast.type}`}>
          <span>{toast.type === "error" ? "!" : "✓"}</span>
          {toast.message}
        </div>
      )}

      {/* PRODUCTION CSS SYSTEM WITH FULL RESPONSIVE FIXES FOR PHONE & PC */}
      <style>{`
        * { box-sizing: border-box; }
        :root {
          --notez-green: #16A34A;
          --notez-green-dark: #15803D;
          --notez-green-light: #DCFCE7;
          --notez-bg: #F7FFF9;
          --notez-white: #FFFFFF;
          --notez-text: #102018;
          --notez-muted: #64746A;
          --line: #dcebe3;
          --danger: #d95757;
          --shadow: 0 20px 60px rgba(24, 71, 52, .08);
        }
        body { margin: 0; background: var(--notez-bg); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
        button, input, textarea { font: inherit; }
        .workspace-page { min-height: 100vh; color: var(--notez-text); background: var(--notez-bg); position: relative; overflow-x: hidden; width: 100%; max-width: 100vw; }
        .soft-grid { position: fixed; inset: 0; pointer-events: none; opacity: .32; background-image: linear-gradient(rgba(22, 163, 74, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 163, 74, .035) 1px, transparent 1px); background-size: 46px 46px; }
        .green-glow { position: fixed; width: 360px; height: 360px; border-radius: 50%; filter: blur(110px); pointer-events: none; opacity: .22; }
        .glow-a { background: #75dba8; left: -240px; top: 20%; }
        .glow-b { background: #93e6bd; right: -240px; bottom: 10%; }
        
        /* 3D WHITE TEXT EFFECT */
        .brand-3d {
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 2px 4px rgba(22,163,74,0.2);
          background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .workspace-topbar { position: sticky; top: 0; z-index: 100; height: 70px; padding: 0 clamp(14px, 3vw, 42px); display: flex; align-items: center; justify-content: space-between; gap: 20px; background: rgba(255, 255, 255, .92); border-bottom: 1px solid rgba(22, 163, 74, .12); backdrop-filter: blur(12px); width: 100%; box-sizing: border-box; }
        .topbar-left-group { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .mobile-menu-toggle { display: none; width: 40px; height: 40px; border: 1px solid var(--line); border-radius: 10px; background: white; color: var(--notez-green); font-size: 18px; font-weight: 900; cursor: pointer; flex-shrink: 0; }
        
        .brand-lockup { display: flex; align-items: center; gap: 10px; min-width: 0; cursor: pointer; }
        .brand-mark { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 12px; background: linear-gradient(145deg, #22c55e, #15803d); color: white; font-weight: 900; box-shadow: 0 4px 12px rgba(22,163,74,0.3); flex-shrink: 0; }
        .large-mark { width: 64px; height: 64px; font-size: 28px; margin: 0 auto 16px; }
        .center-lockup { justify-content: center; margin-bottom: 20px; }
        .brand-lockup strong { display: block; font-size: 15px; color: var(--notez-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .brand-lockup span { display: block; margin-top: 2px; color: var(--notez-muted); font-size: 8px; font-weight: 900; letter-spacing: 1.5px; }
        
        .topbar-center { display: flex; align-items: center; gap: 7px; color: var(--notez-muted); font-size: 10px; font-weight: 700; white-space: nowrap; }
        .topbar-center b { color: var(--notez-text); margin-left: 5px; }
        .topbar-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        
        .main-site-button { min-height: 38px; padding: 0 16px; border: 1px solid var(--notez-green); border-radius: 10px; background: white; color: var(--notez-green); font-size: 9px; font-weight: 900; cursor: pointer; transition: all 200ms ease; white-space: nowrap; }
        .main-site-button:hover { background: var(--notez-green); color: white; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(22,163,74,0.25); }
        .main-site-button:active { transform: translateY(0); }
        .logout-btn { border-color: #fca5a5; color: var(--danger); }
        .logout-btn:hover { background: var(--danger); color: white; box-shadow: 0 4px 12px rgba(217,87,87,0.25); }

        .workspace-main { position: relative; z-index: 2; width: min(1500px, 94%); margin: 18px auto 28px; display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; box-sizing: border-box; }
        .workspace-sidebar { min-height: calc(100vh - 110px); padding: 12px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--line); border-radius: 18px; background: rgba(255, 255, 255, .9); backdrop-filter: blur(12px); }
        
        .sidebar-label, .eyebrow { color: var(--notez-muted); font-size: 7px; font-weight: 950; letter-spacing: 1.7px; text-transform: uppercase; }
        .sidebar-label { padding: 9px 10px; }
        
        .nav-item { width: 100%; min-height: 50px; margin: 4px 0; padding: 8px 10px; display: flex; align-items: center; gap: 10px; text-align: left; border: 1px solid transparent; border-radius: 11px; background: transparent; color: var(--notez-muted); cursor: pointer; transition: all 200ms ease; box-sizing: border-box; }
        .nav-item > span { width: 32px; height: 32px; flex: 0 0 32px; display: grid; place-items: center; border-radius: 9px; background: var(--notez-green-light); color: var(--notez-green-dark); font-size: 12px; font-weight: 900; }
        .nav-item b { font-size: 9px; color: var(--notez-text); display: block; }
        .nav-item small { margin-top: 3px; color: var(--notez-muted); font-size: 7px; display: block; }
        .nav-item:hover { background: var(--notez-green-light); border-color: #bbf7d0; transform: translateY(-1px); }
        .nav-item.active { background: var(--notez-green-light); border-color: #86efac; color: var(--notez-green-dark); box-shadow: inset 3px 0 0 var(--notez-green); }

        .workspace-content { min-width: 0; width: 100%; box-sizing: border-box; padding: clamp(18px, 2.6vw, 34px); border: 1px solid var(--line); border-radius: 20px; background: rgba(255, 255, 255, .92); box-shadow: var(--shadow); backdrop-filter: blur(12px); animation: fadeIn 250ms ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        .workspace-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 25px; margin-bottom: 24px; flex-wrap: wrap; }
        .workspace-heading h1 { margin: 8px 0 0; font-size: clamp(30px, 4vw, 52px); line-height: .95; letter-spacing: -2px; color: var(--notez-text); }
        .workspace-heading h1 em { color: var(--notez-green); font-style: normal; }
        .workspace-heading p { max-width: 620px; margin: 14px 0 0; color: var(--notez-muted); font-size: 11px; line-height: 1.75; }
        
        .workspace-stats { display: grid; grid-template-columns: repeat(3, minmax(70px, 1fr)); gap: 8px; min-width: 255px; width: 100%; max-width: 360px; }
        .workspace-stats > div { padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--notez-bg); box-sizing: border-box; }
        .workspace-stats strong { display: block; color: var(--notez-green); font-size: 16px; font-weight: 950; }
        .workspace-stats span { display: block; margin-top: 4px; color: var(--notez-muted); font-size: 7px; font-weight: 900; }

        .drop-zone { min-height: 125px; padding: 20px; display: flex; align-items: center; gap: 17px; border: 2px dashed #86efac; border-radius: 15px; background: linear-gradient(100deg, var(--notez-bg), #ffffff); transition: all 200ms ease; box-sizing: border-box; flex-wrap: wrap; }
        .drop-zone.dragging { border-color: var(--notez-green); background: var(--notez-green-light); transform: scale(1.01); }
        .drop-icon { width: 48px; height: 48px; flex: 0 0 48px; display: grid; place-items: center; border-radius: 14px; color: var(--notez-green-dark); background: var(--notez-green-light); font-size: 22px; font-weight: 900; }
        .drop-zone > div:nth-child(2) { min-width: 0; flex: 1 1 200px; }
        .drop-zone strong { display: block; font-size: 13px; color: var(--notez-text); }
        .drop-zone p { margin: 5px 0 0; color: var(--notez-muted); font-size: 9px; }
        .drop-zone .primary-button { margin-left: auto; }

        .primary-button, .secondary-button { min-height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-size: 9px; font-weight: 900; transition: all 200ms ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; }
        .primary-button { border: 1px solid var(--notez-green); background: var(--notez-green); color: white; box-shadow: 0 4px 12px rgba(22,163,74,0.2); }
        .primary-button:hover { background: var(--notez-green-dark); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .primary-button:active { transform: translateY(0); }
        
        .secondary-button { border: 1px solid var(--line); background: white; color: var(--notez-muted); }
        .secondary-button:hover { border-color: var(--notez-green); color: var(--notez-green-dark); background: var(--notez-green-light); transform: translateY(-2px); }
        .full-button { width: 100%; box-sizing: border-box; }

        .work-area { margin-top: 16px; display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 600px; overflow: hidden; border: 1px solid var(--line); border-radius: 16px; background: white; width: 100%; box-sizing: border-box; }
        .file-library { padding: 14px; border-right: 1px solid var(--line); background: var(--notez-bg); box-sizing: border-box; min-width: 0; }
        
        .section-title, .preview-header, .memory-list-header, .music-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
        .section-title h2, .memory-list-header h2, .music-header h2 { margin: 5px 0 0; font-size: 14px; color: var(--notez-text); }
        .file-count, .memory-list-header > span { min-width: 27px; height: 27px; display: grid; place-items: center; border-radius: 8px; background: var(--notez-green-light); color: var(--notez-green-dark); font-size: 8px; font-weight: 900; }
        
        .file-list { display: flex; flex-direction: column; gap: 6px; max-height: 505px; overflow: auto; width: 100%; box-sizing: border-box; }
        .file-row { padding: 9px; display: flex; align-items: center; gap: 9px; border: 1px solid transparent; border-radius: 10px; cursor: pointer; transition: all 150ms ease; box-sizing: border-box; width: 100%; }
        .file-row:hover { background: var(--notez-green-light); transform: translateY(-1px); }
        .file-row.selected { background: var(--notez-green-light); border-color: #86efac; }
        
        .file-icon { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 9px; background: white; color: var(--notez-green-dark); font-size: 7px; font-weight: 950; border: 1px solid var(--line); }
        .file-row-info { min-width: 0; flex: 1; }
        .file-row-info strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--notez-text); font-size: 8px; }
        .file-row-info span { display: block; margin-top: 3px; color: var(--notez-muted); font-size: 7px; }
        
        .file-remove, .task-delete, .memory-row button { width: 26px; height: 26px; flex: 0 0 26px; border: 0; border-radius: 7px; background: transparent; color: var(--notez-muted); cursor: pointer; transition: all 150ms ease; }
        .file-remove:hover, .task-delete:hover, .memory-row button:hover { color: white; background: var(--danger); }
        .library-empty { min-height: 240px; display: grid; place-items: center; text-align: center; border: 1px dashed var(--line); border-radius: 12px; padding: 20px; color: var(--notez-muted); box-sizing: border-box; }

        .preview-workspace { display: flex; flex-direction: column; background: #fbfdfc; min-width: 0; width: 100%; box-sizing: border-box; }
        .preview-header { min-height: 62px; padding: 10px 14px; border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, .9); box-sizing: border-box; }
        .preview-file-name { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .preview-file-name span:not(.preview-status-dot) { display: block; color: var(--notez-muted); font-size: 6px; font-weight: 950; letter-spacing: 1.2px; }
        .preview-file-name strong { display: block; max-width: 420px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--notez-text); font-size: 9px; }
        
        .preview-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .icon-button { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 9px; background: white; color: var(--notez-muted); cursor: pointer; transition: all 150ms ease; flex-shrink: 0; }
        .icon-button:hover { color: var(--notez-green); border-color: var(--notez-green); background: var(--notez-green-light); transform: translateY(-1px); }
        .icon-button.danger:hover { color: white; background: var(--danger); border-color: var(--danger); }

        .preview-body { flex: 1; padding: 16px; display: flex; overflow: hidden; min-width: 0; width: 100%; box-sizing: border-box; }
        .empty-preview { width: 100%; min-height: 480px; display: grid; place-items: center; align-content: center; text-align: center; border: 1px dashed var(--line); border-radius: 13px; background: var(--notez-bg); padding: 20px; box-sizing: border-box; }
        .empty-preview-orb { width: 66px; height: 66px; margin-bottom: 15px; display: grid; place-items: center; border: 1px solid #86efac; border-radius: 20px; background: var(--notez-green-light); color: var(--notez-green); font-size: 26px; }
        
        .media-preview { width: 100%; display: flex; align-items: stretch; justify-content: center; border: 1px solid var(--line); border-radius: 11px; overflow: hidden; background: #111; box-sizing: border-box; }
        .image-preview img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 7px; }
        .preview-frame { width: 100%; height: 100%; min-height: 520px; border: 0; background: white; }
        .video-preview video { width: 100%; max-height: 600px; background: black; }
        
        .audio-preview { width: 100%; min-height: 450px; display: grid; place-items: center; align-content: center; text-align: center; border: 1px solid var(--line); border-radius: 11px; background: linear-gradient(145deg, var(--notez-bg), var(--notez-green-light)); padding: 20px; box-sizing: border-box; }
        .audio-art { width: 100px; height: 100px; display: grid; place-items: center; border-radius: 50%; background: var(--notez-green); color: white; font-size: 42px; box-shadow: 0 10px 25px rgba(22,163,74,0.3); }
        
        .text-preview { width: 100%; min-height: 480px; overflow: auto; border: 1px solid var(--line); border-radius: 11px; background: white; box-sizing: border-box; }
        .text-preview pre { margin: 0; padding: 20px; color: var(--notez-text); font: 12px/1.7 monospace; white-space: pre-wrap; }
        
        .preview-footer { min-height: 42px; padding: 8px 14px; display: flex; align-items: center; gap: 10px; border-top: 1px solid var(--line); color: var(--notez-muted); font-size: 7px; font-weight: 900; background: white; width: 100%; box-sizing: border-box; flex-wrap: wrap; }
        .remember-file-button { margin-left: auto; min-height: 28px; padding: 0 12px; border: 1px solid #86efac; border-radius: 8px; background: var(--notez-green-light); color: var(--notez-green-dark); font-size: 7px; font-weight: 900; cursor: pointer; transition: all 150ms ease; }
        .remember-file-button:hover { background: var(--notez-green); color: white; }

        .quick-tools { margin-top: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; box-sizing: border-box; }
        .quick-tools button { min-height: 68px; padding: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 12px; background: white; text-align: left; cursor: pointer; transition: all 200ms ease; width: 100%; box-sizing: border-box; }
        .quick-tools button:hover { border-color: var(--notez-green); transform: translateY(-2px); box-shadow: 0 6px 16px rgba(24,71,52,0.06); background: var(--notez-green-light); }
        .quick-tools button > span { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 9px; background: var(--notez-green-light); color: var(--notez-green-dark); font-weight: 900; }
        .quick-tools b { color: var(--notez-text); font-size: 9px; display: block; }
        .quick-tools small { margin-top: 3px; color: var(--notez-muted); font-size: 7px; display: block; }
        .quick-tools i { margin-left: auto; color: var(--notez-muted); font-size: 11px; font-style: normal; }

        /* WORKSPACE STATUS UI */
        .auth-screen-container { min-height: 100vh; display: grid; place-items: center; background: var(--notez-bg); position: relative; padding: 20px; box-sizing: border-box; width: 100%; }
        .auth-card { width: min(440px, 100%); padding: 36px; border: 1px solid var(--line); border-radius: 24px; background: white; box-shadow: var(--shadow); text-align: center; box-sizing: border-box; }
        .auth-card h1 { margin: 12px 0 8px; font-size: 26px; color: var(--notez-text); letter-spacing: -1px; }
        .auth-card p { margin: 0 0 24px; color: var(--notez-muted); font-size: 11px; line-height: 1.6; }
        .google-auth-btn { margin-bottom: 12px; font-size: 10px; }

        /* TOOL PAGES */
        .tool-page { display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box; }
        .tool-back { align-self: flex-start; border: 0; background: transparent; color: var(--notez-green); font-size: 9px; font-weight: 900; cursor: pointer; padding: 0; }
        .tool-heading h1 { margin: 6px 0 4px; font-size: 26px; color: var(--notez-text); }
        .tool-heading p { margin: 0; color: var(--notez-muted); font-size: 10px; }
        
        .calc-mode-selector { display: flex; gap: 8px; width: 100%; box-sizing: border-box; }
        .calc-mode-selector button { flex: 1; padding: 9px; border: 1px solid var(--line); border-radius: 9px; background: white; color: var(--notez-muted); font-size: 8px; font-weight: 900; cursor: pointer; transition: all 150ms ease; }
        .calc-mode-selector button.active { border-color: var(--notez-green); background: var(--notez-green-light); color: var(--notez-green-dark); }
        
        .calculator-container { display: grid; grid-template-columns: 1fr 280px; gap: 16px; width: 100%; box-sizing: border-box; }
        .calculator-card, .calc-history-card, .task-card, .progress-mini-card, .progress-large-card, .remember-compose, .memory-list-card, .profile-card { border: 1px solid var(--line); border-radius: 16px; background: white; padding: 20px; box-sizing: border-box; width: 100%; }
        .calculator-display { min-height: 56px; padding: 12px; border: 1px solid var(--line); border-radius: 11px; background: var(--notez-bg); font-size: 22px; font-weight: 900; text-align: right; margin-bottom: 12px; overflow-x: auto; color: var(--notez-text); box-sizing: border-box; width: 100%; }
        
        .calculator-grid, .calc-sci-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; width: 100%; box-sizing: border-box; }
        .calc-sci-grid { grid-template-columns: repeat(5, 1fr); margin-bottom: 6px; }
        .calculator-grid button, .calc-sci-grid button { min-height: 44px; border: 1px solid var(--line); border-radius: 9px; background: white; font-weight: 900; cursor: pointer; color: var(--notez-text); transition: all 150ms ease; width: 100%; box-sizing: border-box; }
        .calculator-grid button:hover, .calc-sci-grid button:hover { background: var(--notez-green-light); border-color: #86efac; color: var(--notez-green-dark); }
        .calc-op { background: var(--notez-bg) !important; color: var(--notez-green-dark) !important; }
        .calc-equals { background: var(--notez-green) !important; color: white !important; }
        .calc-danger { color: var(--danger) !important; background: #fff5f5 !important; border-color: #fecaca !important; }
        .calculator-grid .zero { grid-column: span 2; }
        
        .calc-history-card ul { margin: 8px 0 0; padding-left: 16px; max-height: 250px; overflow-y: auto; font-size: 9px; color: var(--notez-muted); }
        .calc-history-card li { margin-bottom: 6px; cursor: pointer; }
        .calc-history-card li:hover { color: var(--notez-green-dark); }
        
        .task-layout, .remember-layout { display: grid; grid-template-columns: 1fr 300px; gap: 16px; width: 100%; box-sizing: border-box; }
        .task-add { display: flex; gap: 8px; margin-bottom: 14px; width: 100%; box-sizing: border-box; }
        .task-add input, .memory-search, .remember-compose textarea { width: 100%; min-height: 40px; padding: 0 14px; border: 1px solid var(--line); border-radius: 10px; outline: none; transition: border-color 150ms ease; box-sizing: border-box; }
        .task-add input:focus, .memory-search:focus, .remember-compose textarea:focus { border-color: var(--notez-green); }
        
        .remember-compose textarea { min-height: 95px; padding: 12px; resize: vertical; margin: 10px 0; }
        .task-list, .memory-list { display: flex; flex-direction: column; gap: 6px; max-height: 400px; overflow-y: auto; width: 100%; box-sizing: border-box; }
        .task-row, .memory-row { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--notez-bg); box-sizing: border-box; width: 100%; }
        .task-row.done { opacity: .6; text-decoration: line-through; }
        
        .task-check { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--notez-green); background: white; color: var(--notez-green); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
        .task-row b, .memory-row b { font-size: 9px; color: var(--notez-text); display: block; }
        .task-row small, .memory-row small { font-size: 7px; color: var(--notez-muted); display: block; margin-top: 2px; }
        
        .progress-track { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; margin: 10px 0; width: 100%; box-sizing: border-box; }
        .progress-track > div, .progress-large-track > div { height: 100%; background: var(--notez-green); transition: width 300ms ease; }
        
        .progress-large-card { display: flex; flex-direction: column; gap: 16px; width: 100%; box-sizing: border-box; }
        .progress-large-top { display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; }
        .progress-large-top strong { font-size: 28px; color: var(--notez-green-dark); }
        .progress-large-track { height: 12px; border-radius: 6px; background: var(--line); overflow: hidden; width: 100%; box-sizing: border-box; }
        .progress-large-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; box-sizing: border-box; }
        .progress-large-stats > div { padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--notez-bg); box-sizing: border-box; width: 100%; }
        .progress-large-stats span { font-size: 7px; font-weight: 900; color: var(--notez-muted); display: block; }
        .progress-large-stats b { font-size: 16px; color: var(--notez-text); display: block; margin-top: 4px; }
        
        .remember-orb { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: var(--notez-green-light); color: var(--notez-green); font-size: 18px; margin-bottom: 10px; }
        .remember-actions { display: flex; gap: 8px; width: 100%; box-sizing: border-box; flex-wrap: wrap; }
        .memory-row { background: white; }
        .memory-symbol { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; background: var(--notez-green-light); color: var(--notez-green); font-size: 11px; flex: 0 0 28px; }
        
        .profile-card { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; width: 100%; box-sizing: border-box; flex-wrap: wrap; }
        .profile-avatar { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 18px; background: var(--notez-green); color: white; font-size: 22px; font-weight: 900; box-shadow: 0 8px 20px rgba(22,163,74,0.25); flex-shrink: 0; }
        .profile-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; box-sizing: border-box; }
        .profile-info-grid > div { padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: white; box-sizing: border-box; width: 100%; }
        .profile-info-grid span { font-size: 7px; font-weight: 900; color: var(--notez-muted); display: block; }
        .profile-info-grid strong { font-size: 18px; color: var(--notez-green-dark); display: block; margin-top: 4px; }

        /* MUSIC MODAL & FLOATING PLAYER */
        .music-overlay, .workspace-intro-overlay, .mobile-drawer-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 30, 24, .45); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 20px; animation: fadeIn 150ms ease; box-sizing: border-box; }
        .music-panel { width: min(440px, 100%); max-height: 90vh; overflow-y: auto; background: white; border: 1px solid var(--line); border-radius: 20px; padding: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; }
        
        .music-now { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--notez-bg); width: 100%; box-sizing: border-box; }
        .music-disc { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 50%; background: var(--notez-green); color: white; font-size: 26px; box-shadow: 0 8px 20px rgba(22,163,74,0.3); }
        .music-disc.spinning { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .music-now strong { font-size: 11px; color: var(--notez-text); max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .music-now span { font-size: 8px; color: var(--notez-muted); }
        
        .music-progress { display: flex; align-items: center; gap: 10px; font-size: 8px; color: var(--notez-muted); width: 100%; box-sizing: border-box; }
        .music-progress input[type="range"], .volume-row input[type="range"] { flex: 1; accent-color: var(--notez-green); cursor: pointer; width: 100%; }
        
        .music-controls { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; box-sizing: border-box; flex-wrap: wrap; }
        .music-controls button { width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 10px; background: white; cursor: pointer; display: grid; place-items: center; font-weight: 900; color: var(--notez-text); transition: all 150ms ease; flex-shrink: 0; }
        .music-controls button:hover { background: var(--notez-green-light); border-color: var(--notez-green); }
        .music-play { width: 48px !important; height: 48px !important; background: var(--notez-green) !important; color: white !important; border-color: var(--notez-green) !important; font-size: 14px; box-shadow: 0 4px 14px rgba(22,163,74,0.3); }
        
        .loop-button { width: auto !important; padding: 0 10px; font-size: 8px; }
        .loop-button.active { background: var(--notez-green-light) !important; border-color: var(--notez-green) !important; color: var(--notez-green-dark) !important; }
        
        .volume-row { display: flex; align-items: center; gap: 10px; font-size: 8px; color: var(--notez-muted); width: 100%; box-sizing: border-box; }
        .volume-button { border: 0; background: transparent; cursor: pointer; font-size: 14px; flex-shrink: 0; }
        
        .music-list { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; width: 100%; box-sizing: border-box; }
        .music-list-title { display: flex; justify-content: space-between; font-size: 7px; font-weight: 900; color: var(--notez-muted); padding: 0 4px; }
        .music-track { width: 100%; min-height: 40px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 9px; background: white; text-align: left; cursor: pointer; transition: all 150ms ease; box-sizing: border-box; }
        .music-track:hover { background: var(--notez-green-light); }
        .music-track.active { background: var(--notez-green-light); border-color: var(--notez-green); }
        .music-track strong { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; color: var(--notez-text); }
        .music-track small { font-size: 7px; color: var(--notez-muted); }
        .music-track-remove { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; color: var(--notez-muted); flex-shrink: 0; }
        .music-track-remove:hover { color: white; background: var(--danger); }
        .music-empty { text-align: center; color: var(--notez-muted); font-size: 8px; padding: 16px; }

        /* FLOATING MUSIC PILL */
        .floating-music-pill { position: fixed; bottom: 20px; right: 20px; z-index: 900; min-height: 44px; padding: 0 14px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--notez-green); border-radius: 22px; background: white; box-shadow: var(--shadow); cursor: pointer; animation: bounceIn 200ms ease; box-sizing: border-box; max-width: calc(100vw - 40px); }
        .floating-music-note { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: var(--notez-green-light); color: var(--notez-green); font-size: 12px; flex-shrink: 0; }
        .floating-music-name { font-size: 8px; font-weight: 900; color: var(--notez-text); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .floating-music-action { font-size: 10px; color: var(--notez-green-dark); flex-shrink: 0; }

        /* INTRO WELCOME MODAL */
        .workspace-intro-modal { width: min(420px, 100%); background: white; border: 1px solid var(--line); border-radius: 24px; padding: 28px; box-shadow: var(--shadow); text-align: center; box-sizing: border-box; }
        .intro-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: var(--notez-green-light); color: var(--notez-green-dark); font-size: 7px; font-weight: 950; letter-spacing: 1.5px; margin-bottom: 12px; }
        .workspace-intro-modal h2 { margin: 0 0 10px; font-size: 18px; color: var(--notez-text); }
        .workspace-intro-modal p { margin: 0 0 20px; color: var(--notez-muted); font-size: 10px; line-height: 1.7; }

        /* MOBILE DRAWER */
        .mobile-drawer-backdrop { justify-content: flex-start; padding: 0; }
        .mobile-drawer { width: 280px; height: 100%; background: white; padding: 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: var(--shadow); animation: slideRight 200ms ease; box-sizing: border-box; overflow-y: auto; }
        @keyframes slideRight { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .drawer-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
        .drawer-nav { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; width: 100%; box-sizing: border-box; }

        /* TOAST NOTIFICATION */
        .workspace-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 2000; min-height: 42px; padding: 0 16px; display: flex; align-items: center; gap: 10px; border-radius: 12px; background: var(--notez-text); color: white; font-size: 9px; font-weight: 900; box-shadow: var(--shadow); animation: fadeIn 150ms ease; box-sizing: border-box; max-width: calc(100vw - 32px); text-align: center; }
        .workspace-toast.error { background: var(--danger); }
        .workspace-toast span { width: 18px; height: 18px; display: grid; place-items: center; border-radius: 50%; background: rgba(255, 255, 255, .2); font-size: 9px; flex-shrink: 0; }

        /* RESPONSIVE DESIGN - MOBILE & TABLET ADAPTATION */
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-menu-toggle { display: grid !important; }
          .workspace-main { grid-template-columns: 1fr !important; width: 96% !important; margin: 10px auto !important; }
          .work-area { grid-template-columns: 1fr !important; min-height: auto !important; }
          .file-library { max-height: none !important; border-right: 0 !important; border-bottom: 1px solid var(--line) !important; }
          .preview-workspace { min-height: 450px !important; }
          .quick-tools { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .calculator-container, .task-layout, .remember-layout, .progress-large-stats, .profile-info-grid { grid-template-columns: 1fr !important; }
          .workspace-heading { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .workspace-stats { width: 100% !important; max-width: 100% !important; }
        }

        /* =========================================================
           NOTEZ PREMIUM UI ENHANCEMENT — CSS ONLY
           Existing React/Firebase logic intentionally unchanged.
        ========================================================= */

        html { scroll-behavior: smooth; }

        body {
          min-width: 320px;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        button,
        .nav-item,
        .file-row,
        .quick-tools button,
        .music-track,
        .floating-music-pill,
        .brand-lockup {
          -webkit-tap-highlight-color: transparent;
        }

        button:focus-visible,
        input:focus-visible,
        textarea:focus-visible,
        .file-row:focus-visible {
          outline: 3px solid rgba(22, 163, 74, .20);
          outline-offset: 2px;
        }

        /* Premium page depth */
        .workspace-page::before,
        .auth-screen-container::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(circle at 15% 15%, rgba(34, 197, 94, .075), transparent 28%),
            radial-gradient(circle at 85% 80%, rgba(74, 222, 128, .06), transparent 30%);
        }

        .workspace-page > *:not(.soft-grid):not(.green-glow),
        .auth-screen-container > *:not(.soft-grid):not(.green-glow) {
          position: relative;
        }

        /* Logo / branding */
        .brand-mark {
          position: relative;
          overflow: hidden;
          transition: transform .28s cubic-bezier(.2,.8,.2,1),
                      box-shadow .28s ease;
        }

        .brand-mark::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: linear-gradient(
            110deg,
            transparent 35%,
            rgba(255,255,255,.45) 48%,
            transparent 61%
          );
          transform: translateX(-80%) rotate(12deg);
          transition: transform .7s ease;
        }

        .brand-lockup:hover .brand-mark::after {
          transform: translateX(80%) rotate(12deg);
        }

        .brand-lockup:hover .brand-mark {
          transform: translateY(-2px) rotate(-1deg) scale(1.025);
          box-shadow: 0 9px 22px rgba(22,163,74,.24);
        }

        .brand-3d {
          letter-spacing: -.02em;
          filter: drop-shadow(0 3px 5px rgba(22,163,74,.16));
        }

        /* Top navigation */
        .workspace-topbar {
          box-shadow: 0 8px 30px rgba(16,32,24,.035);
          transition: box-shadow .25s ease, background .25s ease;
        }

        .workspace-topbar:hover {
          box-shadow: 0 10px 34px rgba(22,163,74,.06);
        }

        .main-site-button {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .main-site-button::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.32) 50%, transparent 75%);
          transform: translateX(-120%);
          transition: transform .55s ease;
          z-index: -1;
        }

        .main-site-button:hover::before {
          transform: translateX(120%);
        }

        .main-site-button:hover {
          transform: translateY(-2px);
        }

        /* Navigation micro-interactions */
        .nav-item {
          position: relative;
          overflow: hidden;
        }

        .nav-item::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 2px;
          height: 2px;
          border-radius: 99px;
          background: var(--notez-green);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .25s ease;
        }

        .nav-item:hover::after,
        .nav-item.active::after {
          transform: scaleX(1);
        }

        .nav-item > span {
          transition: transform .22s ease, box-shadow .22s ease;
        }

        .nav-item:hover > span {
          transform: scale(1.08) rotate(-2deg);
          box-shadow: 0 5px 12px rgba(22,163,74,.12);
        }

        .nav-item.active > span {
          box-shadow: 0 5px 14px rgba(22,163,74,.15);
        }

        /* Hero heading */
        .workspace-heading {
          animation: notezHeroIn .55s cubic-bezier(.2,.8,.2,1) both;
        }

        .workspace-heading h1 {
          text-wrap: balance;
        }

        .workspace-heading h1 em {
          text-shadow: 0 4px 18px rgba(22,163,74,.10);
        }

        @keyframes notezHeroIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Stats */
        .workspace-stats > div {
          transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
        }

        .workspace-stats > div:hover {
          transform: translateY(-3px);
          border-color: #86efac;
          box-shadow: 0 10px 24px rgba(22,163,74,.08);
        }

        /* Drop zone */
        .drop-zone {
          position: relative;
          overflow: hidden;
        }

        .drop-zone::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.6) 50%, transparent 70%);
          transform: translateX(-120%);
          transition: transform .75s ease;
        }

        .drop-zone:hover::after,
        .drop-zone.dragging::after {
          transform: translateX(120%);
        }

        .drop-icon {
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .drop-zone:hover .drop-icon {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 9px 20px rgba(22,163,74,.12);
        }

        /* Primary / secondary buttons */
        .primary-button,
        .secondary-button,
        .tool-back,
        .icon-button {
          will-change: transform;
        }

        .primary-button {
          position: relative;
          overflow: hidden;
          isolation: isolate;
        }

        .primary-button::after {
          content: "";
          position: absolute;
          top: -30%;
          bottom: -30%;
          left: -45%;
          width: 30%;
          transform: skewX(-18deg);
          background: rgba(255,255,255,.24);
          transition: left .55s ease;
          pointer-events: none;
        }

        .primary-button:hover::after {
          left: 125%;
        }

        .secondary-button:hover,
        .tool-back:hover {
          text-decoration: none;
        }

        /* Cards */
        .calculator-card,
        .calc-history-card,
        .task-card,
        .progress-mini-card,
        .progress-large-card,
        .remember-compose,
        .memory-list-card,
        .profile-card,
        .work-area,
        .quick-tools button {
          transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
        }

        .calculator-card:hover,
        .calc-history-card:hover,
        .task-card:hover,
        .progress-mini-card:hover,
        .progress-large-card:hover,
        .remember-compose:hover,
        .memory-list-card:hover,
        .profile-card:hover {
          border-color: rgba(22,163,74,.22);
          box-shadow: 0 16px 38px rgba(16,32,24,.06);
        }

        /* File list */
        .file-row {
          position: relative;
        }

        .file-row::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 0 4px 4px 0;
          background: var(--notez-green);
          transform: scaleY(0);
          transition: transform .2s ease;
        }

        .file-row:hover::before,
        .file-row.selected::before {
          transform: scaleY(1);
        }

        .file-icon {
          transition: transform .22s ease, box-shadow .22s ease;
        }

        .file-row:hover .file-icon {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 6px 14px rgba(22,163,74,.09);
        }

        /* Preview */
        .preview-workspace {
          box-shadow: inset 0 0 0 1px rgba(22,163,74,.025);
        }

        .preview-header {
          position: sticky;
          top: 0;
          z-index: 3;
        }

        .preview-body > * {
          animation: previewIn .3s ease both;
        }

        @keyframes previewIn {
          from { opacity: 0; transform: scale(.992) translateY(5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .media-preview,
        .text-preview,
        .audio-preview,
        .empty-preview {
          box-shadow: 0 8px 24px rgba(16,32,24,.035);
        }

        /* Quick tools */
        .quick-tools button {
          position: relative;
          overflow: hidden;
        }

        .quick-tools button > span {
          transition: transform .22s ease, box-shadow .22s ease;
        }

        .quick-tools button:hover > span {
          transform: scale(1.08) rotate(-4deg);
          box-shadow: 0 6px 14px rgba(22,163,74,.12);
        }

        .quick-tools button i {
          transition: transform .22s ease, color .22s ease;
        }

        .quick-tools button:hover i {
          transform: translateX(4px);
          color: var(--notez-green-dark);
        }

        /* Intro modal */
        .workspace-intro-overlay {
          animation: overlayIn .22s ease both;
        }

        .workspace-intro-modal {
          animation: modalPop .42s cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalPop {
          from { opacity: 0; transform: translateY(14px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .intro-badge {
          box-shadow: 0 5px 16px rgba(22,163,74,.08);
        }

        /* Music */
        .music-panel {
          animation: musicPanelIn .35s cubic-bezier(.2,.8,.2,1) both;
        }

        @keyframes musicPanelIn {
          from { opacity: 0; transform: translateY(14px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .music-controls button {
          transition: transform .2s ease, background .2s ease, border-color .2s ease, box-shadow .2s ease;
        }

        .music-controls button:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 7px 16px rgba(22,163,74,.09);
        }

        .music-play:hover {
          box-shadow: 0 9px 22px rgba(22,163,74,.28);
        }

        .music-track:hover {
          transform: translateX(2px);
          border-color: #bbf7d0;
        }

        .floating-music-pill {
          transition: transform .22s ease, box-shadow .22s ease;
        }

        .floating-music-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(16,32,24,.10);
        }

        /* Progress bars */
        .progress-track > div,
        .progress-large-track > div {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, var(--notez-green-dark), #22c55e, #4ade80);
          box-shadow: 0 0 14px rgba(34,197,94,.18);
        }

        .progress-track > div::after,
        .progress-large-track > div::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.42) 50%, transparent 70%);
          animation: progressShine 2.4s linear infinite;
        }

        @keyframes progressShine {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }

        /* Drawer */
        .mobile-drawer {
          border-right: 1px solid rgba(22,163,74,.12);
        }

        .mobile-menu-toggle {
          transition: transform .2s ease, background .2s ease, border-color .2s ease;
        }

        .mobile-menu-toggle:hover {
          transform: translateY(-1px);
          background: var(--notez-green-light);
          border-color: #86efac;
        }

        /* Tool back */
        .tool-back {
          transition: transform .2s ease, color .2s ease;
        }

        .tool-back:hover {
          transform: translateX(-3px);
          color: var(--notez-green-dark);
        }

        /* Inputs */
        .task-add input,
        .memory-search,
        .remember-compose textarea,
        .calculator-display {
          box-shadow: inset 0 1px 2px rgba(16,32,24,.025);
        }

        .task-add input:focus,
        .memory-search:focus,
        .remember-compose textarea:focus {
          box-shadow: 0 0 0 4px rgba(22,163,74,.08);
        }

        /* Profile */
        .profile-avatar {
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .profile-card:hover .profile-avatar {
          transform: translateY(-3px) rotate(-2deg);
          box-shadow: 0 12px 25px rgba(22,163,74,.22);
        }

        /* Toast */
        .workspace-toast {
          animation:
            toastIn .3s cubic-bezier(.2,.8,.2,1) both,
            toastFloat 3s ease-in-out .3s infinite;
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 10px) scale(.96); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }

        @keyframes toastFloat {
          0%, 100% { margin-bottom: 0; }
          50% { margin-bottom: 2px; }
        }

        /* Tablet */
        @media (max-width: 1100px) {
          .workspace-main {
            width: min(98%, 1500px);
            grid-template-columns: 215px minmax(0, 1fr);
            gap: 14px;
          }

          .workspace-content {
            padding: 22px;
          }

          .work-area {
            grid-template-columns: 225px minmax(0, 1fr);
          }

          .quick-tools {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        /* Mobile */
        @media (max-width: 900px) {
          .workspace-topbar {
            height: 64px;
            padding: 0 12px;
            gap: 8px;
          }

          .workspace-topbar .brand-lockup {
            min-width: 0;
          }

          .workspace-topbar .brand-lockup > div:last-child {
            min-width: 0;
          }

          .workspace-topbar .brand-lockup strong {
            max-width: 155px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .topbar-actions {
            gap: 6px;
          }

          .topbar-actions .main-site-button {
            min-height: 36px;
            padding: 0 10px;
          }

          .workspace-main {
            width: 100%;
            margin: 0;
            padding: 10px;
          }

          .workspace-content {
            padding: 16px;
            border-radius: 16px;
          }

          .workspace-heading h1 {
            font-size: clamp(30px, 9vw, 42px);
            letter-spacing: -1.5px;
          }

          .workspace-heading p {
            font-size: 10px;
          }

          .workspace-stats {
            min-width: 0;
            gap: 6px;
          }

          .workspace-stats > div {
            min-width: 0;
            padding: 10px 8px;
          }

          .workspace-stats strong {
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .drop-zone {
            min-height: 150px;
            padding: 16px;
            flex-wrap: wrap;
          }

          .drop-zone > div:nth-child(2) {
            min-width: 0;
            flex: 1 1 calc(100% - 70px);
          }

          .drop-zone .primary-button {
            width: 100%;
            margin-left: 0;
          }

          .work-area {
            display: flex;
            flex-direction: column;
          }

          .file-library {
            max-height: none;
            padding: 12px;
          }

          .file-list {
            max-height: 190px;
          }

          .preview-workspace {
            min-height: 430px;
          }

          .preview-body {
            padding: 10px;
            min-height: 350px;
          }

          .preview-footer {
            flex-wrap: wrap;
            min-height: auto;
            padding: 10px;
          }

          .remember-file-button {
            width: 100%;
            margin-left: 0;
          }

          .preview-file-name strong {
            max-width: min(58vw, 300px);
          }

          .quick-tools {
            grid-template-columns: 1fr;
          }

          .calculator-container,
          .task-layout,
          .remember-layout,
          .progress-large-stats,
          .profile-info-grid {
            grid-template-columns: 1fr;
          }

          .task-add,
          .remember-actions {
            flex-direction: column;
          }

          .task-add .primary-button,
          .remember-actions .primary-button,
          .remember-actions .secondary-button {
            width: 100%;
          }

          .music-panel {
            width: 100%;
            max-height: calc(100vh - 20px);
            border-radius: 18px;
            padding: 15px;
          }

          .floating-music-pill {
            left: 12px;
            right: 12px;
            bottom: 12px;
            justify-content: center;
          }

          .floating-music-name {
            max-width: 55vw;
          }

          .workspace-toast {
            left: 12px;
            right: 12px;
            width: auto;
            justify-content: center;
            transform: none;
            text-align: center;
          }

          @keyframes toastIn {
            from { opacity: 0; transform: translateY(10px) scale(.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        }

        /* Small phones */
        @media (max-width: 520px) {
          .workspace-topbar {
            padding: 0 9px;
          }

          .workspace-topbar .brand-mark {
            width: 34px;
            height: 34px;
            border-radius: 10px;
          }

          .workspace-topbar .brand-lockup {
            gap: 7px;
          }

          .workspace-topbar .brand-lockup strong {
            font-size: 12px;
            max-width: 112px;
          }

          .workspace-topbar .brand-lockup span {
            font-size: 7px;
          }

          .topbar-actions .profile-btn {
            display: none !important;
          }

          .topbar-actions .main-site-button {
            font-size: 8px;
            padding: 0 8px;
          }

          .workspace-main {
            padding: 7px;
          }

          .workspace-content {
            padding: 12px;
          }

          .workspace-stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .workspace-stats > div {
            border-radius: 10px;
          }

          .workspace-stats span {
            font-size: 6px;
          }

          .workspace-heading {
            margin-bottom: 16px;
          }

          .drop-zone {
            gap: 10px;
          }

          .drop-icon {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
          }

          .drop-zone strong {
            font-size: 11px;
          }

          .drop-zone p {
            font-size: 8px;
          }

          .preview-header {
            min-height: 58px;
            padding: 8px;
          }

          .preview-actions {
            gap: 3px;
          }

          .preview-actions .icon-button {
            width: 31px;
            height: 31px;
          }

          .preview-file-name {
            gap: 7px;
          }

          .preview-file-name strong {
            max-width: 42vw;
          }

          .preview-body {
            min-height: 320px;
          }

          .preview-frame {
            min-height: 360px;
          }

          .empty-preview,
          .text-preview {
            min-height: 320px;
          }

          .calculator-card,
          .calc-history-card,
          .task-card,
          .progress-mini-card,
          .progress-large-card,
          .remember-compose,
          .memory-list-card,
          .profile-card {
            padding: 14px;
            border-radius: 14px;
          }

          .calculator-display {
            font-size: 19px;
          }

          .calculator-grid button,
          .calc-sci-grid button {
            min-height: 42px;
          }

          .calc-sci-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .auth-screen-container {
            padding: 14px;
          }

          .auth-card {
            padding: 24px 18px;
            border-radius: 20px;
          }

          .workspace-intro-overlay {
            padding: 12px;
          }

          .workspace-intro-modal {
            padding: 22px 16px;
            border-radius: 20px;
          }

          .music-controls {
            gap: 7px;
          }

          .music-controls button {
            width: 36px;
            height: 36px;
          }

          .music-play {
            width: 46px !important;
            height: 46px !important;
          }
        }

        /* Very small phones */
        @media (max-width: 360px) {
          .workspace-topbar .brand-lockup strong {
            max-width: 86px;
          }

          .topbar-actions .main-site-button {
            padding: 0 6px;
          }

          .workspace-content {
            padding: 10px;
          }

          .workspace-heading h1 {
            font-size: 28px;
          }

          .workspace-stats strong {
            font-size: 12px;
          }

          .workspace-stats span {
            font-size: 5.5px;
          }

          .drop-zone {
            padding: 12px;
          }

          .music-panel {
            padding: 12px;
          }
        }

        /* Reduced motion / accessibility */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }

      
        /* old CSS */

        /* ================================================================
           PERSISTENT USER STORAGE + REAL-TIME ACTIVITY HISTORY UI
        ================================================================ */
        .activity-history-card {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 12px 35px rgba(24,71,52,.05);
          width: 100%;
          box-sizing: border-box;
        }

        .history-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          border-radius: 999px;
          color: var(--notez-green-dark);
          background: var(--notez-green-light);
          font-size: 7px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .history-live i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--notez-green);
          animation: historyPulse 1.5s infinite;
        }

        @keyframes historyPulse {
          0%,100% {
            opacity: .35;
            transform: scale(.8);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        .activity-history-list {
          display: grid;
          gap: 7px;
          max-height: 420px;
          overflow: auto;
          padding-right: 3px;
          width: 100%;
          box-sizing: border-box;
        }

        .activity-history-row {
          display: grid;
          grid-template-columns: 30px minmax(0,1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid #e7f1eb;
          border-radius: 11px;
          background: #fbfffc;
          transition: .18s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .activity-history-row:hover {
          transform: translateX(2px);
          border-color: #bbf7d0;
          background: #f0fdf4;
        }

        .activity-history-icon {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: var(--notez-green-light);
          color: var(--notez-green-dark);
          font-size: 10px;
          font-weight: 950;
        }

        .activity-history-main {
          min-width: 0;
        }

        .activity-history-main strong {
          display: block;
          color: var(--notez-text);
          font-size: 9px;
        }

        .activity-history-main span {
          display: block;
          margin-top: 3px;
          color: var(--notez-muted);
          font-size: 7px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-history-row time {
          color: var(--notez-muted);
          font-size: 7px;
          white-space: nowrap;
        }

        .history-empty {
          padding: 24px 12px;
          text-align: center;
          color: var(--notez-muted);
          font-size: 9px;
          border: 1px dashed #bbf7d0;
          border-radius: 12px;
          background: #f7fff9;
        }

        @media (max-width: 700px) {
          .activity-history-row {
            grid-template-columns: 28px minmax(0,1fr);
          }

          .activity-history-row time {
            grid-column: 2;
            margin-top: -5px;
          }
        }

        .autosave-status-card {
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
        }

        .autosave-status-card strong {
          font-size: 11px !important;
        }

        .autosave-status-card small {
          display: block;
          margin-top: 3px;
          color: var(--notez-muted);
          font-size: 6px;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .autosave-status-card small {
            display: none;
          }
        }

      

      `}</style>
    </div>
  );
}