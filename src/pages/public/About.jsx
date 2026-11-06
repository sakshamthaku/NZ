

      import React, { useState } from 'react';

const About = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const coreFeatures = [
    { title: 'Notes', desc: 'Create and organize useful study notes.' },
    { title: 'Planning', desc: 'Plan tasks, activities, and future work.' },
    { title: 'Timetable', desc: 'Organize study schedules and important dates.' },
    { title: 'PDF Generator', desc: 'Create useful PDF documents.' },
    { title: 'Chating', desc: 'We create basic chat engine for friend on it.' },
    { title: 'OSLine', desc: 'An additional educational/OS-related project.' },
    { title: 'AI Summary', desc: 'AI-powered document summarization — currently under development.' }
  ];

  const advantages = [
    'Multiple useful tools in one place',
    'Focus on productivity',
    'Designed around student needs',
    'Easy-to-use approach',
    'Continuously improving',
    'Potential to expand into many more tools'
  ];

  const limitations = [
    'The project is still in an early/Beta stage.',
    'Some features are still under development.',
    'Some tools may have limited functionality.',
    'The platform is still growing.',
    'Some advanced infrastructure and automation features are not yet complete.'
  ];

  const targetAudience = [
    { icon: '🎓', title: 'Students' },
    { icon: '📚', title: 'Teachers' },
    { icon: '💼', title: 'Workers' },
    { icon: '🏢', title: 'Organizations / Companies' }
  ];

  return (
    <div className="notez-page-wrapper">
      <style>{`
        /* ==========================================
           SIMPLE NATURAL GREEN THEME CSS
           ========================================== */
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
          --radius: 6px;
          --shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          --transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .notez-page-wrapper {
          background-color: var(--bg);
          color: var(--text-main);
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.6;
          width: 100%;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .section-padding {
          padding: 60px 0;
        }

        .text-center {
          text-align: center;
        }

        /* Section Headings */
        .section-header {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 40px auto;
        }

        .section-tag {
          display: inline-block;
          padding: 4px 12px;
          background: var(--bg-alt);
          border: 1px solid var(--accent);
          color: var(--primary-dark);
          border-radius: var(--radius);
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .section-title {
          font-size: 2.2rem;
          font-weight: bold;
          margin-bottom: 10px;
          color: var(--primary-dark);
        }

        .section-subtitle {
          color: var(--text-muted);
          font-size: 1rem;
        }

        /* Standard Cards */
        .glass-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          transition: var(--transition);
          position: relative;
        }

        .glass-card:hover {
          border-color: var(--secondary);
        }

        /* ==========================================
           1. ABOUT NOTEZ
           ========================================== */
        .hero-section {
          padding: 80px 0 60px 0;
          background-color: var(--bg-alt);
          border-bottom: 1px solid var(--card-border);
          text-align: center;
        }

        .hero-title {
          font-size: 3rem;
          font-weight: bold;
          line-height: 1.2;
          margin-bottom: 20px;
          color: var(--primary-dark);
        }

        .hero-subtitle {
          font-size: 1.15rem;
          color: var(--text-muted);
          max-width: 700px;
          margin: 0 auto;
        }

        /* ==========================================
           2. WHY NOTEZ?
           ========================================== */
        .story-section {
          background: var(--bg);
        }

        .story-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .story-content p {
          color: var(--text-muted);
          font-size: 1.05rem;
          margin-bottom: 20px;
        }

        /* ==========================================
           3. WHO IS NOTEZ FOR?
           ========================================== */
        .audience-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .audience-card {
          padding: 24px;
          text-align: center;
        }

        .audience-icon {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .audience-title {
          font-size: 1.15rem;
          font-weight: bold;
          color: var(--primary-dark);
        }

        /* ==========================================
           4. CURRENT CORE FEATURES
           ========================================== */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .feature-card {
          padding: 24px;
        }

        .feature-title {
          font-size: 1.15rem;
          font-weight: bold;
          margin-bottom: 8px;
          color: var(--primary-dark);
        }

        .feature-desc {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        /* ==========================================
           5. ADVANTAGES
           ========================================== */
        .advantages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 15px;
        }

        .advantage-item {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: bold;
          color: var(--primary-dark);
        }

        .advantage-check {
          color: var(--primary);
          font-size: 1.2rem;
        }

        /* ==========================================
           6. CURRENT LIMITATIONS
           ========================================== */
        .limitations-box {
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
        }

        .limitations-list {
          list-style-type: disc;
          padding-left: 20px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 1rem;
        }

        /* ==========================================
           7. CORE VISION
           ========================================== */
        .vision-box {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          text-align: center;
        }

        .vision-box p {
          color: var(--text-muted);
          font-size: 1.05rem;
          margin-bottom: 20px;
        }

        /* ==========================================
           8. BUSINESS MODEL
           ========================================== */
        .business-box {
          max-width: 800px;
          margin: 0 auto;
          padding: 30px;
          text-align: center;
        }

        .business-box p {
          color: var(--text-muted);
          font-size: 1.05rem;
          margin-bottom: 15px;
        }

        /* ==========================================
           9. PROJECT CREATOR
           ========================================== */
        .developer-card {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px;
          text-align: center;
        }

        .dev-name {
          font-size: 1.6rem;
          font-weight: bold;
          margin-bottom: 6px;
          color: var(--primary-dark);
        }

        .dev-role {
          color: var(--text-muted);
          font-size: 1rem;
        }

        /* ==========================================
           10. NICO
           ========================================== */
        .nico-section {
          background-color: var(--bg-alt);
          text-align: center;
          padding: 50px 20px;
          border-top: 1px solid var(--card-border);
          border-bottom: 1px solid var(--card-border);
        }

        .nico-subtitle {
          color: var(--text-muted);
          font-size: 1.05rem;
          margin-bottom: 12px;
        }

        .nico-brand-link {
          display: inline-block;
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--primary-dark);
          text-decoration: none;
          letter-spacing: 2px;
          margin-bottom: 10px;
          transition: color 0.2s ease;
        }

        .nico-brand-link:hover {
          color: var(--primary);
        }

        .nico-tagline {
          color: var(--text-muted);
          font-size: 0.95rem;
          font-style: italic;
        }

        /* ==========================================
           11. CLOSING
           ========================================== */
        .closing-section {
          text-align: center;
          padding: 60px 20px;
          max-width: 700px;
          margin: 0 auto;
        }

        .closing-text-main {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--primary-dark);
          margin-bottom: 15px;
        }

        .closing-text-sub {
          color: var(--text-muted);
          font-size: 1rem;
          margin-bottom: 20px;
        }

        .closing-tagline {
          font-size: 1.1rem;
          font-weight: bold;
          color: var(--primary);
        }

        /* ==========================================
           RESPONSIVE MEDIA QUERIES
           ========================================== */
        @media (max-width: 768px) {
          .hero-title { font-size: 2.2rem; }
          .section-title { font-size: 1.8rem; }
        }
      `}</style>

      {/* ==========================================
         1. ABOUT NOTEZ
         ========================================== */}
      <section className="hero-section">
        <div className="container">
          <span className="section-tag">Overview</span>
          <h1 className="hero-title">About NoteZ</h1>
          <p className="hero-subtitle">
            NoteZ is a productivity-focused project created to provide useful digital tools for students and other users in one place. The project is being developed step by step.
          </p>
        </div>
      </section>

      {/* ==========================================
         2. WHY NOTEZ?
         ========================================== */}
      <section className="story-section section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why We Made NoteZ</h2>
          </div>
          <div className="story-content glass-card" style={{ padding: '35px' }}>
            <p>
              Students use many different tools for studying, planning, creating documents, and managing their work. NoteZ was created to bring useful productivity tools together in one place and make everyday student work simpler.
            </p>
            <p style={{ marginBottom: 0 }}>
              The goal is not to build just one tool. The goal is to continue creating and adding useful tools based on real user needs.
            </p>
          </div>
        </div>
      </section>

      {/* ==========================================
         3. WHO IS NOTEZ FOR?
         ========================================== */}
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Who We Want to Help</h2>
            <p className="section-subtitle">Designed to help students and professionals now and in the future.</p>
          </div>
          <div className="audience-grid">
            {targetAudience.map((item, index) => (
              <div className="glass-card audience-card" key={index}>
                <div className="audience-icon">{item.icon}</div>
                <div className="audience-title">{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
         4. CURRENT CORE FEATURES
         ========================================== */}
      <section className="section-padding" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Current Core Features</h2>
            <p className="section-subtitle">Active tools currently built into the NoteZ experience.</p>
          </div>
          <div className="features-grid">
            {coreFeatures.map((feat, index) => (
              <div className="glass-card feature-card" key={index}>
                <h3 className="feature-title">{feat.title}</h3>
                <p className="feature-desc">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
         5. ADVANTAGES
         ========================================== */}
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Advantages</h2>
          </div>
          <div className="advantages-grid">
            {advantages.map((adv, index) => (
              <div className="glass-card advantage-item" key={index}>
                <span className="advantage-check">✓</span>
                <span>{adv}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
         6. CURRENT LIMITATIONS
         ========================================== */}
      <section className="section-padding" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Current Limitations</h2>
          </div>
          <div className="glass-card limitations-box">
            <ul className="limitations-list">
              {limitations.map((limit, index) => (
                <li key={index}>{limit}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ==========================================
         7. CORE VISION
         ========================================== */}
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Our Core Vision</h2>
          </div>
          <div className="glass-card vision-box">
            <p>
              "Our vision is to continuously build and provide a large ecosystem of useful tools for students, teachers, workers, and organizations."
            </p>
            <p>
              "Instead of creating only one productivity tool, we want NoteZ to grow into a platform containing many different tools that solve different everyday problems."
            </p>
            <p style={{ marginBottom: 0, fontWeight: 'bold', color: 'var(--primary-dark)' }}>
              "Our ambition is to keep expanding the platform with as many useful tools as users actually need."
            </p>
          </div>
        </div>
      </section>

      {/* ==========================================
         8. BUSINESS MODEL
         ========================================== */}
      <section className="section-padding" style={{ background: 'var(--bg-alt)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Our Business Vision</h2>
          </div>
          <div className="glass-card business-box">
            <p>
              NoteZ is being developed with a long-term B2B2C business model in mind.
            </p>
            <p>
              Businesses and organizations can use or provide NoteZ tools to the people they serve, while individual users can also use NoteZ directly.
            </p>
            <p style={{ marginBottom: 0, fontWeight: 'bold', color: 'var(--primary-dark)' }}>
              This is our long-term business direction.
            </p>
          </div>
        </div>
      </section>

      {/* ==========================================
         9. PROJECT CREATOR
         ========================================== */}
      <section className="section-padding">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Project Creator</h2>
          </div>
          <div className="glass-card developer-card">
            <h3 className="dev-name">Saksham Thakur</h3>
            <p className="dev-role">Creator and Developer of NoteZ</p>
          </div>
        </div>
      </section>

      {/* ==========================================
         10. NICO
         ========================================== */}
      <div className="nico-section">
        <div className="container">
          <p className="nico-subtitle">Built toward a bigger vision.</p>
          <div>
            <a 
              href="https://sakshamthaku.github.io/NICO./" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nico-brand-link"
            >
              NICO
            </a>
          </div>
          <p className="nico-tagline">"Technology built by people."</p>
        </div>
      </div>

      {/* ==========================================
         11. CLOSING
         ========================================== */}
      <section className="closing-section">
        <p className="closing-text-main">NoteZ is still being built.</p>
        <p className="closing-text-sub">
          We are starting with useful tools and plan to keep improving, expanding, and creating more solutions for the people who use them.
        </p>
        <p className="closing-tagline">One project. Many tools. A bigger vision.</p>
      </section>
    </div>
  );
};

export default About;