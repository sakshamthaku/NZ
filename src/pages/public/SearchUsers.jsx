import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchUsersByTerm } from "../firebase/userModel";
import { getOrCreateChatId } from "../firebase/chatModel";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import OnlineStatus from "../components/OnlineStatus";
import { FaSearch, FaComment, FaUserAstronaut, FaUserSlash } from "react-icons/fa";

const SearchUsers = () => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const { currentUser } = useAuth();
  const { selectChat } = useChat();
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!term.trim()) return;
    const users = await searchUsersByTerm(term);
    setResults(users.filter((u) => u.uid !== currentUser?.uid));
    setSearched(true);
  };

  const handleStartChat = async (user) => {
    if (!currentUser) return;
    const chatId = await getOrCreateChatId(currentUser.uid, user.uid);
    selectChat(chatId, user);
    navigate("/chat");
  };

  return (
    <div className="su-futuristic-wrapper">
      <style>{`
        /* ============================================================
           FUTURISTIC CYBER-UI INTERNAL STYLES
           ============================================================ */
        :root {
          --su-bg: #090D16;
          --su-card-bg: rgba(15, 23, 42, 0.65);
          --su-border: rgba(56, 189, 248, 0.2);
          --su-border-glow: rgba(56, 189, 248, 0.6);
          --su-neon-cyan: #38BDF8;
          --su-neon-purple: #A855F7;
          --su-neon-pink: #EC4899;
          --su-text-primary: #F8FAFC;
          --su-text-secondary: #94A3B8;
          --su-glass-backdrop: blur(16px);
          --su-font: 'Inter', system-ui, -apple-system, sans-serif;
          --su-transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .su-futuristic-wrapper {
          min-height: 100vh;
          background: var(--su-bg);
          color: var(--su-text-primary);
          font-family: var(--su-font);
          padding: 2.5rem 1rem;
          position: relative;
          overflow: hidden;
        }

        /* Dynamic Radial Background Orbs */
        .su-orb-1 {
          position: absolute;
          top: -10%;
          left: 15%;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
          animation: suFloatOrb 12s infinite alternate ease-in-out;
        }

        .su-orb-2 {
          position: absolute;
          bottom: -10%;
          right: 15%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          animation: suFloatOrb 15s infinite alternate-reverse ease-in-out;
        }

        .su-container {
          max-width: 820px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Header & Glass Card */
        .su-glass-card {
          background: var(--su-card-bg);
          backdrop-filter: var(--su-glass-backdrop);
          -webkit-backdrop-filter: var(--su-glass-backdrop);
          border: 1px solid var(--su-border);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          transition: var(--su-transition);
          position: relative;
          overflow: hidden;
        }

        .su-glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--su-neon-cyan), var(--su-neon-purple), transparent);
        }

        .su-header-title {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #FFFFFF 0%, var(--su-neon-cyan) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        /* Futuristic Form Input */
        .su-search-form {
          display: flex;
          gap: 0.75rem;
        }

        .su-input-wrapper {
          position: relative;
          flex: 1;
        }

        .su-input {
          width: 100%;
          background: rgba(2, 6, 23, 0.6);
          border: 1px solid var(--su-border);
          color: var(--su-text-primary);
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          transition: var(--su-transition);
        }

        .su-input::placeholder {
          color: var(--su-text-secondary);
        }

        .su-input:focus {
          border-color: var(--su-neon-cyan);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
          background: rgba(2, 6, 23, 0.85);
        }

        /* Neon Primary Button */
        .su-btn-primary {
          background: linear-gradient(135deg, var(--su-neon-cyan) 0%, #0284C7 100%);
          border: none;
          color: #0F172A;
          font-weight: 700;
          padding: 0.85rem 1.75rem;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          transition: var(--su-transition);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
          white-space: nowrap;
        }

        .su-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.5);
          filter: brightness(1.1);
        }

        /* Results List Area */
        .su-results-container {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Individual User Card */
        .su-user-card {
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: var(--su-glass-backdrop);
          -webkit-backdrop-filter: var(--su-glass-backdrop);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: var(--su-transition);
          animation: suSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .su-user-card:hover {
          background: rgba(15, 23, 42, 0.75);
          border-color: var(--su-border-glow);
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.15);
        }

        .su-user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Avatar Container with Glow Ring */
        .su-avatar-wrapper {
          position: relative;
        }

        .su-avatar {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--su-neon-purple);
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
          transition: var(--su-transition);
        }

        .su-user-card:hover .su-avatar {
          border-color: var(--su-neon-cyan);
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.5);
        }

        .su-details {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .su-username {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--su-text-primary);
        }

        .su-email {
          color: var(--su-text-secondary);
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }

        /* Outlined Action Button */
        .su-btn-message {
          background: rgba(56, 189, 248, 0.05);
          border: 1px solid var(--su-neon-cyan);
          color: var(--su-neon-cyan);
          font-weight: 600;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.88rem;
          transition: var(--su-transition);
        }

        .su-btn-message:hover {
          background: var(--su-neon-cyan);
          color: #0F172A;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
          transform: translateY(-1px);
        }

        /* Empty State Styling */
        .su-empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
          background: rgba(15, 23, 42, 0.3);
          border: 1px dashed var(--su-border);
          border-radius: 16px;
          color: var(--su-text-secondary);
          margin-top: 1.5rem;
          animation: suFadeIn 0.3s ease-out;
        }

        .su-empty-icon {
          font-size: 2.5rem;
          color: var(--su-text-secondary);
          margin-bottom: 0.75rem;
          opacity: 0.6;
        }

        /* Keyframe Animations */
        @keyframes suFloatOrb {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 40px); }
        }

        @keyframes suSlideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes suFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive Design */
        @media (max-width: 600px) {
          .su-search-form {
            flex-direction: column;
          }
          .su-btn-primary {
            justify-content: center;
            width: 100%;
          }
          .su-user-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          .su-btn-message {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* Futuristic Background Blur Elements */}
      <div className="su-orb-1"></div>
      <div className="su-orb-2"></div>

      <div className="su-container">
        {/* Search Header Card */}
        <div className="su-glass-card">
          <h2 className="su-header-title">
            <FaUserAstronaut style={{ color: "var(--su-neon-cyan)" }} /> Find NoteZ Users
          </h2>
          <form onSubmit={handleSearch} className="su-search-form">
            <div className="su-input-wrapper">
              <input
                type="text"
                className="su-input"
                placeholder="Search username or email..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="su-btn-primary">
              <FaSearch /> Search
            </button>
          </form>
        </div>

        {/* Empty Search Result State */}
        {searched && results.length === 0 && (
          <div className="su-empty-state">
            <FaUserSlash className="su-empty-icon" />
            <p className="mb-0">No users found matching "{term}".</p>
          </div>
        )}

        {/* User Search Results List */}
        <div className="su-results-container">
          {results.map((user) => (
            <div key={user.uid} className="su-user-card">
              <div className="su-user-info">
                <div className="su-avatar-wrapper">
                  <img
                    src={user.photoURL || "https://via.placeholder.com/50"}
                    alt={user.username}
                    className="su-avatar"
                  />
                </div>
                <div className="su-details">
                  <h3 className="su-username">{user.username}</h3>
                  <span className="su-email">{user.email}</span>
                  <OnlineStatus isOnline={user.online} lastSeen={user.lastSeen} />
                </div>
              </div>
              <button className="su-btn-message" onClick={() => handleStartChat(user)}>
                <FaComment /> Message
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchUsers;