import React, { useState, useEffect } from "react";
import { db } from "../../firebase/Firebase";
import { collection, onSnapshot } from "firebase/firestore";
import AdminHeader from "../../components/admins/Adminheader";
import AdminFooter from "../../components/admins/Adminfooter";

function AdminHome() {
  const [stats, setStats] = useState({ users: 0, notes: 0, publicNotes: 0 });

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setStats(prev => ({ ...prev, users: snap.size }));
    });
    const unsubNotes = onSnapshot(collection(db, "notes"), (snap) => {
      const notes = snap.docs.map(d => d.data());
      const pubCount = notes.filter(n => n.isPublic || n.visibility === "public").length;
      setStats(prev => ({ ...prev, notes: snap.size, publicNotes: pubCount }));
    });

    return () => {
      unsubUsers();
      unsubNotes();
    };
  }, []);

  return (
    <div className="admin-home-layout">
      <style>{`
        .admin-home-layout {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .admin-hero {
          flex: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .hero-welcome-card {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1px solid #a7f3d0;
          border-radius: 20px;
          padding: 40px;
          color: #065f46;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.05);
        }

        .hero-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .hero-subtitle {
          font-size: 1.05rem;
          opacity: 0.85;
          max-width: 600px;
          line-height: 1.5;
        }

        .quick-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .metric-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }

        .metric-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 8px;
        }

        .metric-number {
          font-size: 2rem;
          font-weight: 700;
          color: #0f172a;
        }
      `}</style>

      <AdminHeader />

      <div className="admin-hero">
        <div className="hero-welcome-card">
          <h1 className="hero-title">Welcome to NoteZ Admin Hub</h1>
          <p className="hero-subtitle">
            Manage your application users, monitor real-time note creation, and oversee system analytics with our Notion & Apple-inspired productivity interface.
          </p>
        </div>

        <div className="quick-metrics-grid">
          <div className="metric-box">
            <div className="metric-title">Active Platform Users</div>
            <div className="metric-number">{stats.users}</div>
          </div>
          <div className="metric-box">
            <div className="metric-title">Total Notes Created</div>
            <div className="metric-number">{stats.notes}</div>
          </div>
          <div className="metric-box">
            <div className="metric-title">Publicly Shared Notes</div>
            <div className="metric-number">{stats.publicNotes}</div>
          </div>
        </div>
      </div>

      <AdminFooter />
    </div>
  );
}

export default AdminHome;