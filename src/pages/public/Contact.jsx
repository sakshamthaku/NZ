import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/Firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore";

export default function Feedback() {
  const { currentUser } = useAuth();
  
  // Form States
  const [feedbackType, setFeedbackType] = useState('General Feedback');
  const [rating, setRating] = useState(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  // History / Filtering States
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Real-time listener for user's past feedback submissions
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoadingHistory(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'feedback'),
        where('userId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          setUserFeedbacks(list);
          setLoadingHistory(false);
        },
        (err) => {
          console.error('Error fetching feedback history:', err);
          setLoadingHistory(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error initializing feedback subscription:', err);
      setLoadingHistory(false);
    }
  }, [currentUser?.uid]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser?.uid) {
      setError('Please enter your feedback message.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Generate unique feedback reference ID (e.g., NZ-FB-84K2M)
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const feedbackRefId = `NZ-FB-${randomChars}`;

    try {
      await addDoc(collection(db, 'feedback'), {
        userId: currentUser.uid,
        contactId: feedbackRefId,
        type: feedbackType,
        subject: subject.trim() || 'Untitled Feedback',
        message: message.trim(),
        rating: rating || null,
        anonymous: isAnonymous,
        status: 'New',
        createdAt: serverTimestamp(),
      });

      setSuccessData(feedbackRefId);
      // Reset sensitive/input fields
      setMessage('');
      setSubject('');
      setRating(0);
      setIsAnonymous(false);
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to send feedback. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  // Filter and sort user feedback history
  const filteredHistory = userFeedbacks.filter((item) => {
    if (filterCategory === 'ideas' && item.type !== 'Suggest an Idea' && item.type !== 'Request a Feature') return false;
    if (filterCategory === 'problems' && item.type !== 'Report a Problem' && item.type !== 'Performance Issue') return false;
    if (filterCategory === 'features' && item.type !== 'Request a Feature') return false;
    if (filterCategory === 'other' && !['General Feedback', 'UI / Design Feedback', 'Other'].includes(item.type)) return false;
    return true;
  }).sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    if (sortBy === 'oldest') {
      return timeA - timeB;
    }
    return timeB - timeA; // newest default
  });

  const feedbackTypes = [
    { label: 'General Feedback', icon: '💬' },
    { label: 'Suggest an Idea', icon: '💡' },
    { label: 'Report a Problem', icon: '🐛' },
    { label: 'Request a Feature', icon: '✨' },
    { label: 'UI / Design Feedback', icon: '🎨' },
    { label: 'Performance Issue', icon: '⚡' },
    { label: 'Other', icon: '📌' }
  ];

  return (
    <div className="feedback-page-wrapper">
      <style>{`
        .feedback-page-wrapper {
          background-color: #f4f7f5;
          color: #2b3a32;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          padding: 30px 20px;
          display: flex;
          justify-content: center;
        }
        .feedback-container {
          max-width: 1100px;
          width: 100%;
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feedback-header {
          background: #ffffff;
          padding: 24px 30px;
          border-radius: 14px;
          border: 1px solid #d4e2dc;
          margin-bottom: 25px;
          box-shadow: 0 4px 12px rgba(45, 106, 79, 0.04);
        }
        .feedback-header h1 {
          font-size: 1.6rem;
          color: #1b382b;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .feedback-header p {
          color: #5a7a6b;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .error-banner {
          background: #fdf2f2;
          color: #d9534f;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #f5c6cb;
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .feedback-layout-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .feedback-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .card-panel {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(45, 106, 79, 0.03);
        }
        .card-panel h2 {
          font-size: 1.15rem;
          color: #1b382b;
          font-weight: 700;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #2b3a32;
          margin-bottom: 10px;
          display: block;
        }
        .type-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          margin-bottom: 20px;
        }
        .type-pill {
          background: #f4f7f5;
          border: 1px solid #d4e2dc;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.82rem;
          color: #2b3a32;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .type-pill:hover {
          background: #eaf3ee;
        }
        .type-pill.selected {
          background: #2d6a4f;
          color: #ffffff;
          border-color: #2d6a4f;
        }
        .rating-stars {
          display: flex;
          gap: 6px;
          font-size: 1.4rem;
          cursor: pointer;
          margin-bottom: 20px;
        }
        .star {
          color: #cbdad2;
          transition: color 0.15s;
        }
        .star.active {
          color: #f0ad4e;
        }
        .input-group {
          margin-bottom: 18px;
        }
        .input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #2b3a32;
          margin-bottom: 6px;
        }
        .input-group input, .input-group textarea {
          width: 100%;
          padding: 10px 14px;
          background: #ffffff;
          border: 1px solid #d4e2dc;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9rem;
          color: #2b3a32;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-group input:focus, .input-group textarea:focus {
          border-color: #2d6a4f;
        }
        .input-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        .readonly-box {
          background: #f8faf9;
          border: 1px dashed #d4e2dc;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #6b8a7a;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          font-size: 0.88rem;
          color: #2b3a32;
          cursor: pointer;
        }
        .privacy-notice {
          font-size: 0.78rem;
          color: #6b8a7a;
          background: #eaf3ee;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 20px;
          line-height: 1.4;
        }
        .submit-btn {
          background: #2d6a4f;
          color: #ffffff;
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s;
          box-shadow: 0 2px 6px rgba(45, 106, 79, 0.2);
        }
        .submit-btn:hover:not(:disabled) {
          background: #224d38;
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        /* Success box */
        .success-box {
          background: #eaf3ee;
          border: 1px solid #bce1ce;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        .success-box h3 {
          color: #1b382b;
          font-size: 1.1rem;
          margin-bottom: 6px;
        }
        .success-box p {
          color: #5a7a6b;
          font-size: 0.88rem;
          margin-bottom: 12px;
        }
        .ref-id-badge {
          background: #ffffff;
          border: 1px solid #d4e2dc;
          padding: 4px 10px;
          border-radius: 6px;
          font-family: monospace;
          font-weight: bold;
          color: #2d6a4f;
          display: inline-block;
          margin-top: 4px;
        }
        .new-feedback-btn {
          background: #2d6a4f;
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }
        /* History Section */
        .history-controls {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        .history-controls select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #d4e2dc;
          background: #ffffff;
          font-size: 0.8rem;
          color: #2b3a32;
          outline: none;
        }
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .history-item {
          background: #f8faf9;
          border: 1px solid #d4e2dc;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .history-item-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }
        .history-item h4 {
          font-size: 0.95rem;
          color: #1b382b;
          font-weight: 600;
        }
        .status-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          background: #eaf3ee;
          color: #2d6a4f;
          border: 1px solid #bce1ce;
        }
        .history-meta {
          font-size: 0.78rem;
          color: #6b8a7a;
          display: flex;
          justify-content: space-between;
        }
        .empty-history {
          text-align: center;
          padding: 40px 20px;
          color: #6b8a7a;
          font-size: 0.88rem;
          border: 1px dashed #d4e2dc;
          border-radius: 10px;
          background: #f8faf9;
        }
        .empty-history-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="feedback-container">
        {/* Page Header */}
        <div className="feedback-header">
          <h1>Feedback</h1>
          <p>
            Your feedback helps make NoteZ better. Tell us what you like, what isn't working, or what you would like to see next.
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="feedback-layout-grid">
          {/* Left Column: Form / Success Box */}
          <div className="card-panel">
            {successData ? (
              <div className="success-box">
                <h3>✓ Feedback received!</h3>
                <p>Thank you for helping improve NoteZ. Your feedback has been successfully submitted.</p>
                <div style={{ fontSize: '0.82rem', color: '#5a7a6b' }}>Feedback ID:</div>
                <div className="ref-id-badge">{successData}</div>
                <div>
                  <button className="new-feedback-btn" onClick={() => setSuccessData(null)}>
                    Submit Another Feedback
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label className="form-section-title">What would you like to tell us?</label>
                <div className="type-options-grid">
                  {feedbackTypes.map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      className={`type-pill ${feedbackType === item.label ? 'selected' : ''}`}
                      onClick={() => setFeedbackType(item.label)}
                    >
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}
                </div>

                <label className="form-section-title">How would you rate your NoteZ experience? (Optional)</label>
                <div className="rating-stars">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <span
                      key={starVal}
                      className={`star ${rating >= starVal ? 'active' : ''}`}
                      onClick={() => setRating(starVal)}
                      title={`${starVal} star`}
                    >
                      ★
                    </span>
                  ))}
                </div>

                <div className="input-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    placeholder="Short title for your feedback (e.g., Please add dark mode)"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Message *</label>
                  <textarea
                    placeholder="What should we improve? What feature would you like? What problem did you experience?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                {/* Profile Information Preview (Automatic, no UID or home address exposure) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Name</label>
                    <div className="readonly-box">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'NoteZ User'}
                    </div>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>NoteZ ID</label>
                    <div className="readonly-box">
                      {currentUser?.uid ? `NZ-${currentUser.uid.substring(0, 6).toUpperCase()}` : 'NZ-USER'}
                    </div>
                  </div>
                </div>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Send anonymously (Don't display your name in management logs)
                </label>

                <div className="privacy-notice">
                  🔒 <strong>Your privacy matters.</strong> Please don't include passwords, payment information, or other sensitive personal information in your feedback.
                </div>

                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: User Feedback History */}
          <div className="card-panel">
            <h2>💬 My Feedback</h2>

            <div className="history-controls">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All Feedback</option>
                <option value="ideas">Ideas & Features</option>
                <option value="problems">Bugs & Issues</option>
                <option value="other">General / Other</option>
              </select>

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {loadingHistory ? (
              <div className="empty-history">Loading your history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty-history">
                <div className="empty-history-icon">💬</div>
                <h3 style={{ color: '#1b382b', fontSize: '1rem', marginBottom: '4px' }}>No feedback submitted yet.</h3>
                <p>Have an idea or found something that needs improvement? Share your first feedback.</p>
              </div>
            ) : (
              <div className="history-list">
                {filteredHistory.map((item) => (
                  <div className="history-item" key={item.id}>
                    <div className="history-item-top">
                      <h4>{item.subject}</h4>
                      <span className="status-badge">Status: {item.status || 'New'}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#5a7a6b', lineHeight: '1.3' }}>
                      {item.message.length > 90 ? item.message.substring(0, 90) + '...' : item.message}
                    </p>
                    <div className="history-meta">
                      <span>{item.type}</span>
                      <span>
                        {item.createdAt?.toMillis
                          ? new Date(item.createdAt.toMillis()).toLocaleDateString()
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}