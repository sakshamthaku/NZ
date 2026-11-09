
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/Firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Saved() {
  const [user, setUser] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

  useEffect(() => {
    let unsubscribeLists = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setSelectedList(null);

      if (unsubscribeLists) {
        unsubscribeLists();
        unsubscribeLists = null;
      }

      if (!currentUser) {
        setLists([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const listsRef = collection(
        db,
        "users",
        currentUser.uid,
        "lists"
      );

      unsubscribeLists = onSnapshot(
        listsRef,
        (snapshot) => {
          const cloudLists = snapshot.docs.map((item) => ({
            ...item.data(),
            id: item.id,
            items: Array.isArray(item.data().items)
              ? item.data().items
              : [],
          }));

          setLists(cloudLists);
          setLoading(false);

          // Keep the currently opened list updated from cloud changes.
          setSelectedList((previous) => {
            if (!previous) return null;
            return cloudLists.find(
              (list) => list.id === previous.id
            ) || null;
          });
        },
        (err) => {
          console.error("Saved lists error:", err);
          setError(err.message || "Could not load saved lists.");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLists) unsubscribeLists();
    };
  }, []);

  const showMessage = (message) => {
    setNotification(message);
    window.setTimeout(() => setNotification(""), 2500);
  };

  const getProgress = (list) => {
    const items = list.items || [];
    if (items.length === 0) return 0;

    const completed = items.filter((item) => item.done).length;
    return Math.round((completed / items.length) * 100);
  };

  const getCompleted = (list) =>
    (list.items || []).filter((item) => item.done).length;

  const totalLists = lists.length;

  const finishedLists = lists.filter(
    (list) =>
      list.items.length > 0 &&
      list.items.every((item) => item.done)
  ).length;

  const inProgressLists = lists.filter(
    (list) =>
      list.items.some((item) => item.done) &&
      !list.items.every((item) => item.done)
  ).length;

  const notStartedLists = lists.filter(
    (list) => !list.items.some((item) => item.done)
  ).length;

  const totalTasks = lists.reduce(
    (sum, list) => sum + list.items.length,
    0
  );

  const completedTasks = lists.reduce(
    (sum, list) => sum + getCompleted(list),
    0
  );

  const favoriteLists = lists.filter(
    (list) => list.favorite === true
  );

  const overallProgress =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  // Update favorite status in Firestore.
  const toggleFavorite = async (list) => {
    try {
      const nextFavorite = !list.favorite;

      await setDoc(
        doc(db, "users", user.uid, "lists", list.id),
        {
          favorite: nextFavorite,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      showMessage(
        nextFavorite
          ? "Added to your favorites ⭐"
          : "Removed from favorites"
      );
    } catch (err) {
      console.error(err);
      showMessage("Could not update favorite.");
    }
  };

  // Update checklist completion in Firestore.
  const toggleTask = async (list, itemId) => {
    try {
      const updatedItems = list.items.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done }
          : item
      );

      await setDoc(
        doc(db, "users", user.uid, "lists", list.id),
        {
          items: updatedItems,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      showMessage("Could not update task.");
    }
  };

  // Delete a list permanently.
  const deleteList = async (list) => {
    const confirmed = window.confirm(
      `Permanently delete "${list.title || "Untitled List"}"?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "lists", list.id)
      );

      if (selectedList?.id === list.id) {
        setSelectedList(null);
      }

      showMessage("List deleted successfully.");
    } catch (err) {
      console.error(err);
      showMessage("Could not delete this list.");
    }
  };

  const openList = (list) => {
    setSelectedList(list);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeList = () => setSelectedList(null);

  const dateLabel = (value) => {
    if (!value) return "Saved list";

    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) return "Saved list";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="saved-loading">
        <div className="saved-spinner" />
        <h3>Loading your NoteZ dashboard...</h3>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="saved-login">
        <div className="saved-login-icon">☁</div>
        <h1>Your Saved Lists</h1>
        <p>
          Sign in to your NoteZ account to access your saved lists
          and cloud dashboard.
        </p>
        <a href="/NZ/" className="saved-login-btn">
          Go to NoteZ
        </a>
      </div>
    );
  }

  return (
    <div className="saved-app">
      <style>{`
        .saved-app, .saved-app * {
          box-sizing: border-box;
        }

        .saved-app {
          min-height: 100vh;
          padding: 30px 20px 65px;
          background: #f5f9f6;
          color: #183528;
          font-family: Inter, Arial, sans-serif;
        }

        .saved-container {
          max-width: 1200px;
          margin: auto;
        }

        .saved-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 28px;
        }

        .saved-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .saved-logo {
          width: 49px;
          height: 49px;
          border-radius: 15px;
          background: #15803d;
          color: white;
          display: grid;
          place-items: center;
          font-size: 24px;
          font-weight: 900;
        }

        .saved-brand h1 {
          margin: 0;
          font-size: 23px;
          letter-spacing: -1px;
        }

        .saved-brand p {
          color: #789082;
          font-size: 12px;
          margin: 4px 0 0;
        }

        .saved-account {
          display: flex;
          align-items: center;
          gap: 9px;
          background: white;
          padding: 10px 14px;
          border: 1px solid #e0ebe3;
          border-radius: 30px;
          font-size: 12px;
          color: #557061;
          max-width: 100%;
          overflow-wrap: anywhere;
        }

        .saved-online-dot {
          width: 9px;
          height: 9px;
          background: #16a34a;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .saved-welcome {
          padding: 30px;
          border-radius: 23px;
          color: white;
          background: linear-gradient(120deg, #14532d, #15803d 65%, #22a35b);
          position: relative;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .saved-welcome:after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 50%;
          right: -50px;
          top: -100px;
          box-shadow: 0 0 0 30px rgba(255,255,255,.035),
                      0 0 0 60px rgba(255,255,255,.025);
        }

        .saved-welcome h2 {
          font-size: 27px;
          margin: 0 0 9px;
          position: relative;
          z-index: 1;
        }

        .saved-welcome p {
          margin: 0;
          color: #d5f5df;
          font-size: 13px;
          position: relative;
          z-index: 1;
        }

        .saved-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 24px;
        }

        .saved-stat {
          padding: 20px;
          background: white;
          border: 1px solid #e2ece5;
          border-radius: 17px;
          box-shadow: 0 5px 20px rgba(21,83,45,.035);
        }

        .saved-stat-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 18px;
          background: #e9f7ed;
          margin-bottom: 14px;
        }

        .saved-stat strong {
          display: block;
          font-size: 27px;
          letter-spacing: -1px;
        }

        .saved-stat span {
          color: #7b9083;
          font-size: 12px;
          display: block;
          margin-top: 5px;
        }

        .saved-panel {
          background: white;
          border: 1px solid #e2ece5;
          border-radius: 19px;
          padding: 23px;
          margin-bottom: 22px;
        }

        .saved-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 18px;
        }

        .saved-section-heading h2 {
          margin: 0;
          font-size: 18px;
        }

        .saved-section-heading p {
          color: #819488;
          margin: 5px 0 0;
          font-size: 12px;
        }

        .saved-progress-track {
          height: 9px;
          border-radius: 20px;
          background: #e8f1ea;
          overflow: hidden;
          margin: 15px 0 9px;
        }

        .saved-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #15803d, #4ade80);
          border-radius: 20px;
          transition: width .3s ease;
        }

        .saved-progress-info {
          display: flex;
          justify-content: space-between;
          color: #809487;
          font-size: 11px;
        }

        .saved-list-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .saved-card {
          padding: 18px;
          border: 1px solid #e4ede6;
          border-radius: 16px;
          background: #fff;
          transition: .2s;
          min-width: 0;
        }

        .saved-card:hover {
          border-color: #9bd5aa;
          transform: translateY(-2px);
          box-shadow: 0 9px 22px rgba(21,83,45,.06);
        }

        .saved-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .saved-card h3 {
          font-size: 15px;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .saved-card-subtitle {
          color: #87988d;
          font-size: 11px;
          margin: 6px 0 0;
        }

        .saved-star {
          border: none;
          background: #f0f7f1;
          color: #9aab9e;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          cursor: pointer;
          font-size: 19px;
          flex-shrink: 0;
        }

        .saved-star.active {
          background: #fff6d8;
          color: #e5a400;
        }

        .saved-card-meta {
          display: flex;
          justify-content: space-between;
          color: #819488;
          font-size: 11px;
          margin-top: 13px;
        }

        .saved-card-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .saved-btn {
          border: none;
          padding: 10px 13px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s;
        }

        .saved-btn:hover {
          filter: brightness(.96);
        }

        .saved-open-btn {
          background: #15803d;
          color: white;
        }

        .saved-delete-btn {
          background: #fff0f0;
          color: #c24141;
        }

        .saved-badge {
          padding: 5px 8px;
          border-radius: 20px;
          background: #eaf7ed;
          color: #16803d;
          font-size: 10px;
          font-weight: 800;
        }

        .saved-empty {
          padding: 40px 15px;
          text-align: center;
          color: #819488;
          border: 1px dashed #cbdccf;
          border-radius: 14px;
          font-size: 13px;
        }

        .saved-empty-icon {
          font-size: 35px;
          margin-bottom: 10px;
        }

        .saved-detail {
          background: white;
          border: 1px solid #e2ece5;
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 22px;
        }

        .saved-back {
          border: none;
          background: #eaf7ed;
          color: #15803d;
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          margin-bottom: 20px;
        }

        .saved-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .saved-detail-head h2 {
          font-size: 24px;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .saved-detail-head p {
          font-size: 12px;
          color: #849589;
          margin: 7px 0;
        }

        .saved-detail-items {
          display: grid;
          gap: 10px;
          margin-top: 23px;
        }

        .saved-task {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid #e6eee8;
          background: #fbfdfb;
          border-radius: 12px;
          animation: savedTaskIn .2s ease;
        }

        @keyframes savedTaskIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .saved-task input {
          width: 19px;
          height: 19px;
          accent-color: #15803d;
          cursor: pointer;
          flex-shrink: 0;
        }

        .saved-task-text {
          flex: 1;
          font-size: 13px;
          color: #294536;
          overflow-wrap: anywhere;
        }

        .saved-task-text.done {
          text-decoration: line-through;
          color: #9baa9f;
        }

        .saved-error {
          padding: 12px;
          background: #fff0f0;
          border-radius: 10px;
          color: #b42318;
          font-size: 12px;
          margin-bottom: 18px;
          overflow-wrap: anywhere;
        }

        .saved-loading, .saved-login {
          min-height: 75vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 25px;
          text-align: center;
          font-family: Arial, sans-serif;
          background: #f5f9f6;
          color: #183528;
        }

        .saved-spinner {
          width: 37px;
          height: 37px;
          border: 4px solid #dceee0;
          border-top-color: #15803d;
          border-radius: 50%;
          animation: savedSpin .8s linear infinite;
        }

        @keyframes savedSpin {
          to { transform: rotate(360deg); }
        }

        .saved-login-icon {
          font-size: 55px;
          color: #15803d;
        }

        .saved-login p {
          color: #718477;
          max-width: 390px;
          font-size: 14px;
          line-height: 1.6;
        }

        .saved-login-btn {
          display: inline-block;
          margin-top: 12px;
          padding: 12px 22px;
          border-radius: 10px;
          color: white;
          background: #15803d;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
        }

        .saved-toast {
          position: fixed;
          bottom: 22px;
          left: 50%;
          transform: translateX(-50%);
          padding: 13px 20px;
          border-radius: 11px;
          background: #183528;
          color: white;
          font-size: 12px;
          z-index: 1000;
          max-width: calc(100% - 25px);
          text-align: center;
        }

        .saved-footer {
          text-align: center;
          color: #99a99e;
          font-size: 11px;
          margin-top: 30px;
        }

        @media(max-width: 850px) {
          .saved-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media(max-width: 600px) {
          .saved-app {
            padding: 18px 12px 45px;
          }

          .saved-welcome {
            padding: 23px 18px;
          }

          .saved-welcome h2 {
            font-size: 22px;
          }

          .saved-stats {
            gap: 10px;
          }

          .saved-stat {
            padding: 15px;
          }

          .saved-stat strong {
            font-size: 23px;
          }

          .saved-panel, .saved-detail {
            padding: 16px;
          }

          .saved-list-grid {
            grid-template-columns: 1fr;
          }

          .saved-brand h1 {
            font-size: 20px;
          }
        }
      `}</style>

      <div className="saved-container">
        <header className="saved-header">
          <div className="saved-brand">
            <div className="saved-logo">N</div>
            <div>
              <h1>NoteZ Dashboard</h1>
              <p>Your personal productivity space</p>
            </div>
          </div>

          <div className="saved-account">
            <span className="saved-online-dot" />
            {user.email || "Signed in"}
          </div>
        </header>

        {error && <div className="saved-error">{error}</div>}

        {selectedList ? (
          <section className="saved-detail">
            <button className="saved-back" onClick={closeList}>
              ← Back to Dashboard
            </button>

            <div className="saved-detail-head">
              <div>
                <h2>{selectedList.title || "Untitled List"}</h2>
                <p>{selectedList.subtitle || "Your saved checklist"}</p>
                <p>Saved: {dateLabel(selectedList.updatedAt || selectedList.createdAt)}</p>
              </div>

              <button
                className={`saved-star ${selectedList.favorite ? "active" : ""}`}
                onClick={() => toggleFavorite(selectedList)}
                title="Toggle favorite"
              >
                {selectedList.favorite ? "★" : "☆"}
              </button>
            </div>

            <div className="saved-progress-track">
              <div
                className="saved-progress-fill"
                style={{ width: `${getProgress(selectedList)}%` }}
              />
            </div>

            <div className="saved-progress-info">
              <span>
                {getCompleted(selectedList)} of {selectedList.items.length} completed
              </span>
              <strong>{getProgress(selectedList)}%</strong>
            </div>

            <div className="saved-detail-items">
              {selectedList.items.map((item) => (
                <label className="saved-task" key={item.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(item.done)}
                    onChange={() => toggleTask(selectedList, item.id)}
                  />

                  <span
                    className={`saved-task-text ${
                      item.done ? "done" : ""
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
              ))}

              {selectedList.items.length === 0 && (
                <div className="saved-empty">
                  This list has no checklist items.
                </div>
              )}
            </div>

            <div className="saved-card-actions">
              <button
                className="saved-btn saved-delete-btn"
                onClick={() => deleteList(selectedList)}
              >
                Delete This List
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="saved-welcome">
              <h2>Welcome to your productivity dashboard 🌿</h2>
              <p>
                Track your lists, celebrate completed tasks and keep
                your important lists close.
              </p>
            </section>

            <section className="saved-stats">
              <div className="saved-stat">
                <div className="saved-stat-icon">📋</div>
                <strong>{totalLists}</strong>
                <span>Total Lists</span>
              </div>

              <div className="saved-stat">
                <div className="saved-stat-icon">🏆</div>
                <strong>{finishedLists}</strong>
                <span>Finished Lists</span>
              </div>

              <div className="saved-stat">
                <div className="saved-stat-icon">⏳</div>
                <strong>{inProgressLists}</strong>
                <span>In Progress</span>
              </div>

              <div className="saved-stat">
                <div className="saved-stat-icon">✓</div>
                <strong>{completedTasks}/{totalTasks}</strong>
                <span>Completed Tasks</span>
              </div>
            </section>

            <section className="saved-panel">
              <div className="saved-section-heading">
                <div>
                  <h2>Overall Productivity</h2>
                  <p>Your progress across all saved lists</p>
                </div>
                <span className="saved-badge">{overallProgress}% complete</span>
              </div>

              <div className="saved-progress-track">
                <div
                  className="saved-progress-fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>

              <div className="saved-progress-info">
                <span>{completedTasks} completed tasks</span>
                <span>{totalTasks - completedTasks} remaining</span>
              </div>

              <div className="saved-progress-info" style={{ marginTop: 15 }}>
                <span>Finished lists: {finishedLists}</span>
                <span>Not started: {notStartedLists}</span>
              </div>
            </section>

            <section className="saved-panel">
              <div className="saved-section-heading">
                <div>
                  <h2>⭐ Favorite Lists</h2>
                  <p>Your personally selected important lists</p>
                </div>
                <span className="saved-badge">
                  {favoriteLists.length} Favorites
                </span>
              </div>

              {favoriteLists.length === 0 ? (
                <div className="saved-empty">
                  <div className="saved-empty-icon">☆</div>
                  <strong>No favorite lists yet</strong>
                  <p>Press the star on any saved list to add it here.</p>
                </div>
              ) : (
                <div className="saved-list-grid">
                  {favoriteLists.map((list) => (
                    <SavedListCard
                      key={list.id}
                      list={list}
                      getProgress={getProgress}
                      getCompleted={getCompleted}
                      dateLabel={dateLabel}
                      openList={openList}
                      toggleFavorite={toggleFavorite}
                      deleteList={deleteList}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="saved-panel">
              <div className="saved-section-heading">
                <div>
                  <h2>All Saved Lists</h2>
                  <p>Open a list to view and complete its tasks</p>
                </div>
                <span className="saved-badge">{totalLists} Lists</span>
              </div>

              {lists.length === 0 ? (
                <div className="saved-empty">
                  <div className="saved-empty-icon">📂</div>
                  <strong>No saved lists found</strong>
                  <p>Create and save a list in List Studio first.</p>
                </div>
              ) : (
                <div className="saved-list-grid">
                  {lists.map((list) => (
                    <SavedListCard
                      key={list.id}
                      list={list}
                      getProgress={getProgress}
                      getCompleted={getCompleted}
                      dateLabel={dateLabel}
                      openList={openList}
                      toggleFavorite={toggleFavorite}
                      deleteList={deleteList}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="saved-footer">
          NoteZ · Your lists, your progress, your productivity.
        </footer>
      </div>

      {notification && (
        <div className="saved-toast">{notification}</div>
      )}
    </div>
  );
}

function SavedListCard({
  list,
  getProgress,
  getCompleted,
  dateLabel,
  openList,
  toggleFavorite,
  deleteList,
}) {
  const progress = getProgress(list);
  const total = list.items?.length || 0;

  return (
    <article className="saved-card">
      <div className="saved-card-top">
        <div>
          <h3>{list.title || "Untitled List"}</h3>
          <p className="saved-card-subtitle">
            {list.subtitle || "Saved checklist"}
          </p>
        </div>

        <button
          className={`saved-star ${list.favorite ? "active" : ""}`}
          onClick={() => toggleFavorite(list)}
          title={list.favorite ? "Remove favorite" : "Add favorite"}
        >
          {list.favorite ? "★" : "☆"}
        </button>
      </div>

      <div className="saved-progress-track">
        <div
          className="saved-progress-fill"
          style={{
            width: `${progress}%`,
            background: list.theme || "#15803d",
          }}
        />
      </div>

      <div className="saved-card-meta">
        <span>{getCompleted(list)}/{total} completed</span>
        <strong>{progress}%</strong>
      </div>

      <div className="saved-card-meta">
        <span>{dateLabel(list.updatedAt || list.createdAt)}</span>
        {progress === 100 && total > 0 ? (
          <span style={{ color: "#15803d" }}>✓ Finished</span>
        ) : (
          <span>{total - getCompleted(list)} remaining</span>
        )}
      </div>

      <div className="saved-card-actions">
        <button
          className="saved-btn saved-open-btn"
          onClick={() => openList(list)}
        >
          Open List →
        </button>

        <button
          className="saved-btn saved-delete-btn"
          onClick={() => deleteList(list)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
