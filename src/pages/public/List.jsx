import React, { useCallback, useEffect, useState } from "react";
import { auth, db } from "../../firebase/Firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const STORAGE_KEY = "notez_list_studio_v1";

const themes = [
  { name: "Green", color: "#16a34a", background: "#f0fdf4" },
  { name: "Blue", color: "#2563eb", background: "#eff6ff" },
  { name: "Purple", color: "#9333ea", background: "#faf5ff" },
  { name: "Orange", color: "#ea580c", background: "#fff7ed" },
  { name: "Pink", color: "#db2777", background: "#fdf2f8" },
  { name: "Dark", color: "#334155", background: "#f1f5f9" },
];

const templates = {
  shopping: {
    title: "My Shopping List",
    subtitle: "Things I need to buy",
    items: [
      "Milk",
      "Bread",
      "Eggs",
      "Vegetables",
      "Fruits",
      "Rice",
      "Cooking oil",
    ],
    theme: themes[0],
  },
  office: {
    title: "Office Task List",
    subtitle: "Plan your professional work",
    items: [
      "Check emails",
      "Team meeting",
      "Complete project report",
      "Review pending tasks",
      "Client follow-up",
      "Plan tomorrow's work",
    ],
    theme: themes[1],
  },
  casual: {
    title: "My Personal List",
    subtitle: "My everyday notes",
    items: ["My first task", "My second task", "My third task"],
    theme: themes[2],
  },
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createList(templateName = "casual") {
  const template = templates[templateName] || templates.casual;

  return {
    id: createId(),
    template: templateName,
    title: template.title,
    subtitle: template.subtitle,
    items: template.items.map((text) => ({
      id: createId(),
      text,
      done: false,
    })),
    theme: template.theme.color,
    background: template.theme.background,
    font: "Arial",
    layout: "paper",
    showIcons: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function readLocalLists() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default function List() {
  const [user, setUser] = useState(null);
  const [savedLists, setSavedLists] = useState(readLocalLists);
  const [currentList, setCurrentList] = useState(() => createList("shopping"));

  const [activeTab, setActiveTab] = useState("editor");
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState("Checking connection...");
  const [syncError, setSyncError] = useState("");
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState("");

  const updateLocalBackup = useCallback((lists) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch (error) {
      console.error("Local backup error:", error);
    }
  }, []);

  const notify = (message) => {
    setNotification(message);
    window.setTimeout(() => setNotification(""), 2500);
  };

  // Firebase authentication and real-time cloud synchronization.
  useEffect(() => {
    let unsubscribeLists = null;
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;

      setUser(currentUser);
      setSyncError("");

      if (unsubscribeLists) {
        unsubscribeLists();
        unsubscribeLists = null;
      }

      if (!currentUser) {
        const local = readLocalLists();

        setSavedLists(local);
        setLoading(false);
        setSyncStatus("Local mode — sign in to enable cloud sync.");
        return;
      }

      setLoading(true);
      setSyncStatus("Connecting to NoteZ Cloud...");

      try {
        const listsRef = collection(
          db,
          "users",
          currentUser.uid,
          "lists"
        );

        // Preserve existing local lists by migrating only missing IDs.
        const localLists = readLocalLists();
        const cloudSnapshot = await getDocs(listsRef);

        if (!active) return;

        const cloudIds = new Set(
          cloudSnapshot.docs.map((item) => item.id)
        );

        for (const list of localLists) {
          if (list?.id && !cloudIds.has(String(list.id))) {
            await setDoc(doc(listsRef, String(list.id)), {
              ...list,
              ownerId: currentUser.uid,
              updatedAt: serverTimestamp(),
            });
          }
        }

        if (!active) return;

        unsubscribeLists = onSnapshot(
          listsRef,
          (snapshot) => {
            if (!active) return;

            const cloudLists = snapshot.docs.map((item) => ({
              ...item.data(),
              id: item.id,
            }));

            setSavedLists(cloudLists);
            updateLocalBackup(cloudLists);
            setLoading(false);
            setSyncStatus("Cloud sync is active");
            setSyncError("");
          },
          (error) => {
            console.error("Firestore listener error:", error);
            setSyncError(error.message);
            setSyncStatus("Cloud sync error");
            setLoading(false);
          }
        );
      } catch (error) {
        console.error("Cloud connection error:", error);
        setSyncError(error.message);
        setSyncStatus("Unable to connect to cloud");
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();

      if (unsubscribeLists) {
        unsubscribeLists();
      }
    };
  }, [updateLocalBackup]);

  // Save list locally and to Firestore.
  const saveCurrentList = async () => {
    if (!currentList.title.trim()) {
      notify("Please enter a list title.");
      return;
    }

    const listToSave = {
      ...currentList,
      title: currentList.title.trim(),
      updatedAt: new Date().toISOString(),
    };

    const updatedLists = [
      ...savedLists.filter(
        (list) => String(list.id) !== String(listToSave.id)
      ),
      listToSave,
    ];

    setSavedLists(updatedLists);
    updateLocalBackup(updatedLists);

    if (!auth.currentUser) {
      notify("Saved on this device. Sign in for cloud sync.");
      return;
    }

    setSaving(true);

    try {
      const listRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "lists",
        String(listToSave.id)
      );

      await setDoc(
        listRef,
        {
          ...listToSave,
          ownerId: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSyncStatus("Cloud sync is active");
      notify("Your list is saved to NoteZ Cloud!");
    } catch (error) {
      console.error("Save error:", error);
      setSyncError(error.message);
      notify("Cloud save failed. Your local backup is safe.");
    } finally {
      setSaving(false);
    }
  };

  // Delete a saved list.
  const deleteSavedList = async (listId) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this list?"
    );

    if (!confirmed) return;

    const updatedLists = savedLists.filter(
      (list) => String(list.id) !== String(listId)
    );

    setSavedLists(updatedLists);
    updateLocalBackup(updatedLists);

    if (auth.currentUser) {
      try {
        await deleteDoc(
          doc(
            db,
            "users",
            auth.currentUser.uid,
            "lists",
            String(listId)
          )
        );
      } catch (error) {
        console.error("Delete error:", error);
        notify("Cloud deletion failed: " + error.message);
        return;
      }
    }

    notify("List deleted.");
  };

  // Update list title, subtitle, theme, or other properties.
  const updateList = (field, value) => {
    setCurrentList((previous) => ({
      ...previous,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Add a new checklist item.
  const addItem = () => {
    const text = newItem.trim();

    if (!text) return;

    setCurrentList((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          id: createId(),
          text,
          done: false,
        },
      ],
      updatedAt: new Date().toISOString(),
    }));

    setNewItem("");
  };

  // Edit a checklist item.
  const editItem = (itemId, text) => {
    setCurrentList((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === itemId ? { ...item, text } : item
      ),
    }));
  };

  // Tick or untick an item.
  const toggleItem = (itemId) => {
    setCurrentList((previous) => ({
      ...previous,
      items: previous.items.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done }
          : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  // Remove an item.
  const removeItem = (itemId) => {
    setCurrentList((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.id !== itemId),
    }));
  };

  // Open a saved list in the editor.
  const openSavedList = (list) => {
    setCurrentList({
      ...list,
      items: Array.isArray(list.items) ? list.items : [],
    });

    setActiveTab("editor");
  };

  // Create a fresh list from a template.
  const chooseTemplate = (templateName) => {
    setCurrentList(createList(templateName));
    setActiveTab("editor");
    notify(`${templateName} template opened.`);
  };

  // PNG download.
  const downloadPNG = async () => {
    const element = document.getElementById("notez-list-preview");

    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: currentList.background || "#ffffff",
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `${currentList.title || "NoteZ-List"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      notify("PNG downloaded!");
    } catch (error) {
      console.error("PNG download error:", error);
      notify("Unable to download PNG.");
    }
  };

  // PDF download.
  const downloadPDF = async () => {
    const element = document.getElementById("notez-list-preview");

    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: currentList.background || "#ffffff",
        useCORS: true,
      });

      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 190;
      const pageHeight = 277;
      const imageHeight =
        (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 10;

      pdf.addImage(image, "PNG", 10, position, pageWidth, imageHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + 10;
        pdf.addPage();
        pdf.addImage(image, "PNG", 10, position, pageWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${currentList.title || "NoteZ-List"}.pdf`);
      notify("PDF downloaded!");
    } catch (error) {
      console.error("PDF download error:", error);
      notify("Unable to download PDF.");
    }
  };

  const completedCount = currentList.items.filter(
    (item) => item.done
  ).length;

  const progress =
    currentList.items.length === 0
      ? 0
      : Math.round(
          (completedCount / currentList.items.length) * 100
        );

  const themeColor = currentList.theme || "#16a34a";
  const backgroundColor = currentList.background || "#f0fdf4";

  return (
    <div className="notez-list-app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .notez-list-app {
          min-height: 100vh;
          padding: 28px 18px 60px;
          background: #f8fafc;
          color: #172033;
          font-family: Inter, Arial, sans-serif;
        }

        .nl-container {
          max-width: 1150px;
          margin: auto;
        }

        .nl-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 28px;
        }

        .nl-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nl-logo {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #dcfce7;
          color: #15803d;
          font-size: 25px;
          font-weight: 900;
        }

        .nl-brand h1 {
          margin: 0;
          font-size: 25px;
          letter-spacing: -1px;
        }

        .nl-brand p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .nl-saved-page-btn {
          border: none;
          padding: 11px 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #15803d, #22a35b);
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 5px 15px rgba(21, 128, 61, .18);
          transition: .2s ease;
          white-space: nowrap;
        }

        .nl-saved-page-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(21, 128, 61, .25);
        }

        .nl-sync {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          background: white;
          color: #475569;
          font-size: 12px;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .nl-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: ${user ? "#16a34a" : "#f59e0b"};
          flex-shrink: 0;
        }

        .nl-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
        }

        .nl-tab {
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          padding: 12px 19px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: .2s;
        }

        .nl-tab.active {
          background: #15803d;
          color: white;
          border-color: #15803d;
        }

        .nl-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 22px;
          align-items: start;
        }

        .nl-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 8px 30px rgba(15,23,42,.035);
        }

        .nl-panel h2 {
          font-size: 19px;
          margin: 0 0 7px;
        }

        .nl-muted {
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .nl-label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #475569;
          margin: 17px 0 7px;
        }

        .nl-input, .nl-select {
          width: 100%;
          padding: 12px 13px;
          border: 1px solid #dbe3ec;
          background: #fff;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
          color: #172033;
        }

        .nl-input:focus, .nl-select:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,.1);
        }

        .nl-btn {
          border: none;
          padding: 11px 15px;
          border-radius: 10px;
          font-weight: 750;
          font-size: 13px;
          cursor: pointer;
          transition: .2s;
        }

        .nl-btn:hover {
          transform: translateY(-1px);
          filter: brightness(.97);
        }

        .nl-primary {
          background: #15803d;
          color: white;
        }

        .nl-light {
          background: #f1f5f9;
          color: #334155;
        }

        .nl-danger {
          background: #fee2e2;
          color: #b91c1c;
        }

        .nl-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 18px;
        }

        .nl-theme-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
          margin-top: 10px;
        }

        .nl-theme {
          border: 2px solid transparent;
          border-radius: 10px;
          padding: 10px 5px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
        }

        .nl-theme.selected {
          border-color: #0f172a;
        }

        .nl-preview {
          min-height: 440px;
          padding: 32px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          overflow-wrap: anywhere;
          box-shadow: 0 10px 35px rgba(15,23,42,.06);
        }

        .nl-preview-header {
          border-bottom: 2px solid ${themeColor};
          padding-bottom: 17px;
          margin-bottom: 20px;
        }

        .nl-preview-title {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 28px;
          font-weight: 850;
          color: #172033;
          padding: 0;
        }

        .nl-preview-subtitle {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #64748b;
          margin-top: 9px;
          font-size: 14px;
        }

        .nl-progress {
          height: 7px;
          background: rgba(100,116,139,.18);
          border-radius: 20px;
          overflow: hidden;
          margin: 14px 0 7px;
        }

        .nl-progress-bar {
          height: 100%;
          background: ${themeColor};
          border-radius: 20px;
          transition: width .3s ease;
        }

        .nl-progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748b;
        }

        .nl-items {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .nl-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid rgba(100,116,139,.15);
          border-radius: 11px;
          background: rgba(255,255,255,.65);
          animation: nlEnter .25s ease both;
        }

        @keyframes nlEnter {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nl-check {
          width: 19px;
          height: 19px;
          accent-color: ${themeColor};
          cursor: pointer;
          flex-shrink: 0;
        }

        .nl-item-text {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: #1e293b;
          font-size: 14px;
        }

        .nl-item-text.done {
          text-decoration: line-through;
          color: #94a3b8;
        }

        .nl-remove {
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 17px;
        }

        .nl-add-row {
          display: flex;
          gap: 8px;
          margin-top: 18px;
        }

        .nl-add-row .nl-input {
          flex: 1;
          min-width: 0;
        }

        .nl-template-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 18px;
        }

        .nl-template {
          text-align: left;
          padding: 18px;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          background: white;
          cursor: pointer;
          transition: .2s;
        }

        .nl-template:hover {
          border-color: #16a34a;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(15,23,42,.06);
        }

        .nl-template-icon {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .nl-template strong {
          display: block;
          font-size: 14px;
        }

        .nl-template small {
          display: block;
          color: #64748b;
          margin-top: 6px;
          line-height: 1.5;
        }

        .nl-saved-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .nl-saved-card {
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 17px;
          background: white;
        }

        .nl-saved-card h3 {
          font-size: 16px;
          margin: 0 0 7px;
          overflow-wrap: anywhere;
        }

        .nl-saved-card p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .nl-saved-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .nl-empty {
          text-align: center;
          padding: 55px 15px;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          border-radius: 15px;
          margin-top: 18px;
        }

        .nl-notification {
          position: fixed;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          background: #172033;
          color: white;
          padding: 13px 20px;
          border-radius: 12px;
          z-index: 1000;
          font-size: 13px;
          box-shadow: 0 10px 30px rgba(0,0,0,.2);
          max-width: calc(100% - 30px);
          text-align: center;
        }

        .nl-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
          border-radius: 10px;
          padding: 11px;
          margin-top: 12px;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .nl-footer {
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
          margin-top: 35px;
        }

        @media(max-width: 850px) {
          .nl-main-grid {
            grid-template-columns: 1fr;
          }

          .nl-template-grid {
            grid-template-columns: 1fr;
          }
        }

        @media(max-width: 550px) {
          .notez-list-app {
            padding: 18px 12px 45px;
          }

          .nl-panel {
            padding: 15px;
          }

          .nl-preview {
            padding: 19px;
          }

          .nl-preview-title {
            font-size: 23px;
          }

          .nl-saved-grid {
            grid-template-columns: 1fr;
          }

          .nl-header {
            align-items: flex-start;
          }

          .nl-sync {
            font-size: 11px;
          }
        }
      `}</style>

      <div className="nl-container">
        <header className="nl-header">
          <div className="nl-brand">
            <div className="nl-logo">N</div>
            <div>
              <h1>NoteZ List Studio</h1>
              <p>Create. Organize. Complete.</p>
            </div>
          </div>

          <button
            className="nl-saved-page-btn"
            onClick={() => {
              window.location.href = "/savedlist";
            }}
          >
            ⭐ Saved Lists Page
          </button>

          <div className="nl-sync">
            <span className="nl-dot" />
            <span>{syncStatus}</span>
          </div>
        </header>

        <nav className="nl-tabs">
          <button
            className={`nl-tab ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => setActiveTab("editor")}
          >
            ✏️ List Editor
          </button>

          <button
            className={`nl-tab ${activeTab === "templates" ? "active" : ""}`}
            onClick={() => setActiveTab("templates")}
          >
            📋 Templates
          </button>

          <button
            className={`nl-tab ${activeTab === "saved" ? "active" : ""}`}
            onClick={() => setActiveTab("saved")}
          >
            💾 Saved Lists ({savedLists.length})
          </button>
        </nav>

        {activeTab === "editor" && (
          <div className="nl-main-grid">
            <main className="nl-panel">
              <h2>Design your list</h2>
              <p className="nl-muted">
                Customize your title, items, and appearance.
              </p>

              <label className="nl-label">LIST TITLE</label>
              <input
                className="nl-input"
                value={currentList.title}
                onChange={(event) =>
                  updateList("title", event.target.value)
                }
                placeholder="Enter list title"
              />

              <label className="nl-label">SUBTITLE</label>
              <input
                className="nl-input"
                value={currentList.subtitle}
                onChange={(event) =>
                  updateList("subtitle", event.target.value)
                }
                placeholder="Enter subtitle"
              />

              <label className="nl-label">ADD NEW ITEM</label>
              <div className="nl-add-row">
                <input
                  className="nl-input"
                  value={newItem}
                  onChange={(event) => setNewItem(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addItem();
                  }}
                  placeholder="Write an item..."
                />

                <button className="nl-btn nl-primary" onClick={addItem}>
                  + Add
                </button>
              </div>

              <label className="nl-label">THEME COLOR</label>
              <div className="nl-theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.name}
                    className={`nl-theme ${
                      currentList.theme === theme.color ? "selected" : ""
                    }`}
                    style={{
                      background: theme.background,
                      color: theme.color,
                    }}
                    onClick={() => {
                      updateList("theme", theme.color);
                      updateList("background", theme.background);
                    }}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>

              <label className="nl-label">FONT STYLE</label>
              <select
                className="nl-select"
                value={currentList.font || "Arial"}
                onChange={(event) => updateList("font", event.target.value)}
              >
                <option value="Arial">Modern — Arial</option>
                <option value="Georgia">Classic — Georgia</option>
                <option value="Verdana">Clean — Verdana</option>
                <option value="Trebuchet MS">Soft — Trebuchet</option>
                <option value="Courier New">Typewriter — Courier</option>
              </select>

              <label className="nl-label">BACKGROUND</label>
              <input
                className="nl-input"
                type="color"
                value={backgroundColor}
                onChange={(event) =>
                  updateList("background", event.target.value)
                }
                style={{ height: 45, padding: 4 }}
              />

              <div className="nl-actions">
                <button
                  className="nl-btn nl-primary"
                  onClick={saveCurrentList}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "☁️ Save List"}
                </button>

                <button
                  className="nl-btn nl-light"
                  onClick={downloadPNG}
                >
                  ↓ PNG
                </button>

                <button
                  className="nl-btn nl-light"
                  onClick={downloadPDF}
                >
                  ↓ PDF
                </button>
              </div>

              {!user && (
                <p className="nl-muted" style={{ marginTop: 13 }}>
                  Sign in to NoteZ to sync your lists between devices.
                </p>
              )}

              {syncError && (
                <div className="nl-error">
                  Cloud sync error: {syncError}
                </div>
              )}
            </main>

            <section>
              <div
                id="notez-list-preview"
                className="nl-preview"
                style={{
                  background: backgroundColor,
                  fontFamily: currentList.font || "Arial",
                }}
              >
                <div className="nl-preview-header">
                  <div
                    style={{
                      color: themeColor,
                      fontWeight: 900,
                      fontSize: 11,
                      letterSpacing: 2,
                      marginBottom: 15,
                    }}
                  >
                    NOTEZ • LIST STUDIO
                  </div>

                  <input
                    className="nl-preview-title"
                    value={currentList.title}
                    onChange={(event) =>
                      updateList("title", event.target.value)
                    }
                    aria-label="List title"
                  />

                  <input
                    className="nl-preview-subtitle"
                    value={currentList.subtitle}
                    onChange={(event) =>
                      updateList("subtitle", event.target.value)
                    }
                    aria-label="List subtitle"
                  />
                </div>

                <div className="nl-progress-label">
                  <span>YOUR PROGRESS</span>
                  <strong>{progress}%</strong>
                </div>

                <div className="nl-progress">
                  <div
                    className="nl-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="nl-progress-label">
                  <span>
                    {completedCount} of {currentList.items.length} completed
                  </span>
                  <span>{currentList.items.length} items</span>
                </div>

                <div className="nl-items">
                  {currentList.items.map((item) => (
                    <div className="nl-item" key={item.id}>
                      <input
                        className="nl-check"
                        type="checkbox"
                        checked={Boolean(item.done)}
                        onChange={() => toggleItem(item.id)}
                      />

                      <input
                        className={`nl-item-text ${
                          item.done ? "done" : ""
                        }`}
                        value={item.text}
                        onChange={(event) =>
                          editItem(item.id, event.target.value)
                        }
                        aria-label="Edit list item"
                      />

                      <button
                        className="nl-remove"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {currentList.items.length === 0 && (
                    <p className="nl-muted">
                      Your list is empty. Add your first item!
                    </p>
                  )}
                </div>

                <div
                  style={{
                    borderTop: "1px solid rgba(100,116,139,.2)",
                    marginTop: 28,
                    paddingTop: 14,
                    color: "#94a3b8",
                    fontSize: 10,
                    textAlign: "center",
                    letterSpacing: 1,
                  }}
                >
                  MADE WITH NOTEZ
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "templates" && (
          <section className="nl-panel">
            <h2>Choose your template</h2>
            <p className="nl-muted">
              Start with a ready-made list. You can edit everything.
            </p>

            <div className="nl-template-grid">
              <button
                className="nl-template"
                onClick={() => chooseTemplate("shopping")}
              >
                <div className="nl-template-icon">🛒</div>
                <strong>Shopping List</strong>
                <small>
                  Organize groceries, household items, and shopping tasks.
                </small>
              </button>

              <button
                className="nl-template"
                onClick={() => chooseTemplate("office")}
              >
                <div className="nl-template-icon">💼</div>
                <strong>Office List</strong>
                <small>
                  Manage professional tasks, meetings, and daily work.
                </small>
              </button>

              <button
                className="nl-template"
                onClick={() => chooseTemplate("casual")}
              >
                <div className="nl-template-icon">📝</div>
                <strong>Casual List</strong>
                <small>
                  A simple paper-style list for everyday personal use.
                </small>
              </button>
            </div>

            <div className="nl-actions">
              <button
                className="nl-btn nl-primary"
                onClick={() => {
                  setCurrentList(createList("casual"));
                  setActiveTab("editor");
                }}
              >
                + Create Blank List
              </button>
            </div>
          </section>
        )}

        {activeTab === "saved" && (
          <section className="nl-panel">
            <h2>Your Saved Lists</h2>
            <p className="nl-muted">
              Your lists are stored locally and synced to your account when
              you are signed in.
            </p>

            {loading && (
              <p className="nl-muted">Loading your saved lists...</p>
            )}

            {!loading && savedLists.length === 0 && (
              <div className="nl-empty">
                <div style={{ fontSize: 35 }}>📂</div>
                <h3>No saved lists yet</h3>
                <p>Create a list and press Save List to see it here.</p>
                <button
                  className="nl-btn nl-primary"
                  onClick={() => setActiveTab("templates")}
                >
                  Explore Templates
                </button>
              </div>
            )}

            <div className="nl-saved-grid">
              {savedLists.map((list) => {
                const total = list.items?.length || 0;
                const completed =
                  list.items?.filter((item) => item.done).length || 0;

                return (
                  <article className="nl-saved-card" key={list.id}>
                    <div
                      style={{
                        height: 5,
                        background: list.theme || "#16a34a",
                        borderRadius: 10,
                        marginBottom: 14,
                      }}
                    />

                    <h3>{list.title || "Untitled List"}</h3>

                    <p>{list.subtitle || "No description"}</p>

                    <p style={{ marginTop: 10 }}>
                      {completed}/{total} tasks completed
                    </p>

                    <div className="nl-saved-actions">
                      <button
                        className="nl-btn nl-primary"
                        onClick={() => openSavedList(list)}
                      >
                        Open & Edit
                      </button>

                      <button
                        className="nl-btn nl-danger"
                        onClick={() => deleteSavedList(list.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <footer className="nl-footer">
          NoteZ List Studio · Organize your day, your way.
        </footer>
      </div>

      {notification && (
        <div className="nl-notification">{notification}</div>
      )}
    </div>
  );
}