import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  subscribeToNotes,
  deleteNote
} from '../../firebase/noteModel';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ==========================================
  // REAL-TIME NOTES LISTENER
  // ==========================================
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe = null;

    try {
  unsubscribe = subscribeToNotes(
    currentUser.uid,

    // SUCCESS
    (fetchedNotes) => {
      setNotes(
        Array.isArray(fetchedNotes)
          ? fetchedNotes
          : []
      );

      setError('');
      setLoading(false);
    },

    // ERROR
    (err) => {
      console.error(
        'Error loading notes:',
        err
      );

      setNotes([]);
      setLoading(false);

      setError(
        err?.message ||
        'Unable to load notes. Please try again.'
      );
    }
  );
} catch (err) {
  console.error(
    'Error setting up snapshot listener:',
    err
  );

  setNotes([]);
  setLoading(false);

  setError(
    err?.message ||
    'Unable to load notes. Please try again.'
  );
}

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [currentUser?.uid]);


  // ==========================================
  // DELETE NOTE
  // ==========================================
  const confirmDelete = async () => {
    if (
      !noteToDelete ||
      !currentUser?.uid ||
      deleting
    ) {
      return;
    }

    try {
      setDeleting(true);
      setError('');

      const noteId = noteToDelete.id;

      if (!noteId) {
        throw new Error(
          'This note does not have a valid Firestore document ID.'
        );
      }

      await deleteNote(
        currentUser.uid,
        noteId
      );

      setNotes((previousNotes) => {
        const safePrev = Array.isArray(previousNotes) ? previousNotes : [];
        return safePrev.filter(
          (note) => note.id !== noteId
        );
      });

      setNoteToDelete(null);
      setError('');

    } catch (err) {
      console.error(
        'Error deleting note:',
        err
      );

      setError(
        err?.message ||
        'Failed to delete note.'
      );

    } finally {
      setDeleting(false);
    }
  };


  // ==========================================
  // FILTER NOTES SAFELY
  // ==========================================
  const safeNotes = Array.isArray(notes) ? notes : [];
  const filteredNotes = safeNotes.filter((note) => {

    // Trash
    if (activeTab === 'trash') {
      if (!note.isDeleted) {
        return false;
      }
    }

    // Normal views
    else {
      if (note.isDeleted) {
        return false;
      }

      if (
        activeTab === 'favorites' &&
        !note.isFavorite
      ) {
        return false;
      }

      if (
        activeTab === 'pinned' &&
        !note.isPinned
      ) {
        return false;
      }

      if (
        activeTab === 'archived' &&
        !note.isArchived
      ) {
        return false;
      }
    }

    // Search
    const search =
      searchQuery.toLowerCase();

    const matchesSearch =
      (
        note.title &&
        note.title
          .toLowerCase()
          .includes(search)
      ) ||
      (
        note.content &&
        note.content
          .toLowerCase()
          .includes(search)
      );

    return matchesSearch;
  });


  // ==========================================
  // OPEN DELETE MODAL
  // ==========================================
  const openDeleteModal = (note) => {
    setError('');
    setNoteToDelete(note);
  };


  // ==========================================
  // CLOSE DELETE MODAL
  // ==========================================
  const closeDeleteModal = () => {
    if (deleting) {
      return;
    }

    setNoteToDelete(null);
  };


  return (
    <div className="notes-page-wrapper">

      <style>{`
        .notes-page-wrapper {
          background-color: #f4f7f5;
          color: #2b3a32;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          padding: 30px 20px;
          display: flex;
          justify-content: center;
        }

        .notes-container {
          max-width: 1000px;
          width: 100%;
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          background: #ffffff;
          padding: 20px 25px;
          border-radius: 12px;
          border: 1px solid #d4e2dc;
          box-shadow: 0 4px 12px rgba(45, 106, 79, 0.04);
        }

        .notes-header h1 {
          font-size: 1.6rem;
          color: #1b382b;
          font-weight: 700;
        }

        .new-note-btn {
          background: #2d6a4f;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 2px 6px rgba(45, 106, 79, 0.2);
        }

        .new-note-btn:hover {
          background: #224d38;
          transform: translateY(-1px);
        }

        .error-banner {
          background: #fdf2f2;
          color: #d9534f;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #f5c6cb;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }

        .search-bar {
          margin-bottom: 20px;
        }

        .search-bar input {
          width: 100%;
          padding: 12px 16px;
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.95rem;
          color: #2b3a32;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .search-bar input:focus {
          border-color: #2d6a4f;
          box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.1);
        }

        .notes-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 25px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .notes-tabs button {
          background: #eaf3ee;
          border: 1px solid #bce1ce;
          color: #224d38;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .notes-tabs button:hover {
          background: #d8ece2;
        }

        .notes-tabs button.active {
          background: #2d6a4f;
          color: #ffffff;
          border-color: #2d6a4f;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .no-notes {
          grid-column: 1 / -1;
          text-align: center;
          color: #6b8a7a;
          padding: 40px;
          font-size: 0.95rem;
          background: #ffffff;
          border-radius: 10px;
          border: 1px dashed #d4e2dc;
        }

        .note-card {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 12px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 160px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .note-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(45, 106, 79, 0.06);
        }

        .note-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 10px;
        }

        .note-card-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #1b382b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .badge {
          font-size: 0.85rem;
        }

        .note-content-preview {
          font-size: 0.88rem;
          color: #5a7a6b;
          line-height: 1.4;
          margin-bottom: 15px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .note-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #edf2ef;
          padding-top: 10px;
        }

        .note-category {
          background: #eaf3ee;
          color: #2d6a4f;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .note-actions {
          display: flex;
          gap: 6px;
        }

        .edit-btn,
        .delete-btn {
          background: none;
          border: 1px solid transparent;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }

        .edit-btn {
          color: #2d6a4f;
          background: #eaf3ee;
        }

        .edit-btn:hover {
          background: #d8ece2;
        }

        .delete-btn {
          color: #d9534f;
          background: #fdf2f2;
        }

        .delete-btn:hover {
          background: #fae1e1;
        }

        .trash-label {
          font-size: 0.78rem;
          color: #999;
          font-style: italic;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(27, 56, 43, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
          animation: fadeIn 0.2s ease-in-out;
        }

        .modal-content {
          background: #ffffff;
          padding: 24px;
          border-radius: 12px;
          max-width: 360px;
          width: 90%;
          border: 1px solid #d4e2dc;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          text-align: center;
        }

        .modal-content h3 {
          font-size: 1.1rem;
          color: #1b382b;
          margin-bottom: 8px;
        }

        .modal-content p {
          font-size: 0.88rem;
          color: #5a7a6b;
          margin-bottom: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .cancel-btn,
        .confirm-delete-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .cancel-btn {
          background: #eaf3ee;
          color: #2b3a32;
        }

        .cancel-btn:hover {
          background: #d8ece2;
        }

        .confirm-delete-btn {
          background: #d9534f;
          color: #ffffff;
        }

        .confirm-delete-btn:hover {
          background: #c9302c;
        }

        .confirm-delete-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="notes-container">

        {/* Header */}
        <div className="notes-header">
          <h1>My Notes</h1>

          <Link
            to="/notewriter"
            className="new-note-btn"
          >
            + New Note
          </Link>
        </div>


        {/* Error */}
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}


        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search notes..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
          />
        </div>


        {/* Tabs */}
        <div className="notes-tabs">

          <button
            className={
              activeTab === 'all'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('all')
            }
          >
            All Notes
          </button>

          <button
            className={
              activeTab === 'favorites'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('favorites')
            }
          >
            ⭐ Favorites
          </button>

          <button
            className={
              activeTab === 'pinned'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('pinned')
            }
          >
            📌 Pinned
          </button>

          <button
            className={
              activeTab === 'archived'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('archived')
            }
          >
            📦 Archived
          </button>

          <button
            className={
              activeTab === 'trash'
                ? 'active'
                : ''
            }
            onClick={() =>
              setActiveTab('trash')
            }
          >
            🗑 Trash
          </button>

        </div>


        {/* Notes Grid */}
        <div className="notes-grid">

          {loading ? (
            <p className="no-notes">Loading notes...</p>
          ) : filteredNotes.length === 0 ? (

            <p className="no-notes">
              No notes found.
            </p>

          ) : (

            filteredNotes.map((note) => (

              <div
                className="note-card"
                key={note.id}
              >

                <div className="note-card-header">

                  <h3>
                    {note.title || 'Untitled'}
                  </h3>

                  <div>
                    {note.isFavorite && (
                      <span className="badge">
                        ⭐
                      </span>
                    )}

                    {note.isPinned && (
                      <span className="badge">
                        📌
                      </span>
                    )}
                  </div>

                </div>


                <p className="note-content-preview">
                  {note.content
                    ? note.content.substring(
                        0,
                        100
                      ) + '...'
                    : ''}
                </p>


                <div className="note-footer">

                  <span className="note-category">
                    {note.category ||
                      'General'}
                  </span>


                  {activeTab !== 'trash' ? (

                    <div className="note-actions">

                      <button
                        onClick={() =>
                          navigate(
                            `/notes/edit/${note.id}`
                          )
                        }
                        className="edit-btn"
                      >
                        ✏ Edit
                      </button>

                      <button
                        onClick={() =>
                          openDeleteModal(note)
                        }
                        className="delete-btn"
                        disabled={deleting}
                      >
                        🗑 Delete
                      </button>

                    </div>

                  ) : (

                    <span className="trash-label">
                      In Trash
                    </span>

                  )}

                </div>

              </div>

            ))

          )}

        </div>


        {/* Delete Confirmation Modal */}
        {noteToDelete && (

          <div className="modal-overlay">

            <div className="modal-content">

              <h3>
                Delete this note?
              </h3>

              <p>
                This note will be deleted
                permanently.
              </p>

              <div className="modal-actions">

                <button
                  onClick={closeDeleteModal}
                  className="cancel-btn"
                  disabled={deleting}
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  className="confirm-delete-btn"
                  disabled={deleting}
                >
                  {deleting
                    ? 'Deleting...'
                    : 'Delete'}
                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}