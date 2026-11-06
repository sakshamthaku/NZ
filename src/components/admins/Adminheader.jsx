import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase/Firebase";
import { signOut } from "firebase/auth";
import { toast } from "react-toastify";

function AdminHeader() {
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Live time & date ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      // Trigger any pre-logout save logic if needed here
      await signOut(auth);
      localStorage.clear();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="admin-header">
      <style>{`
        .admin-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1e293b;
          transition: all 0.3s ease;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }

        .brand-logo-box {
          width: 36px;
          height: 36px;
          background: #10b981;
          color: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        }

        .brand-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.3px;
        }

        .header-datetime {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 0.85rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }

        .header-datetime span {
          font-weight: 600;
          color: #334155;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-dashboard-btn {
          display: inline-flex;
          align-items: center;
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #10b981;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .admin-dashboard-btn:hover {
          background: #d1fae5;
        }

        .admin-profile-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px 4px 4px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
        }

        .admin-avatar {
          width: 28px;
          height: 28px;
          background: #059669;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .admin-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
        }

        .btn-logout-clean {
          background: #fee2e2;
          color: #dc2626;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-logout-clean:hover {
          background: #fecaca;
        }

        @media (max-width: 768px) {
          .header-datetime {
            display: none;
          }
          .admin-header {
            padding: 12px 16px;
          }
        }
      `}</style>

      <Link to="/dashboard" className="admin-brand">
        <div className="brand-logo-box">N</div>
        <span className="brand-title">NoteZ Admin</span>
      </Link>

      <div className="header-datetime">
        <div>📅 <span>{formattedDate}</span></div>
        <div>⏰ <span>{formattedTime}</span></div>
      </div>

      <div className="header-right">
        <Link to="/dash" className="admin-dashboard-btn">
          Dashboard
        </Link>

        <div className="admin-profile-pill">
          <div className="admin-avatar">A</div>
          <span className="admin-name">Admin</span>
        </div>

        <button className="btn-logout-clean" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;