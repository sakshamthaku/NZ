import React from "react";
import { Link } from "react-router-dom";

function AdminFooter() {
  return (
    <footer className="admin-footer">
      <style>{`
        .admin-footer {
          width: 100%;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 24px 32px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #64748b;
          margin-top: auto;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 768px) {
          .footer-content {
            flex-direction: row;
          }
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: center;
          justify-content: center;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-links a {
          color: #475569;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: #10b981;
        }

        .footer-dash-btn {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .footer-dash-btn:hover {
          background: #d1fae5;
        }

        .footer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding-top: 16px;
          border-top: 1px solid #f1f5f9;
          font-size: 0.8rem;
          color: #94a3b8;
        }
      `}</style>

      <div className="footer-content">
        <ul className="footer-links">
          <li><Link to="/dashboard" className="footer-dash-btn">Dashboard</Link></li>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/contact">Contact</Link></li>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/terms">Terms</Link></li>
          <li><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></li>
        </ul>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} NoteZ Inc. All rights reserved.</span>
        <span>Built with Notion & Apple Fluent standards</span>
      </div>
    </footer>
  );
}

export default AdminFooter;