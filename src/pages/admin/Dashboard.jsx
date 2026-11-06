import React, { useState, useEffect } from "react";
import { db } from "../../firebase/Firebase";
import { 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { toast } from "react-toastify";
import AdminHeader from "../../components/admins/Adminheader";
import AdminFooter from "../../components/admins/Adminfooter";

function Dashboard() {
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Search states
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, notes, activity
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // public, private

  // Real-Time Firebase Listeners (onSnapshot)
  useEffect(() => {
    setLoading(true);

    // Listen to Users Collection
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // Listen to Notes Collection
    const unsubNotes = onSnapshot(collection(db, "notes"), (snapshot) => {
      const notesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(notesList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notes:", error);
      setLoading(false);
    });

    // Listen to Activity Logs (if available)
    const unsubActivity = onSnapshot(collection(db, "activities"), (snapshot) => {
      const actList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(actList);
    }, (error) => {
      setActivities([]);
    });

    // Auto-save listener on page unload/close
    const handleBeforeUnload = (e) => {
      localStorage.setItem("notez_last_active", new Date().toISOString());
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubUsers();
      unsubNotes();
      unsubActivity();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Calculated Statistics
  const totalUsers = users.length;
  const totalNotes = notes.length;
  const publicNotes = notes.filter(n => n.isPublic || n.visibility === "public").length;
  const privateNotes = totalNotes - publicNotes;
  
  const todayStr = new Date().toDateString();
  const todaysNotes = notes.filter(n => {
    const noteDate = n.createdAt?.toDate ? n.createdAt.toDate().toDateString() : new Date(n.createdAt || Date.now()).toDateString();
    return noteDate === todayStr;
  }).length;

  const newUsersToday = users.filter(u => {
    const userDate = u.createdAt?.toDate ? u.createdAt.toDate().toDateString() : new Date(u.createdAt || Date.now()).toDateString();
    return userDate === todayStr;
  }).length;

  // Delete Handlers with Confirmation & UX
  const handleDeleteNote = async (id) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, "notes", id));
        toast.success("Note deleted successfully");
      } catch (error) {
        toast.error("Failed to delete note");
      }
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", id));
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  // Filtered lists for tables
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          note.content?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === "public") return matchesSearch && (note.isPublic || note.visibility === "public");
    if (filterType === "private") return matchesSearch && (!note.isPublic && note.visibility !== "public");
    return matchesSearch;
  });

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-dashboard-layout">
      <style>{`
        .admin-dashboard-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1e293b;
        }

        .dashboard-main-container {
          flex: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 32px 24px;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .stat-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
          color: #0f172a;
        }

        .stat-badge {
          align-self: flex-start;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          background: #ecfdf5;
          color: #059669;
        }

        /* Navigation Tabs */
        .dash-nav-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
          padding-bottom: 0;
        }

        .dash-tab-btn {
          background: none;
          border: none;
          padding: 10px 16px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .dash-tab-btn.active {
          color: #059669;
          border-bottom-color: #059669;
        }

        /* Content Sections & Tables */
        .dash-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .section-header-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        .search-filter-wrapper {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dash-search-input, .dash-filter-select {
          padding: 8px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.9rem;
          outline: none;
          background: #fff;
          color: #0f172a;
        }

        .dash-search-input:focus, .dash-filter-select:focus {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        /* Table Styling */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .clean-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }

        .clean-table th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .clean-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }

        .clean-table tr:hover td {
          background: #f8fafc;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.public {
          background: #ecfdf5;
          color: #059669;
        }

        .status-badge.private {
          background: #fef3c7;
          color: #d97706;
        }

        .btn-action-danger {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-action-danger:hover {
          background: #fecaca;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
          font-size: 0.95rem;
        }

        /* Skeleton Loading */
        .skeleton-loader {
          height: 40px;
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <AdminHeader />

      <main className="dashboard-main-container">
        {/* Statistics Cards Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">{totalUsers}</span>
            <span className="stat-badge">+{newUsersToday} today</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Notes</span>
            <span className="stat-value">{totalNotes}</span>
            <span className="stat-badge">+{todaysNotes} today</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Public Notes</span>
            <span className="stat-value">{publicNotes}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Private Notes</span>
            <span className="stat-value">{privateNotes}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dash-nav-tabs">
          <button 
            className={`dash-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview & Activity
          </button>
          <button 
            className={`dash-tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            Users Management
          </button>
          <button 
            className={`dash-tab-btn ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            Notes Management
          </button>
        </div>

        {/* Tab Content 1: Overview */}
        {activeTab === "overview" && (
          <div className="dash-section">
            <h3 className="section-title" style={{ marginBottom: "16px" }}>Recent Activity Stream</h3>
            {activities.length === 0 ? (
              <div className="empty-state">No recent activities recorded in real time.</div>
            ) : (
              <div className="table-responsive">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Activity Type</th>
                      <th>Details</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act) => (
                      <tr key={act.id}>
                        <td><strong>{act.type || "Action"}</strong></td>
                        <td>{act.description || act.details || "System event"}</td>
                        <td>{act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString() : "Just now"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Users Table */}
        {activeTab === "users" && (
          <div className="dash-section">
            <div className="section-header-row">
              <h3 className="section-title">Users List</h3>
              <div className="search-filter-wrapper">
                <input 
                  type="text" 
                  className="dash-search-input" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div>
                <div className="skeleton-loader"></div>
                <div className="skeleton-loader"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">No users found.</div>
            ) : (
              <div className="table-responsive">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.username || user.email?.split("@")[0]}</strong></td>
                        <td>{user.email}</td>
                        <td>{user.role || "user"}</td>
                        <td>
                          <span className="status-badge public">Active</span>
                        </td>
                        <td>
                          <button 
                            className="btn-action-danger"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Notes Table */}
        {activeTab === "notes" && (
          <div className="dash-section">
            <div className="section-header-row">
              <h3 className="section-title">Notes List</h3>
              <div className="search-filter-wrapper">
                <input 
                  type="text" 
                  className="dash-search-input" 
                  placeholder="Search notes..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                  className="dash-filter-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Notes</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div>
                <div className="skeleton-loader"></div>
                <div className="skeleton-loader"></div>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state">No notes found.</div>
            ) : (
              <div className="table-responsive">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Visibility</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotes.map((note) => {
                      const isPub = note.isPublic || note.visibility === "public";
                      return (
                        <tr key={note.id}>
                          <td><strong>{note.title || "Untitled Note"}</strong></td>
                          <td>{note.category || "General"}</td>
                          <td>
                            <span className={`status-badge ${isPub ? "public" : "private"}`}>
                              {isPub ? "Public" : "Private"}
                            </span>
                          </td>
                          <td>{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : "Recent"}</td>
                          <td>
                            <button 
                              className="btn-action-danger"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <AdminFooter />
    </div>
  );
}

export default Dashboard;