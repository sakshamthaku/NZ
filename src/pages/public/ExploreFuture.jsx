import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaRocket, FaBrain, FaNetworkWired, FaShieldAlt, FaLightbulb, FaCheckCircle } from "react-icons/fa";

function ExploreFuture() {
  const navigate = useNavigate();

  const roadmapMilestones = [
    {
      quarter: "Q1 2026",
      title: "Advanced AI Summarization",
      description: "Intelligent note parsing, automated meeting transcript summaries, and contextual query search.",
      status: "In Progress",
      icon: FaBrain
    },
    {
      quarter: "Q2 2026",
      title: "Real-time Peer Workspaces",
      description: "Live collaborative editing for documents, shared whiteboards, and synchronized calendar planning.",
      status: "Upcoming",
      icon: FaNetworkWired
    },
    {
      quarter: "Q3 2026",
      title: "End-to-End Privacy & Sync",
      description: "Enhanced client-side encryption protocols and lightning-fast offline-first local database sync.",
      status: "Planned",
      icon: FaShieldAlt
    },
    {
      quarter: "Q4 2026 & Beyond",
      title: "Ecosystem Open APIs",
      description: "Developer extensions, third-party plugin marketplace, and custom automated workflow integrations.",
      status: "Vision",
      icon: FaRocket
    }
  ];

  return (
    <div className="explore-future-wrapper">
      <style>{`
        :root {
          --nz-bg: #F6FAF7;
          --nz-card-bg: rgba(255, 255, 255, 0.92);
          --nz-text-primary: #111827;
          --nz-text-secondary: #6B7280;
          --nz-border: #E5E7EB;
          --nz-accent: #10B981;
          --nz-accent-light: #DCFCE7;
          --nz-radius: 12px;
          --nz-transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .explore-future-wrapper {
          min-height: calc(100vh - 70px);
          background: var(--nz-bg);
          color: var(--nz-text-primary);
          font-family: 'Inter', 'Poppins', system-ui, sans-serif;
          padding: 3rem 1.5rem;
          display: flex;
          justify-content: center;
        }

        .explore-future-container {
          max-width: 900px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }

        .explore-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--nz-card-bg);
          border: 1px solid var(--nz-border);
          color: var(--nz-text-primary);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          width: fit-content;
          transition: var(--nz-transition);
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }

        .explore-back-btn:hover {
          border-color: var(--nz-accent);
          color: var(--nz-accent);
        }

        /* Hero Section */
        .explore-hero {
          text-align: center;
          padding: 2rem 1rem;
          background: var(--nz-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--nz-border);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        .explore-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--nz-accent-light);
          color: var(--nz-accent);
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 1rem;
        }

        .explore-hero h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          letter-spacing: -0.5px;
        }

        .explore-hero p {
          color: var(--nz-text-secondary);
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Roadmap Grid */
        .explore-roadmap-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.25rem;
        }

        .explore-roadmap-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .explore-card {
          background: var(--nz-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--nz-border);
          border-radius: var(--nz-radius);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          transition: var(--nz-transition);
        }

        .explore-card:hover {
          transform: translateY(-2px);
          border-color: var(--nz-accent);
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.08);
        }

        .explore-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .explore-card-icon {
          font-size: 1.25rem;
          color: var(--nz-accent);
          background: var(--nz-accent-light);
          padding: 10px;
          border-radius: 10px;
        }

        .explore-status-badge {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          background: var(--nz-border);
          color: var(--nz-text-secondary);
        }

        .explore-status-badge.in-progress {
          background: var(--nz-accent-light);
          color: var(--nz-accent);
        }

        .explore-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }

        .explore-card p {
          font-size: 0.88rem;
          color: var(--nz-text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .explore-quarter {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--nz-text-secondary);
          text-transform: uppercase;
        }

        @media (max-width: 768px) {
          .explore-roadmap-grid {
            grid-template-columns: 1fr;
          }
          .explore-hero h1 {
            font-size: 2rem;
          }
        }
      `}</style>

      <div className="explore-future-container">
        {/* Back Button */}
        <button className="explore-back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>

        {/* Hero Section */}
        <section className="explore-hero">
          <div className="explore-hero-badge">
            <FaLightbulb /> NoteZ Ecosystem Vision
          </div>
          <h1>Explore the Future</h1>
          <p>
            Discover our product roadmap, upcoming AI capabilities, and how we are building a seamless workspace to boost your daily productivity.
          </p>
        </section>

        {/* Roadmap Milestones */}
        <section className="explore-roadmap-section">
          <h2>Product Roadmap</h2>
          <div className="explore-roadmap-grid">
            {roadmapMilestones.map((item, index) => {
              const IconComponent = item.icon;
              const isProgress = item.status === "In Progress";
              return (
                <div key={index} className="explore-card">
                  <div className="explore-card-header">
                    <div className="explore-card-icon">
                      <IconComponent />
                    </div>
                    <span className={`explore-status-badge ${isProgress ? 'in-progress' : ''}`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="explore-quarter">{item.quarter}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExploreFuture;