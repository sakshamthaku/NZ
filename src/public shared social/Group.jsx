import React, { useEffect, useState } from "react";
import "./Group.css";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import firebaseConfig from "../../Firebase.json";


// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


// ======================================================
// GROUP PAGE
// ======================================================

export default function Group() {
  const [user, setUser] = useState(null);

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPhoto, setGroupPhoto] = useState("");
  
  // Dual password states
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [confirmHostPassword, setConfirmHostPassword] = useState("");

  // Visibility toggles
  const [showGroupPassword, setShowGroupPassword] = useState(false);
  const [showHostPassword, setShowHostPassword] = useState(false);
  const [showConfirmHostPassword, setShowConfirmHostPassword] = useState(false);

  const [isPrivate, setIsPrivate] = useState(true);
  const [maxMembers, setMaxMembers] = useState(10);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ====================================================
  // AUTH
  // ====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // ====================================================
  // PASSWORD STRENGTH HELPER
  // ====================================================

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: "", className: "" };
    if (pwd.length < 6) return { label: "Weak", className: "strength-weak" };
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return { label: "Medium", className: "strength-medium" };
    }
    return { label: "Strong", className: "strength-strong" };
  };

  const hostPasswordStrength = getPasswordStrength(hostPassword);


  // ====================================================
  // CREATE GROUP
  // ====================================================

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!user) {
      setMessage("Please login before creating a study group.");
      setMessageType("error");
      return;
    }

    if (!groupName.trim()) {
      setMessage("Please enter a group name.");
      setMessageType("error");
      return;
    }

    if (!groupDescription.trim()) {
      setMessage("Please add a short group description.");
      setMessageType("error");
      return;
    }

    if (isPrivate && !password.trim()) {
      setMessage("Please create a group password.");
      setMessageType("error");
      return;
    }

    if (isPrivate && password !== confirmPassword) {
      setMessage("Group passwords do not match.");
      setMessageType("error");
      return;
    }

    if (password.length > 0 && password.length < 4) {
      setMessage("Group password must contain at least 4 characters.");
      setMessageType("error");
      return;
    }

    // Host Password Validation
    if (!hostPassword.trim()) {
      setMessage("Please create a Host Password.");
      setMessageType("error");
      return;
    }

    if (hostPassword.length < 6) {
      setMessage("Host Password must contain at least 6 characters.");
      setMessageType("error");
      return;
    }

    if (hostPassword !== confirmHostPassword) {
      setMessage("Host Passwords do not match.");
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      // ------------------------------------------------
      // GROUP DOCUMENT
      // ------------------------------------------------

      const groupData = {
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        groupPhoto: groupPhoto.trim(),
        hostName:
          user.displayName ||
          user.email?.split("@")[0] ||
          "Student",
        hostEmail: user.email || "",
        hostUid: user.uid,
        isPrivate: isPrivate,
        maxMembers: Number(maxMembers),
        memberCount: 1,
        createdAt: serverTimestamp(),
      };


      // ------------------------------------------------
      // DUAL PASSWORDS STORAGE
      // ------------------------------------------------

      if (isPrivate) {
        groupData.groupPassword = password;
      }
      
      // Host password is always required regardless of public/private status
      groupData.hostPassword = hostPassword;
      groupData.hostPanelPassword = hostPassword;


      // ------------------------------------------------
      // CREATE GROUP
      // ------------------------------------------------

      const groupRef = await addDoc(
        collection(db, "Group"),
        groupData
      );


      // ------------------------------------------------
      // ADD HOST AS FIRST MEMBER
      // ------------------------------------------------

      await addDoc(
        collection(
          db,
          "Group",
          groupRef.id,
          "members"
        ),
        {
          uid: user.uid,
          name:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Student",
          email: user.email || "",
          role: "host",
          joinedAt: serverTimestamp(),
          isOnline: true,
          lastSeenAt: serverTimestamp(),
        }
      );


      // ------------------------------------------------
      // CREATE FIRST SYSTEM MESSAGE
      // ------------------------------------------------

      await addDoc(
        collection(
          db,
          "Group",
          groupRef.id,
          "messages"
        ),
        {
          senderUid: user.uid,
          senderName:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Student",
          message: "Group created successfully.",
          type: "system",
          createdAt: serverTimestamp(),
        }
      );


      setMessage(
        `Group "${groupName}" created successfully!`
      );

      setMessageType("success");

      // Clear form
      setGroupName("");
      setGroupDescription("");
      setGroupPhoto("");
      setPassword("");
      setConfirmPassword("");
      setHostPassword("");
      setConfirmHostPassword("");

    } catch (error) {
      console.error("Create group error:", error);

      setMessage(
        error?.message ||
        "Unable to create the group. Please try again."
      );

      setMessageType("error");

    } finally {
      setLoading(false);
    }
  };


  // ====================================================
  // NOT LOGGED IN
  // ====================================================

  if (!user) {
    return (
      <div className="notez-group-page">

        <div className="notez-group-background">
          <span className="group-orb orb-one"></span>
          <span className="group-orb orb-two"></span>
          <span className="group-orb orb-three"></span>
        </div>

        <main className="group-login-card">

          <div className="group-brand">
            <div className="group-brand-icon">
              N
            </div>

            <span>NoteZ</span>
          </div>

          <div className="login-icon">
            🔐
          </div>

          <h1>
            Login Required
          </h1>

          <p>
            Sign in to create and manage your
            NoteZ study groups.
          </p>

          <a
            href="/login"
            className="group-primary-button"
          >
            Login to NoteZ
          </a>

          <div className="group-small-trust">
            <span>🔒</span>
            Your account is protected by
            secure authentication.
          </div>

        </main>

      </div>
    );
  }


  // ====================================================
  // MAIN UI
  // ====================================================

  return (
    <div className="notez-group-page">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="notez-group-background">
        <span className="group-grid"></span>

        <span className="group-orb orb-one"></span>
        <span className="group-orb orb-two"></span>
        <span className="group-orb orb-three"></span>
      </div>


      {/* =================================================
          HEADER
      ================================================= */}

      <header className="group-header">

        <div className="group-header-inner">

          <a
            href="/"
            className="notez-logo"
          >
            <span className="notez-logo-mark">
              N
            </span>

            <span className="notez-logo-text">
              NoteZ
            </span>
          </a>


          <div className="group-header-right">

            <div className="online-user">

              <span className="online-dot"></span>

              <span className="online-name">
                {user.displayName ||
                  user.email?.split("@")[0] ||
                  "Student"}
              </span>

            </div>

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="group-main">

        {/* HERO */}

        <section className="group-hero">

          <div className="hero-badge">
            <span>✦</span>
            NoteZ Public Shared Social
          </div>


          <h1>
            Create Your
            <span> Study Group</span>
          </h1>


          <p>
            Bring your classmates together in one
            focused space for projects, notes,
            discussions and collaboration.
          </p>


          <div className="hero-features">

            <div className="hero-feature">
              <span>👥</span>
              <strong>2–10 Students</strong>
            </div>

            <div className="hero-feature">
              <span>💬</span>
              <strong>Realtime Chat</strong>
            </div>

            <div className="hero-feature">
              <span>📚</span>
              <strong>Study Together</strong>
            </div>

          </div>

        </section>


        {/* =================================================
            FORM CARD
        ================================================= */}

        <section className="group-card">

          <div className="card-top">

            <div>

              <span className="section-number">
                01
              </span>

              <div>
                <h2>
                  Group Information
                </h2>

                <p>
                  Tell your classmates what this
                  group is about.
                </p>
              </div>

            </div>

          </div>


          <form
            onSubmit={handleCreateGroup}
            className="group-form"
          >

            {/* GROUP NAME */}

            <div className="form-field">

              <label htmlFor="groupName">
                Group Name
                <span>*</span>
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  ✦
                </span>

                <input
                  id="groupName"
                  type="text"
                  value={groupName}
                  onChange={(e) =>
                    setGroupName(e.target.value)
                  }
                  placeholder="e.g. AI Project Team"
                  maxLength={60}
                />

              </div>

              <small>
                Choose a clear name your classmates
                will recognize.
              </small>

            </div>


            {/* DESCRIPTION */}

            <div className="form-field">

              <label htmlFor="groupDescription">
                Group Description
                <span>*</span>
              </label>

              <textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) =>
                  setGroupDescription(e.target.value)
                }
                placeholder="What is this group for?"
                maxLength={300}
                rows={5}
              />

              <div className="field-bottom">

                <small>
                  Describe the project, subject or
                  purpose of your group.
                </small>

                <span>
                  {groupDescription.length}/300
                </span>

              </div>

            </div>


            {/* GROUP PHOTO */}

            <div className="form-field">

              <label htmlFor="groupPhoto">
                Group Photo
                <em>Optional</em>
              </label>

              <div className="input-wrapper">

                <span className="input-icon">
                  🖼️
                </span>

                <input
                  id="groupPhoto"
                  type="url"
                  value={groupPhoto}
                  onChange={(e) =>
                    setGroupPhoto(e.target.value)
                  }
                  placeholder="https://..."
                />

              </div>

              <small>
                Add an image URL for your group identity.
              </small>

            </div>


            {/* =================================================
                ACCESS
            ================================================= */}

            <div className="form-section-divider">

              <span>
                02
              </span>

              <div>
                <h2>
                  Group Access
                </h2>

                <p>
                  Control who can enter your study group.
                </p>
              </div>

            </div>


            {/* PRIVATE/PUBLIC */}

            <div className="access-card">

              <div className="access-card-header">

                <div className="access-icon">
                  {isPrivate ? "🔐" : "🌎"}
                </div>

                <div>

                  <h3>
                    {isPrivate
                      ? "Private Study Group"
                      : "Public Study Group"}
                  </h3>

                  <p>
                    {isPrivate
                      ? "Students need the group password to join."
                      : "Students can discover and join this group."}
                  </p>

                </div>

                <label className="switch">

                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) =>
                      setIsPrivate(e.target.checked)
                    }
                  />

                  <span className="slider"></span>

                </label>

              </div>

            </div>


            {/* GROUP PASSWORD */}

            {isPrivate && (
              <div className="password-area">

                <div className="form-field">

                  <label htmlFor="groupPassword">
                    Group Password
                    <span>*</span>
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      🔑
                    </span>

                    <input
                      id="groupPassword"
                      type={showGroupPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      placeholder="Create a group password"
                      minLength={4}
                    />

                    <button
                      type="button"
                      className="eye-toggle-btn"
                      onClick={() => setShowGroupPassword(!showGroupPassword)}
                      title="Toggle visibility"
                    >
                      {showGroupPassword ? "🙈" : "👁️"}
                    </button>

                  </div>

                  <small>
                    This password is used by members to enter a private group.
                  </small>

                </div>


                <div className="form-field">

                  <label htmlFor="confirmPassword">
                    Confirm Group Password
                    <span>*</span>
                  </label>

                  <div className="input-wrapper">

                    <span className="input-icon">
                      ✓
                    </span>

                    <input
                      id="confirmPassword"
                      type={showGroupPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Enter group password again"
                    />

                  </div>

                </div>

              </div>
            )}


            {/* =================================================
                HOST SECURITY SECTION
            ================================================= */}

            <div className="form-section-divider">

              <span>
                03
              </span>

              <div>
                <h2>
                  Host Security
                </h2>

                <p>
                  Secure your private control center.
                </p>
              </div>

            </div>

            <div className="host-security-card">
              <div className="host-security-banner">
                <span className="security-lock-icon">🔐</span>
                <div>
                  <strong>Host Password</strong>
                  <p>
                    Your Host Password is extremely important. It is required to access Host Control and manage this group. Keep it secure.
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="hostPassword">
                  Host Password
                  <span>*</span>
                </label>

                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    id="hostPassword"
                    type={showHostPassword ? "text" : "password"}
                    value={hostPassword}
                    onChange={(e) => setHostPassword(e.target.value)}
                    placeholder="Enter unique host password (min 6 chars)"
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowHostPassword(!showHostPassword)}
                    title="Toggle visibility"
                  >
                    {showHostPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                
                {hostPassword && (
                  <div className="password-strength-indicator">
                    <span>Strength: </span>
                    <strong className={hostPasswordStrength.className}>
                      {hostPasswordStrength.label}
                    </strong>
                  </div>
                )}
                
                <small>
                  Used only by the host to access Host Control and manage the group.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="confirmHostPassword">
                  Confirm Host Password
                  <span>*</span>
                </label>

                <div className="input-wrapper">
                  <span className="input-icon">✓</span>
                  <input
                    id="confirmHostPassword"
                    type={showConfirmHostPassword ? "text" : "password"}
                    value={confirmHostPassword}
                    onChange={(e) => setConfirmHostPassword(e.target.value)}
                    placeholder="Confirm host password"
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowConfirmHostPassword(!showConfirmHostPassword)}
                    title="Toggle visibility"
                  >
                    {showConfirmHostPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>


            {/* MEMBER LIMIT */}

            <div className="form-field">

              <label htmlFor="maxMembers">
                Maximum Students
              </label>

              <div className="member-selector">

                {[2, 3, 5, 8, 10].map((number) => (

                  <button
                    type="button"
                    key={number}
                    className={
                      maxMembers === number
                        ? "member-option active"
                        : "member-option"
                    }
                    onClick={() =>
                      setMaxMembers(number)
                    }
                  >
                    {number}
                  </button>

                ))}

              </div>

              <small>
                Maximum group size is 10 students.
              </small>

            </div>


            {/* =================================================
                HOST
            ================================================= */}

            <div className="form-section-divider">

              <span>
                04
              </span>

              <div>
                <h2>
                  Group Host
                </h2>

                <p>
                  Your authenticated NoteZ account
                  will become the group host.
                </p>
              </div>

            </div>


            <div className="host-card">

              <div className="host-avatar">

                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                  />
                ) : (
                  (
                    user.displayName ||
                    user.email ||
                    "S"
                  )
                    .charAt(0)
                    .toUpperCase()
                )}

              </div>


              <div className="host-details">

                <span className="host-label">
                  GROUP HOST
                </span>

                <strong>
                  {user.displayName ||
                    user.email?.split("@")[0] ||
                    "Student"}
                </strong>

                <span>
                  {user.email}
                </span>

              </div>


              <div className="host-verified">
                <span>✓</span>
                Verified
              </div>

            </div>


            {/* =================================================
                PREVIEW
            ================================================= */}

            <div className="preview-box">

              <div className="preview-header">

                <span>
                  LIVE PREVIEW
                </span>

                <span className="preview-status">
                  ● Ready
                </span>

              </div>


              <div className="preview-content">

                <div className="preview-avatar">

                  {groupPhoto ? (
                    <img
                      src={groupPhoto}
                      alt="Group"
                    />
                  ) : (
                    "N"
                  )}

                </div>


                <div className="preview-info">

                  <h3>
                    {groupName ||
                      "Your Study Group"}
                  </h3>

                  <p>
                    {groupDescription ||
                      "Your group description will appear here."}
                  </p>

                  <div className="preview-meta">

                    <span>
                      👥 1/{maxMembers}
                    </span>

                    <span>
                      {isPrivate
                        ? "🔐 Private"
                        : "🌎 Public"}
                    </span>

                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                TRUST
            ================================================= */}

            <div className="group-trust">

              <div>
                🔒
              </div>

              <div>

                <strong>
                  Built for focused study
                </strong>

                <p>
                  Your group is connected to your
                  authenticated NoteZ account.
                </p>

              </div>

            </div>


            {/* MESSAGE */}

            {message && (
              <div
                className={
                  messageType === "success"
                    ? "form-message success"
                    : "form-message error"
                }
              >
                {messageType === "success"
                  ? "✓"
                  : "!"}

                <span>
                  {message}
                </span>
              </div>
            )}


            {/* CREATE */}

            <button
              type="submit"
              className="create-group-button"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  Creating Group...
                </>
              ) : (
                <>
                  Create Study Group
                  <span>→</span>
                </>
              )}

            </button>


            <p className="form-note">
              By creating this group, you become its
              host and can manage its members.
            </p>

          </form>

        </section>


        {/* =================================================
            BOTTOM FEATURES
        ================================================= */}

        <section className="group-bottom-features">

          <div className="bottom-feature">

            <div>💬</div>

            <h3>
              Group Chat
            </h3>

            <p>
              Talk with your project members
              in realtime.
            </p>

          </div>


          <div className="bottom-feature">

            <div>📄</div>

            <h3>
              Share Files
            </h3>

            <p>
              Keep project material together
              inside your group.
            </p>

          </div>


          <div className="bottom-feature">

            <div>💡</div>

            <h3>
              Discussions
            </h3>

            <p>
              Share ideas and discuss your
              project together.
            </p>

          </div>

        </section>

      </main>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="group-footer">

        <div className="footer-logo">
          <span>N</span>
          NoteZ
        </div>

        <p>
          Study together. Create together.
        </p>

        <span>
          © {new Date().getFullYear()} NoteZ
        </span>

      </footer>

    </div>
  );
}