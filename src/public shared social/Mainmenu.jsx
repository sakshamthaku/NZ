import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  onAuthStateChanged,
  updateProfile,
  signOut,
} from "firebase/auth";

import { db, auth }from "../firebase/Firebase" ;


import "./Mainmenu.css";

const GROUP_COLLECTION = "Group";
const USERS_COLLECTION = "users";

export default function Mainmenu() {
  const navigate = useNavigate();

  /* =====================================================
     USER STATE
  ===================================================== */

  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  /* =====================================================
     GROUP STATE
  ===================================================== */

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupPassword, setGroupPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState(""); // "success" or "error"
  const [joining, setJoining] = useState(false);

  /* =====================================================
     AUTH LISTENER
  ===================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setProfileLoading(false);
          return;
        }

        setProfileName(
          currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "Student"
        );

        setProfilePhoto(currentUser.photoURL || "");

        setProfileLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     REALTIME GROUP LISTENER
  ===================================================== */

  useEffect(() => {
    const groupsRef = collection(
      db,
      GROUP_COLLECTION
    );

    const unsubscribe = onSnapshot(
      groupsRef,
      (snapshot) => {
        const realtimeGroups = snapshot.docs.map(
          (groupDoc) => ({
            id: groupDoc.id,
            ...groupDoc.data(),
          })
        );

        setGroups(realtimeGroups);
        setGroupsLoading(false);
      },
      (error) => {
        console.error(
          "Group lobby realtime error:",
          error
        );

        setGroupsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     PROFILE REALTIME LISTENER
  ===================================================== */

  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(
      db,
      USERS_COLLECTION,
      user.uid
    );

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        if (data.username) {
          setProfileName(data.username);
        }

        if (data.photoURL) {
          setProfilePhoto(data.photoURL);
        }
      },
      (error) => {
        console.error(
          "Profile listener error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return groups;

    return groups.filter((group) => {
      const groupName = String(
        group.groupName || ""
      ).toLowerCase();

      const hostName = String(
        group.hostName || ""
      ).toLowerCase();

      const description = String(
        group.groupDescription || ""
      ).toLowerCase();

      return (
        groupName.includes(query) ||
        hostName.includes(query) ||
        description.includes(query)
      );
    });
  }, [groups, search]);

  /* =====================================================
     PROFILE SAVE
  ===================================================== */

  const saveProfile = async () => {
    if (!user) {
      alert("Please login first.");
      return;
    }

    const cleanName = profileName.trim();

    if (!cleanName) {
      alert("Please enter your username.");
      return;
    }

    try {
      setSavingProfile(true);

      await updateProfile(user, {
        displayName: cleanName,
        photoURL: profilePhoto.trim() || null,
      });

      const userRef = doc(
        db,
        USERS_COLLECTION,
        user.uid
      );

      await setDoc(
        userRef,
        {
          uid: user.uid,
          username: cleanName,
          email: user.email || "",
          photoURL: profilePhoto.trim() || "",
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setEditingProfile(false);

      alert("Profile updated successfully.");
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      alert(
        "Unable to update profile. Please try again."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  /* =====================================================
     OPEN GROUP
  ===================================================== */

  const openGroup = (group) => {
    setPasswordError("");
    setGroupPassword("");
    setToastMessage("");
    setSelectedGroup(group);
  };

  /* =====================================================
     CLOSE MODAL
  ===================================================== */

  const closeGroupModal = () => {
    if (joining) return;

    setSelectedGroup(null);
    setGroupPassword("");
    setPasswordError("");
    setToastMessage("");
  };

  /* =====================================================
     SHOW TOAST HELPER
  ===================================================== */

  const showToast = (message, type) => {
    setToastMessage(message);
    setToastType(type);
    if (type === "error") {
      setPasswordError(message);
    }
  };

  /* =====================================================
     JOIN GROUP
  ===================================================== */

  const joinGroup = async () => {
    if (!selectedGroup) return;

    if (!user) {
      navigate("/login");
      return;
    }

    const isPrivate =
      selectedGroup.isPrivate === true ||
      selectedGroup.private === true ||
      Boolean(selectedGroup.groupPassword || selectedGroup.password);

    if (!isPrivate) {
      enterGroup(selectedGroup);
      return;
    }

    if (!groupPassword.trim()) {
      showToast("Incorrect group password", "error");
      return;
    }

    setJoining(true);
    setPasswordError("");
    setToastMessage("");

    try {
      const savedPassword =
        selectedGroup.groupPassword ??
        selectedGroup.password ??
        "";

      if (!savedPassword || groupPassword !== String(savedPassword)) {
        showToast("Incorrect group password", "error");
        setJoining(false);
        return;
      }

      // Success flow
      showToast("Successfully joined group", "success");
      
      try {
        sessionStorage.setItem(
          `notez-group-${selectedGroup.id}`,
          JSON.stringify({
            groupId: selectedGroup.id,
            joinedAt: Date.now(),
          })
        );
      } catch (err) {
        console.warn("Session storage unavailable:", err);
      }

      setTimeout(() => {
        setSelectedGroup(null);
        setGroupPassword("");
        setJoining(false);
        navigate("/USERINTERFACED", {
          state: {
            groupId: selectedGroup.id,
            groupName: selectedGroup.groupName || "Study Group",
            hostName: selectedGroup.hostName || "Student",
          },
        });
      }, 800);

    } catch (error) {
      console.error(
        "Join group error:",
        error
      );
      showToast("Incorrect group password", "error");
      setJoining(false);
    }
  };

  /* =====================================================
     ENTER GROUP (FOR PUBLIC GROUPS)
  ===================================================== */

  const enterGroup = (group) => {
    try {
      sessionStorage.setItem(
        `notez-group-${group.id}`,
        JSON.stringify({
          groupId: group.id,
          joinedAt: Date.now(),
        })
      );
    } catch (error) {
      console.warn(
        "Session storage unavailable:",
        error
      );
    }

    setSelectedGroup(null);
    setGroupPassword("");

    showToast("Successfully joined group", "success");

    setTimeout(() => {
      navigate("/USERINTERFACED", {
        state: {
          groupId: group.id,
          groupName: group.groupName || "Study Group",
          hostName: group.hostName || "Student",
        },
      });
    }, 800);
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  /* =====================================================
     PROFILE AVATAR
  ===================================================== */

  const getAvatar = () => {
    if (profilePhoto) {
      return profilePhoto;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profileName || "Student"
    )}&background=16a34a&color=ffffff&bold=true`;
  };

  /* =====================================================
     GROUP AVATAR
  ===================================================== */

  const groupAvatar = (group) => {
    if (group.groupPhoto) {
      return group.groupPhoto;
    }

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      group.groupName || "Group"
    )}&background=0f9d58&color=ffffff&bold=true`;
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="notez-social-lobby">

      {/* =================================================
          GLOBAL TOAST NOTIFICATION
      ================================================= */}
      {toastMessage && (
        <div className={`professional-toast-banner ${toastType}`}>
          <span>{toastType === "success" ? "✓" : "⚠"}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="social-header">

        <div className="social-header-inner">

          {/* BRAND */}

          <button
            className="social-brand"
            type="button"
            onClick={() => navigate("/")}
          >
            <div className="brand-symbol">
              N
            </div>

            <div className="brand-copy">
              <strong>NoteZ</strong>
              <span>Study Social</span>
            </div>
          </button>

          {/* CENTER SEARCH */}

          <div className="top-search">

            <span className="top-search-icon">
              ⌕
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search groups, projects or hosts"
              aria-label="Search groups"
            />

            {search && (
              <button
                className="search-clear"
                type="button"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}

          </div>

          {/* HEADER ACTIONS */}

          <div className="header-actions">

           <button
  className="create-header-button"
  type="button"
  onClick={() => {
    if (!user) {
      navigate("/login");
      return;
    }

    navigate("/so");
  }}
>
  <span>＋</span>
  <b>Create</b>
</button>

            <div className="profile-area">

              {profileLoading ? (
                <div className="profile-loading">
                  ...
                </div>
              ) : user ? (
                <>
                  <button
                    className="header-profile-button"
                    type="button"
                    onClick={() =>
                      setEditingProfile(
                        !editingProfile
                      )
                    }
                  >
                    <img
                      src={getAvatar()}
                      alt="Profile"
                    />

                    <span className="profile-name">
                      {profileName ||
                        "Student"}
                    </span>

                    <span className="profile-chevron">
                      {editingProfile
                        ? "▲"
                        : "▼"}
                    </span>
                  </button>

                  {editingProfile && (
                    <div className="profile-dropdown">

                      <div className="profile-user-preview">

                        <img
                          src={getAvatar()}
                          alt="Profile"
                        />

                        <div>
                          <strong>
                            {profileName ||
                              "Student"}
                          </strong>

                          <span>
                            {user.email}
                          </span>
                        </div>

                      </div>

                      <div className="profile-divider" />

                      <label>
                        Username
                      </label>

                      <input
                        value={profileName}
                        onChange={(e) =>
                          setProfileName(
                            e.target.value
                          )
                        }
                        maxLength={40}
                        placeholder="Your username"
                      />

                      <label>
                        Profile photo URL
                      </label>

                      <input
                        value={profilePhoto}
                        onChange={(e) =>
                          setProfilePhoto(
                            e.target.value
                          )
                        }
                        placeholder="https://..."
                      />

                      <div className="profile-buttons">

                        <button
                          className="profile-save"
                          type="button"
                          onClick={saveProfile}
                          disabled={
                            savingProfile
                          }
                        >
                          {savingProfile
                            ? "Saving..."
                            : "Save profile"}
                        </button>

                        <button
                          className="profile-logout"
                          type="button"
                          onClick={logout}
                        >
                          Sign out
                        </button>

                      </div>

                    </div>
                  )}
                </>
              ) : (
                <button
                  className="header-login"
                  type="button"
                  onClick={() =>
                    navigate("/login")
                  }
                >
                  Login
                </button>
              )}

            </div>

          </div>

        </div>

      </header>


      {/* =================================================
          MAIN SOCIAL LAYOUT
      ================================================= */}

      <main className="social-main">

        {/* =================================================
            LEFT SIDEBAR
        ================================================= */}

        <aside className="left-sidebar">

          <div className="sidebar-card">

            <div className="sidebar-profile">

              <img
                src={getAvatar()}
                alt="Profile"
              />

              <div>
                <strong>
                  {profileName ||
                    "Student"}
                </strong>

                <span>
                  {user
                    ? "NoteZ Student"
                    : "Guest"}
                </span>
              </div>

            </div>

            <div className="sidebar-line" />

            <button
              className="side-link active"
              type="button"
            >
              <span>⌂</span>
              Lobby
            </button>

            <button
              className="side-link"
              type="button"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                  return;
                }

                setEditingProfile(true);
              }}
            >
              <span>◉</span>
              Profile
            </button>

            <button
              className="side-link"
              type="button"
              onClick={() => {
                if (!user) {
                  navigate("/login");
                  return;
                }

                navigate("/group");
              }}
            >
              <span>＋</span>
              Create group
            </button>

          </div>


          <div className="sidebar-info">

            <span className="sidebar-label">
              NOTEZ SOCIAL
            </span>

            <p>
              Find students, join projects
              and study together.
            </p>

          </div>

        </aside>


        {/* =================================================
            CENTER FEED
        ================================================= */}

        <section className="social-feed">

          {/* FEED INTRO */}

          <div className="feed-intro">

            <div>

              <span className="live-label">
                <i />
                LIVE LOBBY
              </span>

              <h1>
                Study together.
              </h1>

              <p>
                Discover active NoteZ groups,
                projects and student communities.
              </p>

            </div>

            <div className="live-count">

              <strong>
                {groups.length}
              </strong>

              <span>
                live groups
              </span>

            </div>

          </div>


          {/* SEARCH RESULT */}

          {search && (
            <div className="search-status">

              <span>
                Search results for
                <strong>
                  {" "}
                  "{search}"
                </strong>
              </span>

              <b>
                {filteredGroups.length}
              </b>

            </div>
          )}


          {/* LOADING */}

          {groupsLoading ? (
            <div className="feed-state">

              <div className="feed-spinner" />

              <h3>
                Loading the lobby
              </h3>

              <p>
                Connecting to NoteZ in real time...
              </p>

            </div>
          ) : filteredGroups.length === 0 ? (

            /* EMPTY */

            <div className="feed-state empty">

              <div className="empty-symbol">
                ⌕
              </div>

              <h3>
                {search
                  ? "No groups found"
                  : "No groups yet"}
              </h3>

              <p>
                {search
                  ? "Try another group name, project or host."
                  : "Create the first NoteZ study group."}
              </p>

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                >
                  Clear search
                </button>
              )}

            </div>

          ) : (

            /* GROUP FEED */

            <div className="group-feed">

              {filteredGroups.map(
                (group, index) => {

                  const memberCount =
                    Number(
                      group.memberCount || 0
                    );

                  const maxMembers =
                    Number(
                      group.maxMembers || 10
                    );

                  const isFull =
                    memberCount >=
                    maxMembers;

                  const isPrivate =
                    group.isPrivate ===
                      true ||
                    group.private === true ||
                    Boolean(group.groupPassword || group.password);

                  return (
                    <article
                      className="social-group-card"
                      key={group.id}
                      style={{
                        animationDelay:
                          `${index * 45}ms`,
                      }}
                    >

                      {/* POST HEADER */}

                      <div className="group-post-header">

                        <div className="group-owner">

                          <img
                            src={groupAvatar(
                              group
                            )}
                            alt={
                              group.groupName ||
                              "Group"
                            }
                          />

                          <div>

                            <strong>
                              {group.groupName ||
                                "Study Group"}
                            </strong>

                            <span>
                              Hosted by{" "}
                              {group.hostName ||
                                "Student"}
                            </span>

                          </div>

                        </div>

                        <button
                          className="post-menu"
                          type="button"
                          aria-label="Group options"
                        >
                          •••
                        </button>

                      </div>


                      {/* GROUP IMAGE */}

                      <button
                        className="group-cover"
                        type="button"
                        onClick={() =>
                          !isFull &&
                          openGroup(group)
                        }
                        disabled={isFull}
                      >

                        <img
                          src={groupAvatar(
                            group
                          )}
                          alt={
                            group.groupName ||
                            "Study group"
                          }
                        />

                        <div className="cover-gradient" />

                        <div className="cover-status">

                          {isPrivate ? (
                            <span className="status-private">
                              🔒 Private
                            </span>
                          ) : (
                            <span className="status-public">
                              ● Public
                            </span>
                          )}

                        </div>

                        <div className="cover-title">

                          <small>
                            NOTEZ STUDY GROUP
                          </small>

                          <h2>
                            {group.groupName ||
                              "Study Group"}
                          </h2>

                        </div>

                      </button>


                      {/* POST ACTIONS */}

                      <div className="post-actions">

                        <button
                          type="button"
                          onClick={() =>
                            !isFull &&
                            openGroup(group)
                          }
                        >
                          <span>↗</span>
                          Join
                        </button>

                        <span className="action-divider" />

                        <div className="post-member-count">
                          <span>👥</span>
                          {memberCount}/
                          {maxMembers}
                        </div>

                        <div className="post-privacy">
                          {isPrivate
                            ? "Protected"
                            : "Open"}
                        </div>

                      </div>


                      {/* CONTENT */}

                      <div className="group-post-content">

                        <div className="post-title-row">

                          <h2>
                            {group.groupName ||
                              "Unnamed Study Group"}
                          </h2>

                          <span
                            className={
                              isPrivate
                                ? "small-private"
                                : "small-public"
                            }
                          >
                            {isPrivate
                              ? "PRIVATE"
                              : "PUBLIC"}
                          </span>

                        </div>

                        <p>
                          {group.groupDescription ||
                            "A NoteZ study space for students working together."}
                        </p>

                      </div>


                      {/* FOOTER */}

                      <div className="group-post-footer">

                        <div className="host-mini">

                          <div>
                            {(group.hostName ||
                              "S")[0]
                              .toUpperCase()}
                          </div>

                          <span>
                            Hosted by{" "}
                            <strong>
                              {group.hostName ||
                                "Student"}
                            </strong>
                          </span>

                        </div>

                        <button
                          className="enter-feed-button"
                          type="button"
                          disabled={isFull}
                          onClick={() =>
                            openGroup(group)
                          }
                        >
                          {isFull
                            ? "Group Full"
                            : isPrivate
                            ? "Enter group"
                            : "View group"}

                          {!isFull && (
                            <span>
                              →
                            </span>
                          )}
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>


        {/* =================================================
            RIGHT SIDEBAR
        ================================================= */}

        <aside className="right-sidebar">

          <div className="right-card">

            <div className="right-card-title">

              <span>
                LIVE NOW
              </span>

              <i />

            </div>

            <div className="live-stat">

              <strong>
                {groups.length}
              </strong>

              <span>
                study groups
                <br />
                available
              </span>

            </div>

            <p>
              Groups update automatically when
              students create or update them.
            </p>

          </div>


          <div className="right-card">

            <div className="right-card-title">
              NOTEZ SPACE
            </div>

            <div className="space-feature">
              <span>👥</span>
              <div>
                <strong>
                  Study together
                </strong>
                <small>
                  2–10 students per group
                </small>
              </div>
            </div>

            <div className="space-feature">
              <span>🔒</span>
              <div>
                <strong>
                  Protected groups
                </strong>
                <small>
                  Host-controlled access
                </small>
              </div>
            </div>

            <div className="space-feature">
              <span>⚡</span>
              <div>
                <strong>
                  Real-time lobby
                </strong>
                <small>
                  Firebase powered
                </small>
              </div>
            </div>

          </div>


          <button
            className="right-create-button"
            type="button"
            onClick={() => {
              if (!user) {
                navigate("/login");
                return;
              }

              navigate("/group");
            }}
          >
            <span>＋</span>

            <div>
              <strong>
                Create your group
              </strong>

              <small>
                Start a new project space
              </small>
            </div>

            <b>→</b>

          </button>

        </aside>

      </main>


      {/* =================================================
          GROUP PASSWORD MODAL
      ================================================= */}

      {selectedGroup && (
        <div
          className="social-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeGroupModal();
            }
          }}
        >

          <div className="social-join-modal">

            <button
              className="social-modal-close"
              type="button"
              onClick={closeGroupModal}
              aria-label="Close"
            >
              ×
            </button>

            <img
              className="modal-group-avatar"
              src={groupAvatar(
                selectedGroup
              )}
              alt={
                selectedGroup.groupName
              }
            />

            <span className="modal-kicker">
              {selectedGroup.isPrivate || selectedGroup.private || selectedGroup.groupPassword || selectedGroup.password
                ? "PRIVATE STUDY GROUP"
                : "STUDY GROUP"}
            </span>

            <h2>
              {selectedGroup.groupName}
            </h2>

            <p className="modal-host-text">
              Hosted by{" "}
              <strong>
                {selectedGroup.hostName ||
                  "Student"}
              </strong>
            </p>

            {(selectedGroup.isPrivate || selectedGroup.private || selectedGroup.groupPassword || selectedGroup.password) ? (
              <>
                <div className="modal-password">

                  <span>🔐</span>

                  <input
                    type="password"
                    value={groupPassword}
                    onChange={(e) => {
                      setGroupPassword(
                        e.target.value
                      );

                      setPasswordError("");
                      setToastMessage("");
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter"
                      ) {
                        joinGroup();
                      }
                    }}
                    placeholder="Enter group password"
                    autoFocus
                  />

                </div>

                {passwordError && (
                  <div className="modal-error">
                    {passwordError}
                  </div>
                )}
              </>
            ) : (
              <div className="modal-public">
                <span>✓</span>
                This group is open to students.
              </div>
            )}

            <button
              className="modal-enter-button"
              type="button"
              onClick={joinGroup}
              disabled={joining}
            >
              {joining
                ? "Checking..."
                : (selectedGroup.isPrivate || selectedGroup.private || selectedGroup.groupPassword || selectedGroup.password)
                ? "Enter Study Group"
                : "Join Study Group"}

              {!joining && (
                <span>→</span>
              )}
            </button>

            {!user && (
              <p className="modal-login-note">
                You need to log in before
                entering a study group.
              </p>
            )}

          </div>

        </div>
      )}


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="social-footer">

        <strong>
          NoteZ
        </strong>

        <span>
          Study smarter. Together.
        </span>

        <small>
          © {new Date().getFullYear()} NoteZ
        </small>

      </footer>

    </div>
  );
}