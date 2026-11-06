import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
 
/**
 * NoteZ Code@Preview — Version 2
 * Interactive MCQ form + winner spinner + share/export.
 * Host mode (editable) vs Participant mode (preview).
 * Pure React + internal CSS + HTML5 Canvas. No external CSS framework needed.
 */
 
const WHEEL_COLORS = ["#10b981", "#059669", "#047857", "#065f46", "#34d399", "#15803d"];
const WHEEL_SIZE = 400; // logical canvas size (scaled for HiDPI)
 
const DEFAULT_QUESTIONS = [
  {
    id: 1,
    title: "What is the primary function of NoteZ Code@Preview?",
    options: [
      "Live React Component & Form Rendering",
      "Video Editing",
      "Database Backup",
      "Social Media Analytics",
    ],
    correctAnswer: 0,
  },
  {
    id: 2,
    title: "Which technology stack powers the NoteZ Web App?",
    options: ["PHP & MySQL", "React, Vite & Modern CSS", "Ruby on Rails", "Java Swing"],
    correctAnswer: 1,
  },
];
 
const DEFAULT_PARTICIPANTS = [
  "Alex Vance",
  "Sarah Connor",
  "David Miller",
  "Elena Rostova",
  "Saksham Thakur",
  "Priya Sharma",
];
 
export default function CodePreview() {
  // ---------------------------------------------------------------------------
  // 1. STATE
  // ---------------------------------------------------------------------------
  const [isHost, setIsHost] = useState(true);
  const [activeTab, setActiveTab] = useState("mcq"); // "mcq" | "spinner" | "export"
 
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [formError, setFormError] = useState("");
 
  const [spinParticipants, setSpinParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [newParticipant, setNewParticipant] = useState("");
  const [winner, setWinner] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
 
  const [toast, setToast] = useState(null); // { msg, type }
 
  // Canvas + physics refs
  const canvasRef = useRef(null);
  const spinAngleRef = useRef(0);
  const spinSpeedRef = useRef(0);
  const rafRef = useRef(null);
  const participantsRef = useRef(spinParticipants);
  const toastTimerRef = useRef(null);
 
  useEffect(() => {
    participantsRef.current = spinParticipants;
  }, [spinParticipants]);
 
  // ---------------------------------------------------------------------------
  // 2. TOAST
  // ---------------------------------------------------------------------------
  const showToast = useCallback((msg, type = "ok") => {
    setToast({ msg, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
 
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);
 
  // ---------------------------------------------------------------------------
  // 3. SPINNER CANVAS ENGINE
  // ---------------------------------------------------------------------------
  const drawSpinner = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== WHEEL_SIZE * dpr) {
      canvas.width = WHEEL_SIZE * dpr;
      canvas.height = WHEEL_SIZE * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 
    const names = participantsRef.current;
    const c = WHEEL_SIZE / 2;
    const radius = c - 14;
 
    ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);
 
    if (names.length === 0) {
      ctx.fillStyle = "#71717a";
      ctx.textAlign = "center";
      ctx.font = "500 15px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("Add participants to spin", c, c);
      return;
    }
 
    const arc = (2 * Math.PI) / names.length;
 
    names.forEach((name, i) => {
      const a = spinAngleRef.current + i * arc;
      ctx.beginPath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.moveTo(c, c);
      ctx.arc(c, c, radius, a, a + arc);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0a0b0d";
      ctx.stroke();
 
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.translate(
        c + Math.cos(a + arc / 2) * radius * 0.66,
        c + Math.sin(a + arc / 2) * radius * 0.66
      );
      ctx.rotate(a + arc / 2 + Math.PI / 2);
      ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(name.length > 12 ? name.slice(0, 10) + "…" : name, 0, 0);
      ctx.restore();
    });
 
    // Outer ring
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#10b981";
    ctx.stroke();
 
    // Center cap
    ctx.beginPath();
    ctx.arc(c, c, 26, 0, 2 * Math.PI);
    ctx.fillStyle = "#0a0b0d";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#34d399";
    ctx.stroke();
 
    ctx.beginPath();
    ctx.arc(c, c, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#10b981";
    ctx.fill();
  }, []);
 
  // Redraw when entries change or when the spinner tab is (re)mounted
  useEffect(() => {
    if (activeTab === "spinner") drawSpinner();
  }, [spinParticipants, activeTab, drawSpinner]);
 
  // Stop any running animation on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);
 
  const spinWheel = () => {
    if (isSpinning || spinParticipants.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    spinSpeedRef.current = Math.random() * 0.3 + 0.4;
 
    const animate = () => {
      if (spinSpeedRef.current > 0.002) {
        spinSpeedRef.current *= 0.985; // friction
        spinAngleRef.current += spinSpeedRef.current;
        drawSpinner();
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const names = participantsRef.current;
        const arc = (2 * Math.PI) / names.length;
        const normalized = ((spinAngleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // Pointer is fixed at 12 o'clock (1.5π)
        const pointer = (1.5 * Math.PI - normalized + 2 * Math.PI) % (2 * Math.PI);
        setWinner(names[Math.floor(pointer / arc) % names.length]);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };
 
  // ---------------------------------------------------------------------------
  // 4. HOST HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      {
        id: Date.now(),
        title: "New question " + (qs.length + 1),
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
      },
    ]);
  };
 
  const handleUpdateQuestionTitle = (id, title) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, title } : q)));
 
  const handleUpdateOption = (qId, idx, value) =>
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) } : q
      )
    );
 
  const handleSetCorrectAnswer = (qId, idx) =>
    setQuestions((qs) => qs.map((q) => (q.id === qId ? { ...q, correctAnswer: idx } : q)));
 
  const handleDeleteQuestion = (id) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    setUserAnswers((a) => {
      const copy = { ...a };
      delete copy[id];
      return copy;
    });
  };
 
  const handleAddParticipant = () => {
    const name = newParticipant.trim();
    if (!name) return;
    setSpinParticipants((p) => [...p, name]);
    setNewParticipant("");
    setWinner(null);
  };
 
  const handleRemoveParticipant = (index) => {
    setSpinParticipants((p) => p.filter((_, i) => i !== index));
    setWinner(null);
  };
 
  // ---------------------------------------------------------------------------
  // 5. PARTICIPANT HANDLERS
  // ---------------------------------------------------------------------------
  const handleOptionSelect = (qId, idx) => {
    if (submitted) return;
    setUserAnswers((a) => ({ ...a, [qId]: idx }));
  };
 
  const answeredCount = useMemo(
    () => questions.filter((q) => userAnswers[q.id] !== undefined).length,
    [questions, userAnswers]
  );
 
  const score = useMemo(
    () => questions.filter((q) => userAnswers[q.id] === q.correctAnswer).length,
    [questions, userAnswers]
  );
 
  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setFormError("Enter your name before submitting.");
      return;
    }
    setFormError("");
    setSubmitted(true);
  };
 
  const resetStudentForm = () => {
    setUserAnswers({});
    setSubmitted(false);
    setFormError("");
  };
 
  // ---------------------------------------------------------------------------
  // 6. SHARE / EXPORT
  // ---------------------------------------------------------------------------
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Take this quiz on NoteZ Code@Preview: ${window.location.href}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
  };
 
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Couldn't copy the link. Copy it from the address bar.", "err");
    }
  };
 
  const handleDownloadFormJSON = () => {
    const blob = new Blob([JSON.stringify({ questions, spinParticipants }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NoteZ_Form_Export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Form exported");
  };
 
  // ---------------------------------------------------------------------------
  // 7. RENDER
  // ---------------------------------------------------------------------------
  const tabs = [
    { id: "mcq", label: "MCQ form" },
    { id: "spinner", label: "Winner spinner" },
    { id: "export", label: "Share & export" },
  ];
 
  return (
    <div className="nz-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
 
        .nz-root {
          --bg: #08090b;
          --surface: #0f1115;
          --surface-2: #14171c;
          --line: #20242b;
          --line-strong: #2d333c;
          --text: #f4f6f8;
          --muted: #8b93a1;
          --green: #10b981;
          --green-light: #34d399;
          --green-dark: #059669;
          --amber: #fbbf24;
          --rose: #fb7185;
          --radius: 16px;
          --radius-sm: 10px;
          --font: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
 
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          font-size: 15px;
          line-height: 1.5;
          overflow-x: hidden;
          padding-bottom: 80px;
          -webkit-font-smoothing: antialiased;
        }
        .nz-root *, .nz-root *::before, .nz-root *::after { box-sizing: border-box; }
        .nz-root button { font-family: inherit; cursor: pointer; }
        .nz-root input { font-family: inherit; }
        .nz-root ::selection { background: rgba(16,185,129,.3); color: #d1fae5; }
 
        /* Background */
        .nz-glow {
          position: fixed; top: -120px; left: 50%; transform: translateX(-50%);
          width: min(900px, 120vw); height: 360px;
          background: radial-gradient(ellipse at center, rgba(16,185,129,.16), transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .nz-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-size: 36px 36px;
          background-image:
            linear-gradient(to right, rgba(255,255,255,.022) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,.022) 1px, transparent 1px);
          -webkit-mask-image: radial-gradient(ellipse at top, #000 30%, transparent 80%);
                  mask-image: radial-gradient(ellipse at top, #000 30%, transparent 80%);
        }
        .nz-watermark {
          position: fixed; right: 20px; bottom: 14px; z-index: 0;
          font-weight: 800; font-size: clamp(1.4rem, 4vw, 3rem); letter-spacing: -1px;
          color: rgba(16,185,129,.045); pointer-events: none; user-select: none;
        }
 
        /* Layout */
        .nz-wrap { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
 
        /* Header */
        .nz-header {
          position: sticky; top: 0; z-index: 20; padding-top: 16px; padding-bottom: 8px;
          background: linear-gradient(to bottom, var(--bg) 70%, transparent);
        }
        .nz-bar {
          display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
          padding: 12px 16px;
          background: rgba(15,17,21,.82);
          -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
          border: 1px solid var(--line); border-radius: var(--radius);
          box-shadow: 0 10px 40px rgba(0,0,0,.4);
        }
        .nz-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .nz-logo {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          display: grid; place-items: center;
          background: linear-gradient(135deg, var(--green-light), var(--green-dark));
          color: #04130d; font: 800 20px var(--mono);
          box-shadow: 0 6px 18px rgba(16,185,129,.25);
        }
        .nz-title { font-weight: 800; font-size: 16px; display: flex; align-items: center; gap: 8px; }
        .nz-sub { font-size: 12px; color: var(--muted); }
        .nz-badge {
          font: 600 10px var(--mono); padding: 2px 8px; border-radius: 999px;
          color: var(--green-light); background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.25);
        }
 
        .nz-tabs {
          display: flex; gap: 4px; padding: 4px; border-radius: 12px;
          background: var(--bg); border: 1px solid var(--line);
          max-width: 100%; overflow-x: auto; scrollbar-width: none;
        }
        .nz-tabs::-webkit-scrollbar { display: none; }
        .nz-tab {
          padding: 8px 16px; border: 0; border-radius: 9px; white-space: nowrap;
          background: transparent; color: var(--muted);
          font-size: 13px; font-weight: 600; transition: color .15s, background .15s;
        }
        .nz-tab:hover { color: var(--text); }
        .nz-tab[aria-selected="true"] { background: var(--green); color: #04130d; box-shadow: 0 4px 14px rgba(16,185,129,.28); }
 
        .nz-mode {
          display: flex; align-items: center; gap: 8px; padding: 5px 6px 5px 12px;
          border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line);
        }
        .nz-mode-label { font-size: 12px; color: var(--muted); }
        .nz-mode-btn {
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1px solid;
          transition: background .15s;
        }
        .nz-mode-btn.host { color: var(--amber); background: rgba(251,191,36,.12); border-color: rgba(251,191,36,.3); }
        .nz-mode-btn.part { color: var(--green-light); background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); }
 
        /* Main */
        .nz-main { padding-top: 20px; }
        .nz-stack { display: flex; flex-direction: column; gap: 20px; }
 
        .nz-card {
          background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
          padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,.28); transition: border-color .15s;
        }
        .nz-card:hover { border-color: var(--line-strong); }
 
        .nz-notice {
          display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
          padding: 14px 16px; border-radius: 12px; font-size: 13px;
          color: #fcd34d; background: rgba(251,191,36,.07); border: 1px solid rgba(251,191,36,.2);
        }
        .nz-notice strong { color: #fde68a; }
 
        .nz-label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
        .nz-input {
          width: 100%; padding: 11px 14px; border-radius: var(--radius-sm);
          background: var(--bg); border: 1px solid var(--line); color: var(--text);
          font-size: 14px; transition: border-color .15s, box-shadow .15s;
        }
        .nz-input::placeholder { color: #565d6a; }
        .nz-input:focus { outline: none; border-color: var(--green); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
        .nz-input:disabled { opacity: .5; }
        .nz-error { margin: 8px 0 0; font-size: 12px; color: var(--rose); }
 
        /* Buttons */
        .nz-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 10px 18px; border-radius: var(--radius-sm); border: 0;
          font-size: 13px; font-weight: 700; transition: transform .1s, background .15s, opacity .15s;
        }
        .nz-btn:active:not(:disabled) { transform: scale(.98); }
        .nz-btn:disabled { opacity: .5; cursor: not-allowed; }
        .nz-btn-primary { background: var(--green); color: #04130d; }
        .nz-btn-primary:hover:not(:disabled) { background: var(--green-light); }
        .nz-btn-ghost { background: var(--surface-2); color: var(--text); border: 1px solid var(--line-strong); }
        .nz-btn-ghost:hover { background: #1b1f26; }
        .nz-btn-danger { background: rgba(251,113,133,.1); color: var(--rose); border: 1px solid rgba(251,113,133,.25); padding: 8px 14px; }
        .nz-btn-danger:hover { background: rgba(251,113,133,.18); }
        .nz-btn-lg { padding: 15px 28px; font-size: 15px; border-radius: 12px; }
        .nz-btn-block { width: 100%; }
        .nz-root :focus-visible { outline: 2px solid var(--green-light); outline-offset: 2px; }
 
        /* Question */
        .nz-q-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .nz-q-title { display: flex; align-items: flex-start; gap: 10px; margin: 0; font-size: 16px; font-weight: 700; line-height: 1.4; }
        .nz-q-no { color: var(--green-light); font: 700 13px var(--mono); padding-top: 3px; flex-shrink: 0; }
        .nz-q-edit { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .nz-options { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 18px; }
        @media (min-width: 640px) { .nz-options { grid-template-columns: 1fr 1fr; } }
 
        .nz-opt {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line);
          background: var(--bg); color: #cbd2dc; font-size: 14px;
          transition: border-color .15s, background .15s;
        }
        .nz-opt.clickable { cursor: pointer; }
        .nz-opt.clickable:hover { border-color: var(--line-strong); }
        .nz-opt.selected { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.5); color: #fff; }
        .nz-opt.correct { background: rgba(16,185,129,.16); border-color: var(--green); color: #a7f3d0; font-weight: 700; }
        .nz-opt.wrong { background: rgba(251,113,133,.14); border-color: var(--rose); color: #fecdd3; }
        .nz-opt-main { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
        .nz-opt-letter {
          width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
          display: grid; place-items: center; font: 700 12px var(--mono);
          border: 1px solid var(--line-strong); background: var(--surface-2);
        }
        .nz-opt.selected .nz-opt-letter, .nz-opt.correct .nz-opt-letter { background: var(--green); border-color: var(--green-light); color: #04130d; }
        .nz-opt.wrong .nz-opt-letter { background: var(--rose); border-color: var(--rose); color: #2b0a10; }
        .nz-opt-input { width: 100%; background: transparent; border: 0; color: var(--text); font-size: 13px; padding: 2px 0; }
        .nz-opt-input:focus { outline: none; }
        .nz-key {
          padding: 5px 9px; border-radius: 7px; border: 0; flex-shrink: 0;
          font: 600 10px var(--mono); background: var(--line); color: var(--muted);
        }
        .nz-key:hover { color: var(--text); }
        .nz-key.on { background: var(--green); color: #04130d; font-weight: 700; }
 
        .nz-progress { height: 4px; border-radius: 999px; background: var(--line); overflow: hidden; }
        .nz-progress > span { display: block; height: 100%; background: var(--green); transition: width .25s ease; }
 
        .nz-result {
          text-align: center; padding: 22px; border-radius: var(--radius);
          background: rgba(16,185,129,.07); border: 1px solid rgba(16,185,129,.3);
        }
        .nz-score { font-size: 38px; font-weight: 800; color: var(--green-light); line-height: 1.1; }
        .nz-result p { margin: 6px 0 0; font-size: 13px; color: var(--muted); }
        .nz-empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px; }
 
        /* Spinner */
        .nz-spin-layout { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
        @media (min-width: 960px) { .nz-spin-layout { grid-template-columns: 7fr 5fr; } }
        .nz-wheel-card { text-align: center; display: flex; flex-direction: column; gap: 22px; align-items: center; }
        .nz-h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -.01em; }
        .nz-h3 { margin: 0; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .nz-wheel-box { position: relative; width: 100%; max-width: 380px; padding-top: 14px; }
        .nz-wheel-box canvas { display: block; width: 100%; height: auto; aspect-ratio: 1 / 1; border-radius: 50%; box-shadow: 0 0 0 1px var(--line), 0 20px 50px rgba(0,0,0,.5); }
        .nz-pointer {
          position: absolute; top: 2px; left: 50%; transform: translateX(-50%); z-index: 2;
          width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent;
          border-top: 22px solid var(--amber); filter: drop-shadow(0 3px 4px rgba(0,0,0,.5));
        }
        .nz-winner {
          width: 100%; padding: 16px; border-radius: 14px;
          background: linear-gradient(120deg, rgba(251,191,36,.14), rgba(16,185,129,.14));
          border: 1px solid rgba(251,191,36,.4);
          animation: nzPop .4s cubic-bezier(.2,.9,.3,1.3);
        }
        .nz-winner small { display: block; font-size: 12px; font-weight: 600; color: #fcd34d; }
        .nz-winner b { font-size: 26px; font-weight: 800; }
        .nz-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding-right: 4px; }
        .nz-row {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 10px 12px; border-radius: 10px; background: var(--bg); border: 1px solid var(--line);
          font-size: 13px; color: #cbd2dc;
        }
        .nz-row-name { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .nz-row-name span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nz-row-no { color: var(--green-light); font: 700 12px var(--mono); }
        .nz-icon-btn { background: none; border: 0; color: var(--muted); font-size: 14px; padding: 4px 8px; border-radius: 6px; }
        .nz-icon-btn:hover { color: var(--rose); background: rgba(251,113,133,.1); }
        .nz-add-row { display: flex; gap: 8px; }
 
        /* Export */
        .nz-export { max-width: 760px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; gap: 28px; padding: 36px 28px; }
        .nz-export p { margin: 8px 0 0; color: var(--muted); font-size: 14px; max-width: 52ch; margin-inline: auto; }
        .nz-share-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .nz-share-grid { grid-template-columns: repeat(3, 1fr); } }
        .nz-share {
          display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 12px;
          border-radius: 14px; font-size: 14px; font-weight: 700; border: 1px solid; transition: transform .12s, background .15s;
        }
        .nz-share:hover { transform: translateY(-2px); }
        .nz-share .ico { font-size: 26px; }
        .nz-share.wa { color: #6ee7b7; background: rgba(18,140,126,.16); border-color: rgba(18,140,126,.45); }
        .nz-share.ig { color: #d8b4fe; background: rgba(168,85,247,.14); border-color: rgba(168,85,247,.4); }
        .nz-share.js { color: #a7f3d0; background: rgba(16,185,129,.14); border-color: rgba(16,185,129,.4); }
        .nz-foot { padding-top: 20px; border-top: 1px solid var(--line); font: 500 12px var(--mono); color: #5b6270; }
 
        /* Toast */
        .nz-toast {
          position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 50;
          padding: 12px 18px; border-radius: 12px; font-size: 13px; font-weight: 600;
          background: var(--surface-2); border: 1px solid rgba(16,185,129,.5); color: #a7f3d0;
          box-shadow: 0 12px 40px rgba(0,0,0,.5); animation: nzToast .25s ease;
          max-width: calc(100vw - 32px);
        }
        .nz-toast.err { border-color: rgba(251,113,133,.5); color: #fecdd3; }
 
        /* Motion */
        @keyframes nzGlow { 0%,100% { box-shadow: 0 8px 30px rgba(0,0,0,.28), 0 0 0 rgba(16,185,129,0); } 50% { box-shadow: 0 8px 30px rgba(0,0,0,.28), 0 0 32px rgba(16,185,129,.22); } }
        @keyframes nzPop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes nzToast { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .nz-glow-card { animation: nzGlow 4.5s ease-in-out infinite; }
 
        @media (max-width: 640px) {
          .nz-wrap { padding: 0 14px; }
          .nz-card { padding: 18px; }
          .nz-bar { padding: 12px; }
          .nz-tabs { width: 100%; }
          .nz-tab { flex: 1; padding: 8px 10px; }
          .nz-mode { width: 100%; justify-content: space-between; }
          .nz-q-head { align-items: flex-start; }
          .nz-btn-lg { width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nz-root *, .nz-root *::before, .nz-root *::after { animation: none !important; transition: none !important; }
        }
      `}</style>
 
      <div className="nz-glow" aria-hidden="true" />
      <div className="nz-grid" aria-hidden="true" />
      <div className="nz-watermark" aria-hidden="true">NoteZ Code@Preview</div>
 
      {/* HEADER */}
      <header className="nz-header">
        <div className="nz-wrap">
          <div className="nz-bar">
            <div className="nz-brand">
              <div className="nz-logo" aria-hidden="true">N</div>
              <div>
                <div className="nz-title">
                  <span>NoteZ Code@Preview</span>
                  <span className="nz-badge">v2.0</span>
                </div>
                <div className="nz-sub">Virtual form and wheel engine</div>
              </div>
            </div>
 
            <div className="nz-tabs" role="tablist" aria-label="Sections">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className="nz-tab"
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
 
            <div className="nz-mode">
              <span className="nz-mode-label">Mode</span>
              <button
                className={`nz-mode-btn ${isHost ? "host" : "part"}`}
                onClick={() => setIsHost((v) => !v)}
                aria-pressed={isHost}
              >
                {isHost ? "Host (editable)" : "Participant (preview)"}
              </button>
            </div>
          </div>
        </div>
      </header>
 
      {/* MAIN */}
      <main className="nz-wrap nz-main">
        {/* TAB 1 — MCQ */}
        {activeTab === "mcq" && (
          <div className="nz-stack">
            {isHost && (
              <div className="nz-notice">
                <span>
                  <strong>Host controls are on.</strong> Edit questions and options, and mark the correct answer.
                  Switch to Participant mode to see what students see.
                </span>
                <button className="nz-btn nz-btn-primary" onClick={handleAddQuestion}>
                  + Add question
                </button>
              </div>
            )}
 
            {!isHost && (
              <form className="nz-card" onSubmit={handleSubmitForm} noValidate>
                <label className="nz-label" htmlFor="nz-name">Your name or student ID</label>
                <input
                  id="nz-name"
                  className="nz-input"
                  type="text"
                  placeholder="Enter your full name or student ID"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (formError) setFormError("");
                  }}
                  disabled={submitted}
                  autoComplete="name"
                />
                {formError && <p className="nz-error" role="alert">{formError}</p>}
                {questions.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="nz-progress" aria-hidden="true">
                      <span style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                    </div>
                    <div className="nz-sub" style={{ marginTop: 6 }}>
                      {answeredCount} of {questions.length} answered
                    </div>
                  </div>
                )}
              </form>
            )}
 
            {questions.length === 0 && (
              <div className="nz-card nz-empty">
                No questions yet.{" "}
                {isHost ? "Select “Add question” to create the first one." : "The host hasn't added any questions."}
              </div>
            )}
 
            {questions.map((q, qIndex) => (
              <section key={q.id} className="nz-card" aria-label={`Question ${qIndex + 1}`}>
                {isHost ? (
                  <div className="nz-q-head">
                    <div className="nz-q-edit">
                      <span className="nz-q-no">Q{qIndex + 1}</span>
                      <input
                        className="nz-input"
                        type="text"
                        value={q.title}
                        aria-label={`Question ${qIndex + 1} title`}
                        onChange={(e) => handleUpdateQuestionTitle(q.id, e.target.value)}
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                    <button className="nz-btn nz-btn-danger" onClick={() => handleDeleteQuestion(q.id)}>
                      Delete
                    </button>
                  </div>
                ) : (
                  <h3 className="nz-q-title">
                    <span className="nz-q-no">Q{qIndex + 1}</span>
                    <span>{q.title}</span>
                  </h3>
                )}
 
                <div className="nz-options">
                  {q.options.map((opt, optIndex) => {
                    const isSelected = userAnswers[q.id] === optIndex;
                    const isCorrect = q.correctAnswer === optIndex;
                    let cls = "nz-opt";
                    if (!isHost) cls += " clickable";
                    if (submitted && !isHost) {
                      if (isCorrect) cls += " correct";
                      else if (isSelected) cls += " wrong";
                    } else if (isSelected) cls += " selected";
 
                    return (
                      <div
                        key={optIndex}
                        className={cls}
                        onClick={() => !isHost && handleOptionSelect(q.id, optIndex)}
                        role={isHost ? undefined : "radio"}
                        aria-checked={isHost ? undefined : isSelected}
                        tabIndex={isHost ? undefined : 0}
                        onKeyDown={(e) => {
                          if (!isHost && (e.key === "Enter" || e.key === " ")) {
                            e.preventDefault();
                            handleOptionSelect(q.id, optIndex);
                          }
                        }}
                      >
                        <div className="nz-opt-main">
                          <div className="nz-opt-letter">{String.fromCharCode(65 + optIndex)}</div>
                          {isHost ? (
                            <input
                              className="nz-opt-input"
                              type="text"
                              value={opt}
                              aria-label={`Option ${String.fromCharCode(65 + optIndex)}`}
                              onChange={(e) => handleUpdateOption(q.id, optIndex, e.target.value)}
                            />
                          ) : (
                            <span>{opt}</span>
                          )}
                        </div>
                        {isHost && (
                          <button
                            type="button"
                            className={`nz-key ${isCorrect ? "on" : ""}`}
                            onClick={() => handleSetCorrectAnswer(q.id, optIndex)}
                          >
                            {isCorrect ? "Correct" : "Mark correct"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
 
            {!isHost && questions.length > 0 && (
              <div>
                {!submitted ? (
                  <button className="nz-btn nz-btn-primary nz-btn-lg nz-btn-block" onClick={handleSubmitForm}>
                    Submit answers
                  </button>
                ) : (
                  <div className="nz-result" role="status">
                    <div className="nz-score">{score} / {questions.length}</div>
                    <p>Response submitted for {studentName.trim()}. Correct answers are highlighted in green.</p>
                    <button className="nz-btn nz-btn-ghost" style={{ marginTop: 14 }} onClick={resetStudentForm}>
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
 
        {/* TAB 2 — SPINNER */}
        {activeTab === "spinner" && (
          <div className="nz-spin-layout">
            <div className="nz-card nz-wheel-card nz-glow-card">
              <h2 className="nz-h2">Winner spinner</h2>
 
              <div className="nz-wheel-box">
                <div className="nz-pointer" aria-hidden="true" />
                <canvas ref={canvasRef} role="img" aria-label="Spinner wheel" />
              </div>
 
              <button
                className="nz-btn nz-btn-primary nz-btn-lg"
                onClick={spinWheel}
                disabled={isSpinning || spinParticipants.length === 0}
              >
                {isSpinning ? "Spinning…" : "Spin the wheel"}
              </button>
 
              <div aria-live="polite" style={{ width: "100%" }}>
                {winner && (
                  <div className="nz-winner">
                    <small>Winner</small>
                    <b>{winner}</b>
                  </div>
                )}
              </div>
            </div>
 
            <div className="nz-card nz-stack" style={{ gap: 16 }}>
              <h3 className="nz-h3">
                <span>Wheel entries ({spinParticipants.length})</span>
                {isHost && <span className="nz-sub" style={{ color: "var(--amber)" }}>Editable</span>}
              </h3>
 
              {isHost && (
                <div className="nz-add-row">
                  <input
                    className="nz-input"
                    type="text"
                    placeholder="Add participant name"
                    aria-label="Participant name"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddParticipant()}
                  />
                  <button className="nz-btn nz-btn-primary" onClick={handleAddParticipant}>Add</button>
                </div>
              )}
 
              {spinParticipants.length === 0 ? (
                <div className="nz-empty" style={{ padding: "20px 0" }}>
                  No entries. {isHost ? "Add a name to get started." : "Waiting for the host to add entries."}
                </div>
              ) : (
                <div className="nz-list">
                  {spinParticipants.map((name, idx) => (
                    <div key={`${name}-${idx}`} className="nz-row">
                      <div className="nz-row-name">
                        <span className="nz-row-no">{idx + 1}</span>
                        <span>{name}</span>
                      </div>
                      {isHost && (
                        <button
                          className="nz-icon-btn"
                          onClick={() => handleRemoveParticipant(idx)}
                          aria-label={`Remove ${name}`}
                          disabled={isSpinning}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* TAB 3 — SHARE & EXPORT */}
        {activeTab === "export" && (
          <div className="nz-card nz-export">
            <div>
              <h2 className="nz-h2" style={{ fontSize: 24 }}>Share your virtual form</h2>
              <p>
                Send this MCQ form and spinner wheel to participants on any platform, or export the
                questions and entries as a JSON file.
              </p>
            </div>
 
            <div className="nz-share-grid">
              <button className="nz-share wa" onClick={handleShareWhatsApp}>
                <span className="ico" aria-hidden="true">💬</span>
                <span>Share on WhatsApp</span>
              </button>
              <button className="nz-share ig" onClick={handleCopyLink}>
                <span className="ico" aria-hidden="true">📸</span>
                <span>Copy link for Instagram</span>
              </button>
              <button className="nz-share js" onClick={handleDownloadFormJSON}>
                <span className="ico" aria-hidden="true">📥</span>
                <span>Export form JSON</span>
              </button>
            </div>
 
            <div className="nz-foot">NoteZ Code@Preview • Powered by React and HTML5 Canvas</div>
          </div>
        )}
      </main>
 
      {toast && (
        <div className={`nz-toast ${toast.type === "err" ? "err" : ""}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
 