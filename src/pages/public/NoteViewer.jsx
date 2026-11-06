import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getNoteById, deleteNote } from "../firebase/noteModel";

export default function NoteViewer() {
  const { noteId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    fetchNote();
  }, [noteId, currentUser]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const fetchedNote = await getNoteById(noteId, currentUser.uid);
      setNote(fetchedNote);
    } catch (err) {
      setErrorMessage(err.message || "Note not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteNote(noteId, currentUser.uid);
      navigate("/notes");
    } catch (err) {
      alert("Permission denied.");
    }
  };

  if (!currentUser) {
    return <div className="p-6 text-center text-gray-600">Please sign in to view your notes.</div>;
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading note...</div>;
  }

  if (errorMessage) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <p className="text-red-600 font-medium mb-4">{errorMessage}</p>
        <button 
          onClick={() => navigate("/notes")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          [Back to Notes]
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-sm mt-6">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => navigate("/notes")}
          className="text-blue-600 hover:underline text-sm"
        >
          &larr; Back to Notes
        </button>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/notes/edit/${note.id}`)}
            className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
          >
            Edit
          </button>
          <button 
            onClick={handleDelete}
            className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-2">{note.title}</h1>
      
      <div className="flex gap-4 text-xs text-gray-400 mb-6">
        {note.category && <span>Category: {note.category}</span>}
        <span>Created: {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : "N/A"}</span>
        <span>Updated: {note.updatedAt?.toDate ? note.updatedAt.toDate().toLocaleDateString() : "N/A"}</span>
      </div>

      <div className="prose max-w-none whitespace-pre-wrap leading-relaxed text-gray-800">
        {note.content}
      </div>

      {note.tags && note.tags.length > 0 && (
        <div className="mt-8 flex gap-2 flex-wrap">
          {note.tags.map((tag, idx) => (
            <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}