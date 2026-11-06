import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Join = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'New Feature',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="join-page-wrapper">
      <style>{`
        :root {
          --primary: #2e7d32;
          --primary-dark: #1b5e20;
          --secondary: #4caf50;
          --accent: #81c784;
          --bg: #f4f9f4;
          --bg-alt: #e8f5e9;
          --card-bg: #ffffff;
          --card-border: #c8e6c9;
          --text-main: #263238;
          --text-muted: #546e7a;
          --radius: 8px;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
          --transition: all 0.2s ease;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .join-page-wrapper {
          background-color: var(--bg);
          color: var(--text-main);
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.6;
          width: 100%;
          min-height: 100vh;
          padding-bottom: 80px;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Hero / Header Section */
        .join-hero {
          padding: 80px 0 50px 0;
          text-align: center;
          background-color: var(--bg-alt);
          border-bottom: 1px solid var(--card-border);
          margin-bottom: 50px;
        }

        .section-tag {
          display: inline-block;
          padding: 4px 12px;
          background: var(--card-bg);
          border: 1px solid var(--accent);
          color: var(--primary-dark);
          border-radius: var(--radius);
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 15px;
        }

        .join-title {
          font-size: 2.8rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 15px;
        }

        .join-subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          max-width: 650px;
          margin: 0 auto;
        }

        /* Content Blocks */
        .content-section {
          margin-bottom: 50px;
        }

        .card-box {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 35px;
        }

        .box-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 15px;
          text-align: center;
        }

        .box-desc {
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 25px;
          font-size: 1.05rem;
        }

        /* Ways to Contribute Grid */
        .contribute-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 50px;
        }

        .contribute-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          padding: 24px;
          text-align: center;
          box-shadow: var(--shadow);
        }

        .contribute-icon {
          font-size: 2rem;
          margin-bottom: 10px;
        }

        .contribute-item-title {
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 6px;
        }

        .contribute-item-desc {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        /* Suggestion Form */
        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 8px;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          font-size: 1rem;
          color: var(--text-main);
          background: var(--bg);
          outline: none;
          transition: var(--transition);
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--secondary);
          background: #ffffff;
        }

        .form-textarea {
          resize: vertical;
          min-height: 120px;
        }

        .submit-btn {
          width: 100%;
          background: var(--primary);
          color: #ffffff;
          border: none;
          padding: 14px;
          font-size: 1rem;
          font-weight: bold;
          border-radius: var(--radius);
          cursor: pointer;
          transition: var(--transition);
        }

        .submit-btn:hover {
          background: var(--primary-dark);
        }

        .success-message {
          text-align: center;
          padding: 20px;
          background: var(--bg-alt);
          border: 1px solid var(--accent);
          border-radius: var(--radius);
          color: var(--primary-dark);
          font-weight: bold;
        }

        /* Support Section Wrapper Styling */
        .support-vision-section {
          margin-top: 60px;
          padding: 40px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          text-align: center;
        }

        .support-vision-title {
          font-size: 2rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 15px;
        }

        .support-vision-text {
          color: var(--text-muted);
          font-size: 1.05rem;
          line-height: 1.6;
          margin-bottom: 16px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .support-disclaimer {
          font-size: 0.95rem;
          color: var(--primary-dark);
          font-weight: bold;
          background: var(--bg-alt);
          border: 1px solid var(--accent);
          padding: 14px 20px;
          border-radius: var(--radius);
          max-width: 700px;
          margin: 0 auto 24px auto;
        }

        .donate-nav-btn {
          display: inline-block;
          background: var(--primary);
          color: #ffffff;
          padding: 14px 32px;
          font-size: 1.05rem;
          font-weight: bold;
          border-radius: var(--radius);
          text-decoration: none;
          transition: var(--transition);
          box-shadow: 0 2px 4px rgba(46, 125, 50, 0.2);
        }

        .donate-nav-btn:hover {
          background: var(--primary-dark);
        }

        /* Footer Branding */
        .page-footer-brand {
          text-align: center;
          margin-top: 60px;
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--primary-dark);
        }

        @media (max-width: 768px) {
          .join-title { font-size: 2.2rem; }
        }
      `}</style>

      {/* Join NICO Introduction Hero */}
      <section className="join-hero">
        <div className="container">
          <span className="section-tag">Community & Collaboration</span>
          <h1 className="join-title">Join NICO</h1>
          <p className="join-subtitle">
            NICO believes great companies are built by great people. Help us shape the future of productivity tools and digital ecosystems.
          </p>
        </div>
      </section>

      <div className="container">
        {/* Why Join & Ways to Contribute */}
        <section className="content-section">
          <div className="card-box" style={{ marginBottom: '30px', textAlign: 'center' }}>
            <h2 className="box-title" style={{ marginBottom: '10px' }}>Why Join Us?</h2>
            <p className="box-desc" style={{ marginBottom: '0' }}>
              People can support NICO by joining our community, sharing creative ideas, giving valuable suggestions, helping improve existing products, and supporting the overall development of the project.
            </p>
          </div>

          <div className="contribute-grid">
            <div className="contribute-card">
              <div className="contribute-icon">🤝</div>
              <h3 className="contribute-item-title">Joining</h3>
              <p className="contribute-item-desc">Be part of our core movement and vision.</p>
            </div>
            <div className="contribute-card">
              <div className="contribute-icon">💡</div>
              <h3 className="contribute-item-title">Sharing Ideas</h3>
              <p className="contribute-item-desc">Contribute thoughts that spark genuine innovation.</p>
            </div>
            <div className="contribute-card">
              <div className="contribute-icon">🛠️</div>
              <h3 className="contribute-item-title">Improving Tools</h3>
              <p className="contribute-item-desc">Help us refine products for daily student and worker utility.</p>
            </div>
          </div>
        </section>

        {/* Suggestion / Idea Form Section */}
        <section className="content-section">
          <div className="card-box">
            <h2 className="box-title">Share Your Ideas & Suggestions</h2>
            <p className="box-desc">
              Have a concept in mind? Let us know what you want NICO to build next. You can suggest new features, tools, product upgrades, or specific problems you want solved.
            </p>

            {submitted ? (
              <div className="success-message">
                Thank you for sharing your feedback with NICO! Your idea has been noted. ❤️
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Suggestion Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="New Feature">New Feature</option>
                    <option value="New Tool">New Tool</option>
                    <option value="Product Improvement">Product Improvement</option>
                    <option value="Company Idea">Company Idea</option>
                    <option value="Problem to Solve">Problem to Solve</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Message / Idea</label>
                  <textarea
                    name="message"
                    required
                    placeholder="Describe your suggestion or idea in detail..."
                    value={formData.message}
                    onChange={handleChange}
                    className="form-textarea"
                  />
                </div>

                <button type="submit" className="submit-btn">
                  Submit Suggestion
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Support the Vision Section with a Button linking to /do */}
        <section className="support-vision-section">
          <h2 className="support-vision-title">Support the Vision</h2>
          <p className="support-vision-text">
            Not everyone can contribute by joining the team or building something. If you believe in what we are building, you can also support the project financially.
          </p>
          <p className="support-vision-text" style={{ fontStyle: 'italic' }}>
            "Without your support, this version of NoteZ may never reach the bigger vision we have for it."
          </p>

          <div className="support-disclaimer">
            Donations are completely voluntary. Your support helps us continue developing and improving our tools.
          </div>

          <Link to="/do" className="donate-nav-btn">
            Support NoteZ ❤️
          </Link>
        </section>

        {/* Closing Branding Footer */}
        <div className="page-footer-brand">
          NICO — Victory of Employees
        </div>
      </div>
    </div>
  );
};

export default Join;