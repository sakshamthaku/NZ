import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase/Firebase";

import NoteZLoader from "../components/NoteZLoader";


// ======================================================
// AUTH CONTEXT
// ======================================================

export const AuthContext = createContext(null);


// ======================================================
// AUTH PROVIDER
// ======================================================

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Loader states
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showLoader, setShowLoader] = useState(true);


  // ====================================================
  // FIREBASE AUTHENTICATION LISTENER
  // ====================================================

  useEffect(() => {
    // Make sure Firebase Auth exists
    if (!auth) {
      console.error("Firebase Auth is not initialized.");

      setCurrentUser(null);
      setLoading(false);

      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        console.log(
          "Firebase authentication state:",
          user ? user.uid : "No user"
        );

        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Firebase authentication error:",
          error
        );

        setCurrentUser(null);
        setLoading(false);
      }
    );

    // Cleanup listener
    return () => {
      unsubscribe();
    };
  }, []);


  // ====================================================
  // LOADER FADE OUT
  // ====================================================

  useEffect(() => {
    if (!loading) {
      setIsFadingOut(true);

      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 400);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [loading]);


  // ====================================================
  // AUTH CONTEXT VALUE
  // ====================================================

  const value = {
    currentUser: currentUser,

    // Backward compatibility
    user: currentUser,

    loading: loading,

    // Helpful authentication status
    isAuthenticated: Boolean(currentUser),

    // Easy access to Firebase UID
    userId: currentUser ? currentUser.uid : null,
  };


  // ====================================================
  // PROVIDER
  // ====================================================

  return (
    <AuthContext.Provider value={value}>

      {showLoader && (
        <NoteZLoader
          isFadingOut={isFadingOut}
        />
      )}

      {children}

    </AuthContext.Provider>
  );
}


// ======================================================
// useAuth HOOK
// ======================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}


// ======================================================
// DEFAULT EXPORT
// ======================================================

export default AuthProvider;