import { db, auth } from "../firebase/Firebase";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { httpsCallable, getFunctions } from "firebase/functions";

const functions = getFunctions();

export const aiSummaryService = {
  /**
   * Send a selected file to the secure Firebase Cloud Function.
   *
   * Firebase Storage is NOT used here.
   */
  async uploadAndProcessFile(file, mode, onProgress = () => {}) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User not authenticated.");
    }

    if (!file) {
      throw new Error("No file selected.");
    }

    if (!mode) {
      throw new Error("AI mode is required.");
    }

    const documentId = doc(
      collection(db, `users/${user.uid}/aiDocuments`)
    ).id;

    const fileType =
      file.type || file.name.split(".").pop()?.toLowerCase() || "";

    /**
     * Convert the selected file into Base64.
     * The file is sent directly to the Cloud Function.
     */
    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = reader.result;

          if (typeof result !== "string") {
            reject(new Error("Could not read the selected file."));
            return;
          }

          // Remove the data URL prefix.
          // Example:
          // data:application/pdf;base64,AAAA...
          const base64 = result.includes(",")
            ? result.split(",")[1]
            : result;

          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read the selected file."));
      };

      reader.readAsDataURL(file);
    });

    // File reading progress.
    onProgress(50);

    /**
     * Create Firestore document.
     */
    const docRef = doc(
      db,
      `users/${user.uid}/aiDocuments`,
      documentId
    );

    const docData = {
      fileName: file.name,
      fileType,
      mode,
      status: "processing",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      result: null,
      error: null,
    };

    await setDoc(docRef, docData);

    onProgress(60);

    /**
     * Call Firebase Cloud Function.
     */
    const processAI = httpsCallable(
      functions,
      "processAISummary"
    );

    const response = await processAI({
      documentId,
      fileName: file.name,
      fileType,
      fileData,
      mode,
    });

    onProgress(100);

    return {
      documentId,
      result: response.data?.result ?? null,
    };
  },

  /**
   * Get all AI documents belonging to the current user.
   */
  async getUserDocuments() {
    const user = auth.currentUser;

    if (!user) {
      return [];
    }

    const documentsRef = collection(
      db,
      `users/${user.uid}/aiDocuments`
    );

    const q = query(
      documentsRef,
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  },

  /**
   * Get one AI document belonging to the current user.
   */
  async getDocument(documentId) {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Unauthorized");
    }

    if (!documentId) {
      throw new Error("Document ID is required.");
    }

    const docRef = doc(
      db,
      `users/${user.uid}/aiDocuments`,
      documentId
    );

    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error("Document not found.");
    }

    return {
      id: snap.id,
      ...snap.data(),
    };
  },
};