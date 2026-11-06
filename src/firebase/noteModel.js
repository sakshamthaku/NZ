import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "./Firebase";


/**
 * ==========================================
 * TOP-LEVEL NOTES COLLECTION
 * ==========================================
 */
const getNotesRef = () => {
  return collection(db, "notes");
};


/**
 * ==========================================
 * CREATE NOTE
 * ==========================================
 *
 * Every note receives the authenticated
 * user's UID as userId.
 */
export const createNote = async (userId, noteData = {}) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const notesRef = getNotesRef();

    const newNote = {
      title: noteData.title || "Untitled Note",

      content: noteData.content || "",

      category: noteData.category || "General",

      tags: Array.isArray(noteData.tags)
        ? noteData.tags
        : [],

      isFavorite: Boolean(noteData.isFavorite),

      isPrivate:
        noteData.isPrivate !== undefined
          ? Boolean(noteData.isPrivate)
          : true,

      // Ownership
      userId: userId,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(
      notesRef,
      newNote
    );

    console.log(
      "Note created successfully:",
      docRef.id
    );

    return docRef.id;

  } catch (error) {
    console.error(
      "Error creating note:",
      error
    );

    throw error;
  }
};


/**
 * ==========================================
 * GET ONE NOTE
 * ==========================================
 *
 * Only return the note if it belongs
 * to the requested user.
 */
export const getNoteById = async (
  userId,
  noteId
) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!noteId) {
      throw new Error("Note ID is required");
    }

    const noteRef = doc(
      db,
      "notes",
      noteId
    );

    const snapshot = await getDoc(noteRef);

    if (!snapshot.exists()) {
      return null;
    }

    const noteData = snapshot.data();

    // Privacy protection
    if (noteData.userId !== userId) {
      console.warn(
        "Unauthorized note access attempt"
      );

      return null;
    }

    return {
      id: snapshot.id,
      ...noteData,
    };

  } catch (error) {
    console.error(
      "Error getting note:",
      error
    );

    throw error;
  }
};


/**
 * ==========================================
 * UPDATE NOTE
 * ==========================================
 *
 * Only the owner can update.
 * Ownership cannot be transferred.
 */
export const updateNote = async (
  userId,
  noteId,
  noteData = {}
) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (!noteId) {
      throw new Error(
        "Note ID required for update"
      );
    }

    const noteRef = doc(
      db,
      "notes",
      noteId
    );

    // Check that the note exists
    const existingNote = await getDoc(
      noteRef
    );

    if (!existingNote.exists()) {
      throw new Error("Note not found");
    }

    const existingData =
      existingNote.data();

    // Ownership check
    if (existingData.userId !== userId) {
      throw new Error(
        "You do not have permission to update this note"
      );
    }

    // Never allow ownership transfer
    const updateData = {
      ...noteData,

      userId: userId,

      updatedAt: serverTimestamp(),
    };

    await updateDoc(
      noteRef,
      updateData
    );

    console.log(
      "Note updated successfully:",
      noteId
    );

    return true;

  } catch (error) {
    console.error(
      "Error updating note:",
      error
    );

    throw error;
  }
};


/**
 * ==========================================
 * DELETE NOTE
 * ==========================================
 *
 * Only the owner can delete.
 */
export const deleteNote = async (
  userId,
  noteId
) => {
  try {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    if (!noteId) {
      throw new Error(
        "Note ID is required for deletion"
      );
    }

    const noteRef = doc(
      db,
      "notes",
      noteId
    );

    // Get existing note
    const existingNote = await getDoc(
      noteRef
    );

    if (!existingNote.exists()) {
      throw new Error(
        "Note not found"
      );
    }

    const existingData =
      existingNote.data();

    // Verify ownership
    if (existingData.userId !== userId) {
      throw new Error(
        "You do not have permission to delete this note"
      );
    }

    // Delete
    await deleteDoc(noteRef);

    console.log(
      "Note deleted successfully:",
      noteId
    );

    return true;

  } catch (error) {
    console.error(
      "Error deleting note:",
      error
    );

    throw error;
  }
};


/**
 * ==========================================
 * GET ALL NOTES FOR CURRENT USER
 * ==========================================
 */
export const getNotes = async (
  userId
) => {
  try {
    if (!userId) {
      throw new Error(
        "User ID is required"
      );
    }

    const notesRef = getNotesRef();

    const q = query(
      notesRef,

      // Privacy filter
      where(
        "userId",
        "==",
        userId
      ),

      // Newest first
      orderBy(
        "updatedAt",
        "desc"
      )
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })
    );

  } catch (error) {
    console.error(
      "Error getting notes:",
      error
    );

    throw error;
  }
};


/**
 * ==========================================
 * REAL-TIME NOTES
 * ==========================================
 *
 * Only listen to notes belonging
 * to the current authenticated user.
 *
 * FIX:
 * - Keeps existing real-time listener
 * - Sends Firestore errors back to Notes.jsx
 * - Prevents "Loading notes..." from staying
 *   forever when the listener fails
 */
export const subscribeToNotes = (
  userId,
  callback,
  errorCallback
) => {
  if (!userId) {
    callback([]);

    return () => {};
  }

  const notesRef = getNotesRef();

  const q = query(
    notesRef,

    // Privacy filter
    where(
      "userId",
      "==",
      userId
    ),

    // Newest first
    orderBy(
      "updatedAt",
      "desc"
    )
  );

  return onSnapshot(
    q,

    // ========================================
    // SUCCESS
    // ========================================
    (snapshot) => {
      const notes =
        snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })
        );

      callback(notes);
    },

    // ========================================
    // ERROR
    // ========================================
    (error) => {
      console.error(
        "Error subscribing to notes:",
        error
      );

      // Send error back to Notes.jsx
      if (
        typeof errorCallback === "function"
      ) {
        errorCallback(error);
      }
    }
  );
};
