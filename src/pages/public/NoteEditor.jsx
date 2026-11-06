import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../hooks/useChat";
import { useNavigate, useParams } from "react-router-dom";
import { createNotification } from "../../firebase/notificationModel";
import { sendMessageInChat, getOrCreateChatId } from "../../firebase/chatModel";
import { searchUsersByTerm } from "../../firebase/userModel";
import { 
  createNote, 
  updateNote, 
  deleteNote, 
  subscribeToNotes,
  getNoteById
} from "../../firebase/noteModel";
import { toast } from "react-toastify";
import { FaShareAlt, FaPaperPlane, FaTrash, FaStar, FaRegStar, FaSearch, FaThumbtack, FaEdit } from "react-icons/fa";

const NoteEditor = ({ note: propNote, onSave, onNavigateToNotes }) => {
  const { noteId } = useParams();

  // --- Safe Loading & Error States for Edit Route ---
  const [loading, setLoading] = useState(Boolean(noteId));
  const [error, setError] = useState(null);
  const [fetchedNote, setFetchedNote] = useState(null);

  // --- Theme Selection State ("", "classic", or "simple-green") ---
  const [theme, setTheme] = useState("");

  // --- Active Note & List Management States ---
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(propNote?.id || noteId || null);

  // --- Form & Editor States ---
  const [title, setTitle] = useState(propNote?.title || "");
  const [content, setContent] = useState(propNote?.content || "");
  const [category, setCategory] = useState(propNote?.category || "General");
  const [tags, setTags] = useState(propNote?.tags || ["Ideas", "Draft"]);
  const [tagInput, setTagInput] = useState("");
  const [shareUser, setShareUser] = useState("");

  // --- Search, Filter, Sort States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // --- UI & Meta States ---
  const [currentDateTime, setCurrentDateTime] = useState({ date: "", time: "" });
  const [isFavorite, setIsFavorite] = useState(propNote?.isFavorite || false);
  const [isPinned, setIsPinned] = useState(propNote?.isPinned || false);
  const [isPrivate, setIsPrivate] = useState(propNote?.isPrivate !== undefined ? propNote?.isPrivate : true);
  const [lastSaved, setLastSaved] = useState("Never");
  const [isPreview, setIsPreview] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Synced");
  const [isSaving, setIsSaving] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Custom Hooks ---
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { selectChat } = useChat();
  const navigate = useNavigate();

  const isInitialMount = useRef(true);

  // --- Real-Time Date & Time Clock ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateTime({
        date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Load Note by noteId if present in URL ---
  useEffect(() => {
    const fetchNoteData = async () => {
      if (!noteId) return;
      if (authLoading) return;

      if (!currentUser || !currentUser.uid) {
        setError("Please log in to view this note.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const noteData = await getNoteById(currentUser.uid, noteId);
        
        if (!noteData) {
          setError("Note not found");
        } else if (noteData.userId && noteData.userId !== currentUser.uid) {
          setError("You do not have permission to view this note.");
        } else {
          setFetchedNote(noteData);
          setActiveNoteId(noteId);
          setTitle(noteData.title || "");
          setContent(noteData.content || "");
          setCategory(noteData.category || "General");
          setTags(noteData.tags || ["Ideas", "Draft"]);
          setIsFavorite(Boolean(noteData.isFavorite));
          setIsPinned(Boolean(noteData.isPinned));
          setIsPrivate(noteData.isPrivate !== undefined ? noteData.isPrivate : true);
        }
      } catch (err) {
        console.error("Failed to load note:", err);
        setError("Failed to load note.");
      } finally {
        setLoading(false);
      }
    };

    fetchNoteData();
  }, [noteId, currentUser?.uid, authLoading]);

  // --- Live Firestore Subscription ---
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeToNotes(currentUser.uid, (fetchedNotes) => {
      setNotes(fetchedNotes);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  // --- Sync props if active note changes from parent ---
  useEffect(() => {
    if (propNote && propNote.id !== activeNoteId) {
      setActiveNoteId(propNote.id);
      setTitle(propNote.title || "");
      setContent(propNote.content || "");
      setCategory(propNote.category || "General");
      setTags(propNote.tags || []);
      setIsFavorite(Boolean(propNote.isFavorite));
      setIsPinned(Boolean(propNote.isPinned));
      setIsPrivate(propNote.isPrivate !== undefined ? propNote.isPrivate : true);
    }
  }, [propNote]);

  const handleSelectNote = (selectedNote) => {
    setActiveNoteId(selectedNote.id);
    setTitle(selectedNote.title || "");
    setContent(selectedNote.content || "");
    setCategory(selectedNote.category || "General");
    setTags(selectedNote.tags || []);
    setIsFavorite(Boolean(selectedNote.isFavorite));
    setIsPinned(Boolean(selectedNote.isPinned));
    setIsPrivate(selectedNote.isPrivate !== undefined ? selectedNote.isPrivate : true);
    setIsPreview(false);
  };

  // --- Auto-Save Effect ---
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!title && !content) return;
    if (authLoading) return;
    if (!currentUser || !currentUser.uid) return;

    setSyncStatus("Syncing...");
    const saveTimer = setTimeout(async () => {
      const notePayload = { title, content, category, tags, isPrivate, isFavorite, isPinned, userId: currentUser.uid };
      try {
        if (activeNoteId) {
          await updateNote(currentUser.uid, activeNoteId, notePayload);
        } else {
          const docRef = await createNote(currentUser.uid, notePayload);
          if (docRef?.id) setActiveNoteId(docRef.id);
        }
      } catch (err) {
        console.error("Auto-save failed:", err);
        setSyncStatus("Offline");
        return;
      }
      if (onSave) onSave(notePayload);
      const now = new Date();
      setLastSaved(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      setSyncStatus("Synced");
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [title, content, category, tags, isFavorite, isPinned, isPrivate, activeNoteId, currentUser?.uid, authLoading, onSave]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleShareNote = async () => {
    if (!shareUser.trim()) return toast.error("Enter a username or email to share");
    try {
      const users = await searchUsersByTerm(shareUser);
      const target = users.find((u) => u.uid !== currentUser?.uid);
      if (!target) return toast.error("User not found");

      await createNotification(
        target.uid,
        currentUser.uid,
        userProfile?.username || "A user",
        "note_share",
        `Shared a note with you: "${title || "Untitled Note"}"`
      );
      toast.success(`Note shared with ${target.username || shareUser}`);
      setShareUser("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to share note");
    }
  };

  const handleSendNoteInChat = async () => {
    if (!shareUser.trim()) return toast.error("Enter a user to send note via chat");
    try {
      const users = await searchUsersByTerm(shareUser);
      const target = users.find((u) => u.uid !== currentUser?.uid);
      if (!target) return toast.error("User not found");

      const chatId = await getOrCreateChatId(currentUser.uid, target.uid);
      await sendMessageInChat(chatId, currentUser.uid, target.uid, {
        text: `📝 Shared Note: "${title}"\n\n${content}`
      });
      selectChat(chatId, target);
      toast.success("Note sent in chat!");
      navigate("/chat");
    } catch (error) {
      console.error(error);
      toast.error("Failed to send in chat");
    }
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // --- Professional Manual Save Without Redirection ---
  const handleManualSave = async () => {
    if (authLoading || isSaving) return;
    
    if (!currentUser || !currentUser.uid) {
      console.error("Cannot save note: user is not authenticated.");
      toast.error("Please log in before saving your note.");
      return;
    }

    setIsSaving(true);
    const notePayload = { title, content, category, tags, isPrivate, isFavorite, isPinned, userId: currentUser.uid };

    try {
      if (activeNoteId) {
        await updateNote(currentUser.uid, activeNoteId, notePayload);
      } else {
        const docRef = await createNote(currentUser.uid, notePayload);
        if (docRef?.id) setActiveNoteId(docRef.id);
      }

      if (onSave) onSave(notePayload);
      const now = new Date();
      setLastSaved(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      setSyncStatus("Synced");
      
      toast.success("Note saved successfully ✓");

    } catch (error) {
      console.error("Firebase save failed:", error);
      if (error?.code === "permission-denied") {
        toast.error("You don't have permission to save this note.");
      } else {
        toast.error("Failed to save note. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewNote = () => {
    setActiveNoteId(null);
    setTitle("");
    setContent("");
    setCategory("General");
    setTags([]);
    setIsFavorite(false);
    setIsPinned(false);
    setIsPrivate(true);
    setIsPreview(false);
    setLastSaved("Never");
    toast.info("✨ New note initialized!");
  };

  // --- Professional Fixed Delete Handler ---
  const handleDeleteNote = async (noteIdToDel, e) => {
    if (e) e.stopPropagation();
    
    if (authLoading) return;

    if (!currentUser?.uid) {
      console.error("Cannot delete note: user is not authenticated.");
      toast.error("Please log in before deleting notes.");
      return;
    }

    const targetNoteId = noteIdToDel || activeNoteId;
    if (!targetNoteId) {
      console.error("Cannot delete note: noteId is missing.");
      toast.error("Cannot delete: Note ID is missing.");
      return;
    }

    if (!window.confirm("Delete this note?")) return;

    setIsDeleting(true);

    try {
      await deleteNote(currentUser.uid, targetNoteId);

      setNotes((prev) => prev.filter((n) => n.id !== targetNoteId));
      if (activeNoteId === targetNoteId) handleNewNote();

      toast.success("Note deleted successfully ✓");

      setTimeout(() => {
        if (onNavigateToNotes) {
          onNavigateToNotes();
        } else {
          navigate("note");
        }
      }, 800);

    } catch (error) {
      console.error("Firebase delete failed:", error);
      if (error?.code === "permission-denied") {
        toast.error("You don't have permission to delete this note.");
      } else {
        toast.error("Failed to delete note. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([`Title: ${title}\nCategory: ${category}\nTags: ${tags.join(", ")}\n\n${content}`], {
      type: "text/plain"
    });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/\s+/g, "_") || "note"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("📥 Note downloaded as text file!");
  };

  const processedNotes = useMemo(() => {
    return notes
      .filter((n) => {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (n.title || "").toLowerCase().includes(query);
        const matchesContent = (n.content || "").toLowerCase().includes(query);
        const matchesCategory = (n.category || "").toLowerCase().includes(query);
        const matchesTags = (n.tags || []).some((t) => t.toLowerCase().includes(query));
        const matchesSearch = matchesTitle || matchesContent || matchesCategory || matchesTags;

        const matchesCatFilter = filterCategory === "All" || n.category === filterCategory;

        let matchesTypeFilter = true;
        if (filterType === "Favorites") matchesTypeFilter = Boolean(n.isFavorite);
        if (filterType === "Pinned") matchesTypeFilter = Boolean(n.isPinned);
        if (filterType === "Private") matchesTypeFilter = Boolean(n.isPrivate);
        if (filterType === "Public") matchesTypeFilter = !n.isPrivate;

        return matchesSearch && matchesCatFilter && matchesTypeFilter;
      })
      .sort((a, b) => {
        if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
          return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
        }
        if (sortBy === "oldest") return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        if (sortBy === "favorite") return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        if (sortBy === "alphabetical") return (a.title || "").localeCompare(b.title || "");
        return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
      });
  }, [notes, searchQuery, filterCategory, filterType, sortBy]);

  // --- SAFE LOADING & ERROR STATES UI BLOCK ---
  if (loading || authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <p>Loading note...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "100vh", fontFamily: "sans-serif", gap: "10px" }}>
        <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>
        <button onClick={() => navigate("/notes")} style={{ padding: "6px 12px", cursor: "pointer" }}>
          Back to Notes
        </button>
      </div>
    );
  }

  // --- RENDER THEME SELECTION SCREEN ---
  if (!theme) {
    return (
      <div className="theme-selector-wrapper">
        <style>{`
          .theme-selector-wrapper {
            background-color: #f0f4f1;
            color: #2c4a3e;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .theme-card {
            background: #ffffff;
            border: 1px solid #d0dfd6;
            box-shadow: 0 10px 25px rgba(46, 90, 70, 0.08);
            border-radius: 12px;
            padding: 40px;
            max-width: 480px;
            width: 100%;
            text-align: center;
          }
          .theme-title {
            font-size: 1.6rem;
            margin-bottom: 10px;
            color: #1b382b;
            font-weight: 700;
          }
          .theme-subtitle {
            font-size: 0.95rem;
            color: #5a7a6b;
            margin-bottom: 30px;
          }
          .theme-options {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }
          .theme-btn {
            background: #eaf3ee;
            color: #224d38;
            border: 1px solid #bce1ce;
            padding: 14px 20px;
            font-family: inherit;
            font-size: 1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            font-weight: 600;
          }
          .theme-btn:hover {
            background: #2d6a4f;
            color: #ffffff;
            border-color: #2d6a4f;
            box-shadow: 0 4px 12px rgba(45, 106, 79, 0.2);
          }
        `}</style>
        <div className="theme-card">
          <h1 className="theme-title">Select Notepad Theme</h1>
          <p className="theme-subtitle">Choose your preferred workspace design to begin.</p>
          <div className="theme-options">
            <button className="theme-btn" onClick={() => setTheme("classic")}>
              Classic Retro Theme
            </button>
            <button className="theme-btn" onClick={() => setTheme("simple-green")}>
              Simple White-Greenish Theme
            </button>
          </div>
        </div>
      </div>
    );
  }

  const themeStyles = theme === "simple-green" ? `
    :root {
      --ne-bg: #f4f7f5;
      --ne-card: #ffffff;
      --ne-border-dark: #cdd9d2;
      --ne-border-light: #ffffff;
      --ne-border-shadow: #b2c5bc;
      --ne-primary: #2d6a4f;
      --ne-text-main: #2b3a32;
      --ne-text-muted: #6b8a7a;
      --ne-font: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
  ` : `
    :root {
      --ne-bg: #c0c0c0;
      --ne-card: #ece9d8;
      --ne-border-dark: #808080;
      --ne-border-light: #ffffff;
      --ne-border-shadow: #404040;
      --ne-primary: #000080;
      --ne-text-main: #000000;
      --ne-text-muted: #666666;
      --ne-font: 'Courier New', Courier, monospace;
    }
  `;

  return (
    <div className="ne-page-wrapper">
      <style>{`
        ${themeStyles}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ne-page-wrapper { background-color: var(--ne-bg); color: var(--ne-text-main); font-family: var(--ne-font); min-height: 100vh; padding: 20px; }
        .ne-container { max-width: 1200px; margin: 0 auto; }
        .ne-classic-window { background: var(--ne-card); border: 2px solid var(--ne-border-dark); box-shadow: 2px 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; padding: 4px; }
        .ne-window-titlebar { background: linear-gradient(90deg, var(--ne-primary), #1084d0); color: #ffffff; padding: 6px 10px; font-weight: bold; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ne-window-body { padding: 8px; }
        .ne-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 12px; background: var(--ne-card); border: 2px groove var(--ne-border-dark); }
        .ne-title { font-size: 1.5rem; font-weight: bold; color: var(--ne-primary); display: flex; align-items: center; gap: 8px; }
        .ne-subtitle { color: var(--ne-text-muted); font-size: 0.85rem; }
        .ne-header-meta { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; }
        .ne-status-badge, .ne-datetime-badge { padding: 2px 6px; background: var(--ne-card); border: 1px inset var(--ne-border-dark); color: var(--ne-text-main); }
        .ne-pulse-dot { display: inline-block; width: 6px; height: 6px; background-color: var(--ne-primary); margin-right: 4px; }
        .ne-btn { font-family: var(--ne-font); background-color: var(--ne-card); border-top: 1px solid var(--ne-border-light); border-left: 1px solid var(--ne-border-light); border-right: 2px solid var(--ne-border-shadow); border-bottom: 2px solid var(--ne-border-shadow); color: var(--ne-text-main); padding: 4px 12px; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .ne-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ne-action-bar, .ne-tools-section { background: var(--ne-card); border: 2px groove var(--ne-border-dark); padding: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .ne-action-group, .ne-tools-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%; }
        .ne-input-share, .ne-search-input, .ne-input-title, .ne-tool-select, .ne-select-category, .ne-input-tag { background: #ffffff; border: 2px inset var(--ne-border-dark); padding: 4px 8px; font-family: var(--ne-font); color: var(--ne-text-main); font-size: 0.9rem; outline: none; }
        .ne-search-box { display: flex; align-items: center; gap: 6px; flex: 1; }
        .ne-search-input { width: 100%; }
        .ne-notes-grid-section { margin-bottom: 20px; }
        .ne-grid-title { font-size: 1rem; font-weight: bold; margin-bottom: 8px; }
        .ne-notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
        .ne-note-card { background: #ffffff; border: 2px outset var(--ne-border-dark); padding: 10px; cursor: pointer; min-height: 100px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
        .ne-note-card.active { background: var(--ne-primary); color: #ffffff; }
        .ne-note-card-title { font-size: 0.95rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ne-note-card-preview { font-size: 0.8rem; color: var(--ne-text-muted); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ne-main-layout { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }
        .ne-editor-container { background: var(--ne-card); border: 2px groove var(--ne-border-dark); padding: 15px; display: flex; flex-direction: column; gap: 12px; }
        .ne-input-title { width: 100%; font-size: 1.2rem; font-weight: bold; }
        .ne-editor-meta-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ne-tags-container { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .ne-tag-chip { background: #ffffff; border: 1px solid var(--ne-border-dark); padding: 2px 6px; font-size: 0.75rem; display: flex; align-items: center; gap: 4px; }
        .ne-tag-remove { cursor: pointer; color: red; font-weight: bold; }
        .ne-input-tag { width: 90px; font-size: 0.75rem; }
        .ne-textarea, .ne-preview-box { width: 100%; min-height: 300px; background: #ffffff; border: 2px inset var(--ne-border-dark); padding: 8px; font-family: var(--ne-font); font-size: 0.95rem; line-height: 1.4; outline: none; }
        .ne-sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .ne-sidebar-card { background: var(--ne-card); border: 2px groove var(--ne-border-dark); padding: 12px; }
        .ne-sidebar-title { font-size: 0.95rem; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid var(--ne-border-dark); padding-bottom: 4px; }
        .ne-stat-row { display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 0; border-bottom: 1px dotted var(--ne-border-dark); }
        .ne-stat-label { color: var(--ne-text-muted); }
        .ne-stat-value { font-weight: bold; }
        .ne-toggle-btn { font-family: var(--ne-font); background: var(--ne-card); border: 1px outset var(--ne-border-dark); padding: 2px 6px; font-size: 0.75rem; cursor: pointer; }
        .ne-toggle-btn.active { background: var(--ne-primary); color: #ffffff; }
      `}</style>

      <div className="ne-container">
        {/* Navigation back to Notes */}
        <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="ne-btn" onClick={() => {
            if (onNavigateToNotes) onNavigateToNotes();
            else navigate("/notes");
          }}>
            📋 Back to Notes List
          </button>
          <button className="ne-btn" onClick={() => setTheme("")}>
            🔄 Switch Theme Mode
          </button>
        </div>

        {/* HEADER */}
        <header className="ne-header">
          <div>
            <h1 className="ne-title">
              <span>📝</span> Note Writer
            </h1>
            <p className="ne-subtitle">
              Create or edit personal secure notes.
            </p>
          </div>
          <div className="ne-header-meta">
            <div className="ne-status-badge">
              <span className="ne-pulse-dot"></span>
              AutoSave: {syncStatus}
            </div>
            <div className="ne-datetime-badge">
              <span>{currentDateTime.date} {currentDateTime.time}</span>
            </div>
          </div>
        </header>

        {/* ACTION BAR */}
        <section className="ne-action-bar">
          <div className="ne-action-group">
            <button className="ne-btn" onClick={handleNewNote} disabled={isSaving || isDeleting}>
              ✨ New
            </button>
            <button className="ne-btn" onClick={handleManualSave} disabled={isSaving || isDeleting}>
              {isSaving ? "Saving..." : "💾 Save"}
            </button>
            {activeNoteId && (
              <button className="ne-btn" onClick={(e) => handleDeleteNote(activeNoteId, e)} disabled={isSaving || isDeleting}>
                <FaTrash /> {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <button className="ne-btn" onClick={() => setIsPreview(!isPreview)}>
              {isPreview ? "✏️ Edit" : "👁️ Preview"}
            </button>
            <button className="ne-btn" onClick={handleDownload}>
              📥 Export
            </button>
          </div>

          <div className="ne-action-group" style={{ justifyContent: "flex-end" }}>
            <input
              type="text"
              className="ne-input-share"
              placeholder="Username/email..."
              value={shareUser}
              onChange={(e) => setShareUser(e.target.value)}
            />
            <button className="ne-btn" onClick={handleShareNote}>
              <FaShareAlt /> Share
            </button>
            <button className="ne-btn" onClick={handleSendNoteInChat}>
              <FaPaperPlane /> Chat
            </button>
          </div>
        </section>

        {/* NOTES GRID SECTION (Displays user's notes for quick selection) */}
        {processedNotes.length > 0 && (
          <section className="ne-notes-grid-section">
            <h2 className="ne-grid-title">Your Notes Quick Select:</h2>
            <div className="ne-notes-grid">
              {processedNotes.map((n) => (
                <div 
                  key={n.id} 
                  className={`ne-note-card ${activeNoteId === n.id ? "active" : ""}`}
                  onClick={() => handleSelectNote(n)}
                >
                  <div>
                    <h3 className="ne-note-card-title">{n.title || "Untitled"}</h3>
                    <p className="ne-note-card-preview">{n.content || "No content..."}</p>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginTop: "4px" }}>
                    <span>{n.category || "General"}</span>
                    <button 
                      className="ne-btn" 
                      style={{ padding: "2px 4px", fontSize: "0.7rem" }}
                      onClick={(e) => handleDeleteNote(n.id, e)}
                      disabled={isDeleting}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MAIN EDITOR LAYOUT */}
        <div className="ne-main-layout">
          <div className="ne-editor-container">
            <input
              type="text"
              className="ne-input-title"
              placeholder="Note Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="ne-editor-meta-row">
              <select 
                className="ne-select-category" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="General">General</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Ideas">Ideas</option>
                <option value="Todo">Todo</option>
              </select>

              <div className="ne-tags-container">
                {tags.map((tag) => (
                  <span key={tag} className="ne-tag-chip">
                    #{tag}
                    <span className="ne-tag-remove" onClick={() => handleRemoveTag(tag)}>×</span>
                  </span>
                ))}
                <input
                  type="text"
                  className="ne-input-tag"
                  placeholder="+ Tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
              </div>

              <button 
                className={`ne-toggle-btn ${isFavorite ? "active" : ""}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                {isFavorite ? <FaStar /> : <FaRegStar />} Favorite
              </button>

              <button 
                className={`ne-toggle-btn ${isPinned ? "active" : ""}`}
                onClick={() => setIsPinned(!isPinned)}
              >
                <FaThumbtack /> Pin
              </button>

              <button 
                className={`ne-toggle-btn ${isPrivate ? "active" : ""}`}
                onClick={() => setIsPrivate(!isPrivate)}
              >
                {isPrivate ? "🔒 Private" : "🌍 Public"}
              </button>
            </div>

            {isPreview ? (
              <div className="ne-preview-box">
                <h3 style={{ marginBottom: "10px", borderBottom: "1px solid #ccc", paddingBottom: "5px" }}>
                  {title || "Untitled Note"}
                </h3>
                <div style={{ whiteSpace: "pre-wrap" }}>{content || "Nothing to preview..."}</div>
              </div>
            ) : (
              <textarea
                className="ne-textarea"
                placeholder="Write your note content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>

          {/* SIDEBAR METRICS */}
          <div className="ne-sidebar">
            <div className="ne-sidebar-card">
              <h3 className="ne-sidebar-title">Document Stats</h3>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Words:</span>
                <span className="ne-stat-value">{wordCount}</span>
              </div>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Characters:</span>
                <span className="ne-stat-value">{charCount}</span>
              </div>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Reading Time:</span>
                <span className="ne-stat-value">~{readingTime} min</span>
              </div>
            </div>

            <div className="ne-sidebar-card">
              <h3 className="ne-sidebar-title">Metadata</h3>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Last Saved:</span>
                <span className="ne-stat-value">{lastSaved}</span>
              </div>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Status:</span>
                <span className="ne-stat-value">{syncStatus}</span>
              </div>
              <div className="ne-stat-row">
                <span className="ne-stat-label">Note ID:</span>
                <span className="ne-stat-value">{activeNoteId ? activeNoteId.slice(0, 8) + "..." : "New Note"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;