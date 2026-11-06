import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserNotes, deleteNote } from "../firebase/noteModel";

export default function NotesManagement() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    loadNotes();
  }, [currentUser]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const userNotes = await getUserNotes(currentUser.uid);
      setNotes(userNotes);
    } catch (err) {
      setError("Unable to load your notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNote(noteId, currentUser.uid);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err) {
      alert("You don't have permission to delete this note.");
    }
  };

  if (!currentUser) {
    return <div className="p-6 text-center text-gray-600">Please sign in to view your notes.</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading your notes...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500">{error}</div>;
  }

  const filteredNotes = notes.filter(note => 
    note.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Notes</h1>
      
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search my notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredNotes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">You don't have any notes yet.</p>
      ) : (
        <div className="grid gap-4">
          {filteredNotes.map(note => (
            <div key={note.id} className="p-4 border rounded-lg shadow-sm bg-white flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg">{note.title || "Untitled Note"}</h3>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {note.content}
                </p>
                <span className="text-xs text-gray-400 mt-2 block">
                  Updated: {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : "Just now"}
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => navigate(`/notes/${note.id}`)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Open
                </button>
                <button 
                  onClick={() => navigate(`/notes/edit/${note.id}`)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(note.id)}
                  className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}