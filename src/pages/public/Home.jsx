import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useChat } from "../../hooks/useChat";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../firebase/Firebase";
import { getOrCreateChatId, listenToUserChats } from "../../firebase/chatModel";
import OnlineStatus from "../../components/OnlineStatus";
import {
  FaComments,
  FaFilePdf,
  FaCalendarAlt,
  FaBrain,
  FaStickyNote,
  FaCheckSquare,
  FaSearch,
  FaLightbulb
} from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Home() {
  const { userProfile, currentUser } = useAuth();
  const { selectChat } = useChat();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("currentUser"));
  const displayName = userProfile?.username || currentUser?.displayName || storedUser?.username || "Scholar";

  const [suggestions, setSuggestions] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  const searchableContent = [
    { title: "AI Summary", description: "Create summaries and mind maps from your files.", keywords: ["ai","summary","summaries","mind map","mindmap","documents","images"], route: "/ai", type: "Tool", icon: FaBrain },
    { title: "Notes", description: "Capture thoughts instantly.", keywords: ["note","notes","writing","thoughts","text"], route: "/note", type: "Tool", icon: FaStickyNote },
    { title: "Calendar", description: "Plan schedule & events.", keywords: ["calendar","cal","schedule","events","date","plan"], route: "/calender", type: "Tool", icon: FaCalendarAlt },
    { title: "Tasks", description: "Manage daily to-dos.", keywords: ["task","tasks","todo","to-do","manage","checklist"], route: "/task", type: "Tool", icon: FaCheckSquare },
    { title: "Chat", description: "Collaborate with peers.", keywords: ["chat","message","messaging","collaborate","peers","discussion"], route: "/chat", type: "Tool", icon: FaComments },
    { title: "Planner", description: "Plan your workflow.", keywords: ["planner","planning","schedule"], route: "/Planning", type: "Tool", icon: FaCalendarAlt },
    { title: "OSLine PDF Generator", description: "Generate PDF easily.", keywords: ["osline","pdf","pdf generator","document","pdf maker"], url: "https://sakshamthaku.github.io/OSline/", type: "External Tool", icon: FaFilePdf },
    { title: "TIME-TABLE", description: "Create timetable here !", keywords: ["timetable","time-table","schedule","routine"], url: "https://timene.netlify.app/", type: "External Tool", icon: FaCalendarAlt },
    { title: "Explore Future", description: "Discover the future vision and roadmap of NoteZ.", keywords: ["explore","future","vision","roadmap","ecosystem"], route: "/public/explore-future", type: "Page", icon: FaLightbulb },
   
    { title: "WORKSPCE", description: "YOUR PERSONAL WORKSPACE.", keywords: ["WORKSPACE","persoanl","workflow"], route: "connect", type: "Page", icon: FaLightbulb }
  ];

  const filteredResults = searchQuery.trim() === "" ? [] : searchableContent.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    return item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some(kw => kw.toLowerCase().includes(q));
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeResult = (item) => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
    else if (item.route) navigate(item.route);
    setIsSearchFocused(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults.length > 0) executeResult(filteredResults[0]);
      else if (searchQuery.trim() !== "") toast.info("😅 Hmm... NoteZ searched everywhere, but that isn't in the website.");
    } else if (e.key === "Escape") setIsSearchFocused(false);
  };

  useEffect(() => {
    if (!currentUser) return;

    const fetchSuggestions = async () => {
      try {
        const q = query(collection(db, "users"), limit(6));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((docSnap) => {
          if (docSnap.id !== currentUser.uid) list.push(docSnap.data());
        });
        setSuggestions(list);
      } catch (error) {
        console.error("Error fetching user suggestions:", error);
      }
    };

    fetchSuggestions();

    const unsubChats = listenToUserChats(currentUser.uid, (chats) => {
      setRecentChats(chats.slice(0, 5));
    });

    return () => unsubChats();
  }, [currentUser]);

  const handleStartChat = async (targetUser) => {
    if (!currentUser) return;
    try {
      const chatId = await getOrCreateChatId(currentUser.uid, targetUser.uid);
      selectChat(chatId, targetUser);
      navigate("/chat");
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  // Winter Touch: falling snow runs for the first 20 seconds after Home mounts.
  // The custom snow-arrow cursor and click/touch snow bursts remain active while Home is mounted.
  useEffect(() => {
    const reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
    const isCoarsePointer = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;
    const canvas = document.createElement("canvas");
    canvas.className = "notez-winter-canvas";
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    const cursor = document.createElement("div");
    cursor.className = "notez-winter-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = '<span class="notez-winter-cursor-arrow"></span><span class="notez-winter-cursor-flake">❄</span>';

    document.body.appendChild(canvas);
    if (!isCoarsePointer) document.body.appendChild(cursor);
    document.body.classList.add("notez-winter-cursor-active");

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let flakes = [];
    let particles = [];
    let rafId = 0;
    let startTime = performance.now();
    let snowActive = !reduceMotion;
    let lastTrailAt = 0;
    let cursorX = -100;
    let cursorY = -100;
    let running = false;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      flakes = Array.from({ length: Math.min(115, Math.max(45, Math.floor((width * height) / 8500))) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.7,
        speed: Math.random() * 1.15 + 0.35,
        drift: Math.random() * 0.65 - 0.325,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.55 + 0.25
      }));
    };

    const makeBurst = (x, y, amount = 18) => {
      for (let i = 0; i < amount; i += 1) {
        const angle = (Math.PI * 2 * i) / amount + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 2.7 + 0.7;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.35,
          radius: Math.random() * 2.7 + 1,
          life: 1,
          decay: Math.random() * 0.022 + 0.018
        });
      }
      if (particles.length > 180) particles = particles.slice(-180);
      startLoop();
    };

    const draw = (now) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const elapsed = now - startTime;
      snowActive = !reduceMotion && elapsed < 20000;

      if (snowActive) {
        for (const flake of flakes) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(239, 250, 255, ${flake.opacity})`;
          ctx.shadowColor = "rgba(104, 205, 255, .75)";
          ctx.shadowBlur = flake.radius > 2 ? 8 : 4;
          ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
          ctx.fill();
          flake.y += flake.speed;
          flake.x += flake.drift + Math.sin(flake.y / 34 + flake.phase) * 0.35;
          if (flake.y > height + 6) {
            flake.y = -6;
            flake.x = Math.random() * width;
          }
          if (flake.x > width + 5) flake.x = -5;
          if (flake.x < -5) flake.x = width + 5;
        }
      }

      ctx.shadowBlur = 0;
      particles = particles.filter((particle) => particle.life > 0.02);
      for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life);
        ctx.fillStyle = "#e9faff";
        ctx.shadowColor = "#6fd5ff";
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.975;
        particle.vy = particle.vy * 0.975 + 0.025;
        particle.life -= particle.decay;
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (snowActive || particles.length > 0) {
        rafId = window.requestAnimationFrame(draw);
      } else {
        running = false;
        ctx.clearRect(0, 0, width, height);
      }
    };

    function startLoop() {
      if (running || !ctx) return;
      running = true;
      rafId = window.requestAnimationFrame(draw);
    }

    const onPointerMove = (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      if (cursor) {
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        cursor.classList.add("is-visible");
      }
      const now = performance.now();
      if (!reduceMotion && now - lastTrailAt > 75) {
        lastTrailAt = now;
        particles.push({
          x: cursorX + (Math.random() - 0.5) * 7,
          y: cursorY + (Math.random() - 0.5) * 7,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * 0.9 + 0.25,
          radius: Math.random() * 1.8 + 0.7,
          life: 0.55,
          decay: 0.045
        });
        if (particles.length > 180) particles = particles.slice(-180);
        if (!snowActive) startLoop();
      }
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen" || event.pointerType === "mouse") {
        makeBurst(event.clientX, event.clientY, 16);
        if (cursor) {
          cursor.classList.remove("is-popping");
          // Restart the short cursor pop animation without blocking the click.
          void cursor.offsetWidth;
          cursor.classList.add("is-popping");
        }
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    if (snowActive) startLoop();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.body.classList.remove("notez-winter-cursor-active");
      canvas.remove();
      cursor.remove();
    };
  }, []);

  return (
    <div className="notez-home-wrapper">
      <style>{`
        :root {
          --nz-bg: #f1fafb;
          --nz-surface: rgba(255,255,255,.86);
          --nz-surface-solid: #ffffff;
          --nz-text: #102a36;
          --nz-muted: #647b86;
          --nz-green: #087f8c;
          --nz-green-2: #38bdf8;
          --nz-green-dark: #075985;
          --nz-mint: #e6f8ff;
          --nz-line: #d7eaf1;
          --nz-shadow: 0 18px 55px rgba(8,127,140,.09);
          --nz-shadow-hover: 0 24px 65px rgba(8,127,140,.17);
          --nz-radius: 22px;
          --nz-ease: cubic-bezier(.2,.8,.2,1);
        }

        * { box-sizing: border-box; }

        .notez-home-wrapper {
          min-height: calc(100vh - 70px);
          position: relative;
          overflow: hidden;
          color: var(--nz-text);
          background:
            radial-gradient(circle at 8% 8%, rgba(22,199,132,.13), transparent 27%),
            radial-gradient(circle at 92% 20%, rgba(8,116,67,.08), transparent 24%),
            linear-gradient(145deg,#f8fcfa 0%,#eef8f3 48%,#f8fcfa 100%);
          font-family: Inter, Poppins, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: clamp(28px,5vw,72px) 18px 70px;
          isolation: isolate;
        }

        .notez-home-wrapper::before,
        .notez-home-wrapper::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(3px);
          z-index: -1;
          opacity: .42;
        }

        .notez-home-wrapper::before {
          top: 14%;
          left: -250px;
          background: radial-gradient(circle,rgba(22,199,132,.16),transparent 68%);
          animation: nzAmbient 12s ease-in-out infinite alternate;
        }

        .notez-home-wrapper::after {
          right: -260px;
          bottom: 8%;
          background: radial-gradient(circle,rgba(8,116,67,.13),transparent 68%);
          animation: nzAmbient 15s ease-in-out infinite alternate-reverse;
        }

        .notez-home-container {
          width: min(1180px,100%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .notez-hero {
          position: relative;
          text-align: center;
          padding: clamp(26px,5vw,58px) 12px 20px;
          animation: nzRise .65s var(--nz-ease) both;
        }

        .notez-hero::before {
          content: "";
          position: absolute;
          width: 260px;
          height: 150px;
          left: 50%;
          top: 30px;
          transform: translateX(-50%);
          background: radial-gradient(circle,rgba(22,199,132,.15),transparent 70%);
          filter: blur(15px);
          z-index: -1;
        }

        .notez-pro-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          margin-bottom: 18px;
          border: 1px solid rgba(8,116,67,.15);
          border-radius: 999px;
          background: rgba(255,255,255,.76);
          box-shadow: 0 8px 28px rgba(8,116,67,.08);
          color: var(--nz-green-dark);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
        }

        .notez-pro-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--nz-green-2);
          box-shadow: 0 0 0 5px rgba(22,199,132,.12);
          animation: nzPulse 2s ease-in-out infinite;
        }

        .notez-hero h1 {
          margin: 0;
          font-size: clamp(2.2rem,5vw,4.5rem);
          line-height: .98;
          letter-spacing: -2.8px;
          font-weight: 950;
          color: var(--nz-text);
        }

        .notez-hero h1 span {
          background: linear-gradient(100deg,var(--nz-green-dark),var(--nz-green-2),var(--nz-green));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .notez-hero p {
          max-width: 660px;
          margin: 18px auto 26px;
          color: var(--nz-muted);
          font-size: clamp(.95rem,1.8vw,1.08rem);
          line-height: 1.7;
        }

        .notez-beta-banner {
          width: min(650px,100%);
          margin: 0 auto 25px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          text-align: left;
          border: 1px solid rgba(8,116,67,.13);
          border-radius: 16px;
          background: rgba(255,255,255,.7);
          box-shadow: 0 10px 35px rgba(8,116,67,.055);
          backdrop-filter: blur(14px);
        }

        .notez-beta-tag {
          flex: 0 0 auto;
          padding: 5px 9px;
          border-radius: 8px;
          background: var(--nz-green);
          color: white;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .notez-beta-text {
          margin: 0;
          color: var(--nz-muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .notez-search-box {
          position: relative;
          width: min(720px,100%);
          margin: 0 auto;
          z-index: 20;
        }

        .notez-search-input-wrapper {
          position: relative;
        }

        .notez-search-input {
          width: 100%;
          height: 60px;
          padding: 0 22px 0 56px;
          border: 1px solid rgba(8,116,67,.13);
          border-radius: 18px;
          outline: none;
          background: rgba(255,255,255,.88);
          color: var(--nz-text);
          font-size: 14px;
          box-shadow: 0 14px 45px rgba(8,116,67,.075), inset 0 1px 0 rgba(255,255,255,.8);
          transition: border-color .25s var(--nz-ease),box-shadow .25s var(--nz-ease),transform .25s var(--nz-ease);
          backdrop-filter: blur(16px);
        }

        .notez-search-input::placeholder { color: #9aa9a1; }

        .notez-search-input:focus {
          border-color: rgba(8,116,67,.45);
          box-shadow: 0 18px 55px rgba(8,116,67,.14),0 0 0 4px rgba(22,199,132,.08);
          transform: translateY(-1px);
        }

        .notez-search-icon {
          position: absolute;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--nz-green);
          cursor: pointer;
          transition: transform .25s var(--nz-ease),color .25s ease;
          z-index: 2;
        }

        .notez-search-icon:hover { transform: translateY(-50%) scale(1.12); color: var(--nz-green-2); }

        .notez-search-results-panel {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 10px);
          overflow: hidden;
          border: 1px solid rgba(8,116,67,.13);
          border-radius: 18px;
          background: rgba(255,255,255,.94);
          box-shadow: 0 25px 70px rgba(8,116,67,.16);
          backdrop-filter: blur(18px);
          animation: nzDrop .24s var(--nz-ease) both;
        }

        .notez-search-results-header {
          padding: 13px 16px;
          border-bottom: 1px solid var(--nz-line);
          color: var(--nz-green-dark);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .notez-search-result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 15px;
          border-bottom: 1px solid #edf4ef;
          cursor: pointer;
          color: var(--nz-text);
          transition: background .2s ease,transform .2s var(--nz-ease);
        }

        .notez-search-result-item:last-child { border-bottom: 0; }

        .notez-search-result-item:hover {
          background: var(--nz-mint);
          transform: translateX(4px);
        }

        .notez-search-result-content { display:flex;align-items:center;gap:12px;min-width:0; }

        .notez-search-result-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display:grid;
          place-items:center;
          border-radius:12px;
          color:var(--nz-green);
          background:linear-gradient(145deg,#eafff3,#d9fae9);
        }

        .notez-search-result-text { min-width:0; }
        .notez-search-result-text h4 { margin:0 0 3px;font-size:13px;font-weight:850; }
        .notez-search-result-text p { margin:0;color:var(--nz-muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .notez-search-result-badge { flex:0 0 auto;padding:5px 8px;border-radius:8px;background:#f0f7f3;color:var(--nz-green-dark);font-size:9px;font-weight:850; }

        .notez-search-no-results { padding:22px;text-align:center;color:var(--nz-muted);font-size:12px; }

        .notez-features-grid {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:15px;
        }

        .notez-feature-card {
          position:relative;
          min-height:176px;
          overflow:hidden;
          display:flex;
          flex-direction:column;
          justify-content:flex-end;
          gap:8px;
          padding:22px;
          border:1px solid rgba(8,116,67,.1);
          border-radius:var(--nz-radius);
          color:var(--nz-text);
          text-decoration:none;
          background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(247,253,249,.84));
          box-shadow:var(--nz-shadow);
          transition:transform .3s var(--nz-ease),box-shadow .3s var(--nz-ease),border-color .3s ease;
          animation:nzCardIn .65s var(--nz-ease) both;
        }

        .notez-feature-card::before {
          content:"";
          position:absolute;
          width:120px;
          height:120px;
          right:-55px;
          top:-55px;
          border-radius:50%;
          background:radial-gradient(circle,rgba(22,199,132,.17),transparent 68%);
          transition:transform .45s var(--nz-ease),opacity .3s ease;
        }

        .notez-feature-card::after {
          content:"→";
          position:absolute;
          top:20px;
          right:20px;
          width:30px;
          height:30px;
          display:grid;
          place-items:center;
          border-radius:10px;
          background:#f0faf5;
          color:var(--nz-green);
          font-weight:900;
          opacity:.7;
          transform:translateX(-4px);
          transition:transform .3s var(--nz-ease),background .3s ease,color .3s ease;
        }

        .notez-feature-card:hover {
          transform:translateY(-5px);
          border-color:rgba(8,116,67,.28);
          box-shadow:var(--nz-shadow-hover);
        }

        .notez-feature-card:hover::before { transform:scale(1.45); }
        .notez-feature-card:hover::after { transform:translateX(0);background:var(--nz-green);color:white; }

        .notez-feature-icon {
          position:relative;
          z-index:1;
          width:43px;
          height:43px;
          padding:11px;
          border-radius:14px;
          color:white;
          background:linear-gradient(145deg,var(--nz-green),var(--nz-green-2));
          box-shadow:0 10px 24px rgba(8,116,67,.2);
          transition:transform .3s var(--nz-ease);
        }

        .notez-feature-card:hover .notez-feature-icon { transform:translateY(-3px) rotate(-2deg); }

        .notez-feature-card h3 { position:relative;z-index:1;margin:0;font-size:15px;font-weight:900;letter-spacing:-.2px; }
        .notez-feature-card p { position:relative;z-index:1;margin:0;max-width:90%;color:var(--nz-muted);font-size:12px;line-height:1.55; }

        /* Social-link custom green chat logo styling via internal CSS */
        a[href="/MENU"].notez-feature-card .notez-feature-icon,
        .social-link-card-icon {
          position: relative;
          z-index: 1;
          width: 43px;
          height: 43px;
          padding: 9px;
          border-radius: 14px;
          color: #ffffff;
          background: linear-gradient(145deg, var(--nz-green), var(--nz-green-2));
          box-shadow: 0 10px 24px rgba(8,116,67,.2);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform .3s var(--nz-ease);
        }
        
        .social-chat-logo {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .social-chat-logo::before,
        .social-chat-logo::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          background: var(--nz-green-dark);
        }

        .social-chat-logo::before {
          width: 16px;
          height: 16px;
          top: 0;
          left: 0;
          z-index: 2;
        }

        .social-chat-logo::after {
          width: 14px;
          height: 14px;
          bottom: 0;
          right: 0;
          z-index: 1;
          background: var(--nz-green-2);
        }

        .notez-grid-split {
          display:grid;
          grid-template-columns:1.25fr .75fr;
          gap:15px;
        }

        .notez-panel {
          border:1px solid rgba(8,116,67,.1);
          border-radius:var(--nz-radius);
          padding:20px;
          background:rgba(255,255,255,.82);
          box-shadow:var(--nz-shadow);
          backdrop-filter:blur(14px);
          animation:nzCardIn .7s var(--nz-ease) both;
        }

        .notez-panel-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding-bottom:14px;
          margin-bottom:4px;
          border-bottom:1px solid var(--nz-line);
          color:var(--nz-text);
          font-size:13px;
          font-weight:900;
        }

        .notez-btn-sm {
          border:1px solid rgba(8,116,67,.15);
          border-radius:10px;
          padding:7px 11px;
          background:var(--nz-mint);
          color:var(--nz-green-dark);
          font-size:10px;
          font-weight:900;
          cursor:pointer;
          transition:transform .2s var(--nz-ease),background .2s ease,color .2s ease,box-shadow .2s ease;
        }

        .notez-btn-sm:hover {
          transform:translateY(-2px);
          background:var(--nz-green);
          color:white;
          box-shadow:0 8px 20px rgba(8,116,67,.16);
        }

        .notez-btn-sm:active { transform:translateY(0) scale(.97); }

        .notez-list-item {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:13px 3px;
          border-bottom:1px solid #edf4ef;
          transition:transform .2s var(--nz-ease),background .2s ease;
          border-radius:10px;
        }

        .notez-list-item:hover { transform:translateX(3px);background:#f7fcf9; }
        .notez-list-item:last-child { border-bottom:none; }

        .notez-avatar {
          width:36px;
          height:36px;
          border-radius:12px;
          object-fit:cover;
          border:2px solid white;
          box-shadow:0 5px 18px rgba(8,116,67,.13);
        }

        @keyframes nzRise {
          from { opacity:0;transform:translateY(18px); }
          to { opacity:1;transform:translateY(0); }
        }

        @keyframes nzCardIn {
          from { opacity:0;transform:translateY(18px); }
          to { opacity:1;transform:translateY(0); }
        }

        .notez-feature-card:nth-child(1){animation-delay:.04s}
        .notez-feature-card:nth-child(2){animation-delay:.07s}
        .notez-feature-card:nth-child(3){animation-delay:.10s}
        .notez-feature-card:nth-child(4){animation-delay:.13s}
        .notez-feature-card:nth-child(5){animation-delay:.16s}
        .notez-feature-card:nth-child(6){animation-delay:.19s}
        .notez-feature-card:nth-child(7){animation-delay:.22s}
        .notez-feature-card:nth-child(8){animation-delay:.25s}
        .notez-feature-card:nth-child(9){animation-delay:.28s}
        .notez-feature-card:nth-child(10){animation-delay:.31s}

        @keyframes nzDrop {
          from { opacity:0;transform:translateY(-8px) scale(.99); }
          to { opacity:1;transform:translateY(0) scale(1); }
        }

        @keyframes nzPulse {
          0%,100%{box-shadow:0 0 0 4px rgba(22,199,132,.08)}
          50%{box-shadow:0 0 0 8px rgba(22,199,132,.16)}
        }

        @keyframes nzAmbient {
          from { transform:translate3d(0,0,0) scale(1); }
          to { transform:translate3d(45px,-25px,0) scale(1.08); }
        }

        @media (max-width: 950px) {
          .notez-features-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .notez-grid-split { grid-template-columns:1fr; }
        }

        @media (max-width: 600px) {
          .notez-home-wrapper { padding:22px 12px 45px; }
          .notez-home-container { gap:18px; }
          .notez-hero { padding:28px 5px 12px; }
          .notez-hero h1 { letter-spacing:-1.7px; }
          .notez-beta-banner { align-items:flex-start; }
          .notez-features-grid { grid-template-columns:1fr; gap:12px; }
          .notez-feature-card { min-height:150px;padding:19px; }
          .notez-search-input { height:55px;font-size:13px; }
          .notez-search-result-badge { display:none; }
          .notez-panel { padding:16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *,*::before,*::after {
            animation-duration:.01ms !important;
            animation-iteration-count:1 !important;
            scroll-behavior:auto !important;
            transition-duration:.01ms !important;
          }
        }
          /* =========================================================
   NOTEZ PRO — SEARCH DROPDOWN FIX
   ONLY SEARCH UI — DO NOT REMOVE EXISTING LOGIC
   ========================================================= */

.notez-hero {
  position: relative !important;
  z-index: 100 !important;
  overflow: visible !important;
}

.notez-search-box {
  position: relative !important;
  z-index: 9999 !important;
  isolation: isolate !important;
  width: min(720px, 100%);
  margin: 0 auto;
}

.notez-search-input-wrapper {
  position: relative !important;
  z-index: 10000 !important;
}

.notez-search-input {
  position: relative !important;
  z-index: 10001 !important;
}

/* The actual search dropdown */
.notez-search-results-panel {
  position: absolute !important;

  top: calc(100% + 10px) !important;
  left: 0 !important;
  right: 0 !important;

  width: 100% !important;

  z-index: 2147483647 !important;

  display: block !important;

  max-height: min(520px, 65vh);
  overflow-y: auto;

  background: rgba(255, 255, 255, 0.99) !important;

  border: 1px solid #d8eee1 !important;
  border-radius: 20px !important;

  box-shadow:
    0 25px 70px rgba(15, 70, 40, 0.20),
    0 8px 25px rgba(15, 70, 40, 0.10) !important;

  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  transform: translateZ(0);

  animation: notezSearchOpen .18s ease-out both;
}

@keyframes notezSearchOpen {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Home cards must stay underneath */
.notez-features-grid,
.notez-feature-card,
.notez-tools-section,
.notez-discussions-section {
  position: relative;
  z-index: 1 !important;
}

/* Search result items */
.notez-search-result {
  position: relative;
  z-index: 2;
}

/* Search result header */
.notez-search-results-header {
  padding: 14px 16px 10px;

  color: #527263;

  font-size: 10px;
  font-weight: 900;

  letter-spacing: .08em;
  text-transform: uppercase;

  border-bottom: 1px solid #edf5ef;
}

/* Results list */
.notez-search-results-list {
  display: grid;
  gap: 5px;
  padding: 8px;
}

/* Result item */
.notez-search-result {
  display: grid;

  grid-template-columns:
    38px
    minmax(0, 1fr)
    24px;

  align-items: center;

  gap: 10px;

  padding: 11px;

  border-radius: 13px;

  color: inherit;
  text-decoration: none;

  border: 1px solid transparent;

  transition:
    transform .16s ease,
    background .16s ease,
    border-color .16s ease;
}

.notez-search-result:hover {
  transform: translateX(3px);

  background: #f0fbf4;

  border-color: #d7efdf;
}

/* Result icon */
.notez-search-result-icon {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  border-radius: 11px;

  background: #e8f8ed;

  color: #159447;

  font-size: 15px;
}

/* Result text */
.notez-search-result-content {
  min-width: 0;
}

.notez-search-result-content strong {
  display: block;

  color: #123b28;

  font-size: 12px;
  font-weight: 850;
}

.notez-search-result-content span {
  display: block;

  margin-top: 3px;

  color: #72847a;

  font-size: 10px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Arrow */
.notez-search-result-arrow {
  color: #159447;

  font-size: 16px;
  font-weight: 900;

  text-align: center;
}

/* No result */
.notez-search-no-results {
  padding: 24px 18px;

  text-align: center;

  color: #66756d;
}

.notez-search-no-results strong {
  display: block;

  margin-bottom: 6px;

  color: #123b28;

  font-size: 14px;
  font-weight: 800;
}

.notez-search-no-results span {
  font-size: 11px;
  line-height: 1.5;
}

/* Scrollbar */
.notez-search-results-panel::-webkit-scrollbar {
  width: 7px;
}

.notez-search-results-panel::-webkit-scrollbar-track {
  background: transparent;
}

.notez-search-results-panel::-webkit-scrollbar-thumb {
  background: #b8dfc7;
  border-radius: 999px;
}

/* Mobile */
@media (max-width: 700px) {

  .notez-search-box {
    width: 100%;
    z-index: 9999 !important;
  }

  .notez-search-results-panel {
    top: calc(100% + 8px) !important;

    max-height: 60vh;

    border-radius: 16px !important;
  }

}

/* Small phones */
@media (max-width: 420px) {

  .notez-search-results-panel {
    max-height: 55vh;
    border-radius: 14px !important;
  }

}

/* WINTER TOUCH: global overlay is created by the Home component effect. */
.notez-winter-canvas {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483000 !important;
  width: 100vw;
  height: 100vh;
  pointer-events: none !important;
}
.notez-winter-cursor-active,
.notez-winter-cursor-active * {
  cursor: none !important;
}
.notez-winter-cursor {
  position: fixed;
  z-index: 2147483647;
  left: -100px;
  top: -100px;
  width: 35px;
  height: 35px;
  pointer-events: none;
  opacity: 0;
  transform: translate(-5px, -4px);
  transition: opacity .16s ease;
  filter: drop-shadow(0 0 6px rgba(56,189,248,.9));
}
.notez-winter-cursor.is-visible { opacity: 1; }
.notez-winter-cursor-flake {
  position: absolute;
  left: 9px;
  top: 2px;
  color: #f5fdff;
  font-size: 25px;
  line-height: 1;
  text-shadow: 0 0 5px #7ddfff, 0 0 12px rgba(56,189,248,.9);
  animation: nzWinterSpin 9s linear infinite;
}
.notez-winter-cursor-arrow {
  position: absolute;
  left: 1px;
  top: 1px;
  width: 0;
  height: 0;
  border-top: 17px solid #ffffff;
  border-right: 11px solid transparent;
  transform: rotate(-12deg);
  filter: drop-shadow(0 0 3px #38bdf8);
}
.notez-winter-cursor.is-popping .notez-winter-cursor-flake {
  animation: nzWinterPop .28s ease-out;
}
@keyframes nzWinterSpin { to { transform: rotate(360deg); } }
@keyframes nzWinterPop {
  0% { transform: scale(.75) rotate(0); }
  55% { transform: scale(1.45) rotate(35deg); }
  100% { transform: scale(1) rotate(60deg); }
}

/* Blue + ice-green refresh for the main NoteZ menu and cards. */
.notez-home-wrapper {
  background:
    radial-gradient(circle at 8% 8%, rgba(56,189,248,.15), transparent 28%),
    radial-gradient(circle at 92% 20%, rgba(8,127,140,.10), transparent 26%),
    linear-gradient(145deg,#f7fcff 0%,#edf9f8 48%,#f5fbff 100%);
}
.notez-pro-badge,
.notez-beta-banner,
.notez-search-input,
.notez-search-results-panel,
.notez-panel {
  border-color: rgba(8,127,140,.16);
}
.notez-feature-card {
  border-color: rgba(8,127,140,.14);
  background: linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,250,255,.91));
}
.notez-feature-card:hover {
  border-color: rgba(56,189,248,.55);
  box-shadow: 0 24px 65px rgba(8,127,140,.15), 0 0 0 1px rgba(56,189,248,.08);
}
.notez-feature-icon,
.social-link-card-icon {
  background: linear-gradient(145deg,#087f8c,#38bdf8) !important;
  box-shadow: 0 10px 24px rgba(8,127,140,.22);
}
.notez-search-result-icon {
  color: #087f8c;
  background: linear-gradient(145deg,#e8fbff,#ddf7ee);
}
.notez-search-result-item:hover,
.notez-list-item:hover {
  background: #effbff;
}
.notez-btn-sm {
  border-color: rgba(8,127,140,.2);
  background: linear-gradient(135deg,#e7faff,#e5fbf1);
  color: #075985;
}
.notez-btn-sm:hover {
  background: linear-gradient(135deg,#087f8c,#38bdf8);
}
.notez-search-input:focus {
  border-color: rgba(8,127,140,.48);
  box-shadow: 0 18px 55px rgba(8,127,140,.13),0 0 0 4px rgba(56,189,248,.11);
}
@media (pointer: coarse) {
  .notez-winter-cursor-active,
  .notez-winter-cursor-active * { cursor: auto !important; }
  .notez-winter-cursor { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .notez-winter-cursor-flake { animation: none !important; }
}
      `}</style>

      <div className="notez-home-container">
        <section className="notez-hero">
          <div className="notez-pro-badge">
            <span className="notez-pro-dot"></span>
            NoteZ Pro Experience
          </div>

          <h1>Welcome, <span>{displayName}</span></h1>
          <p>Your intelligent productivity space for notes, tasks, files, planning and ideas.</p>

          

          <div className={`notez-search-box ${isSearchFocused ? "expanded" : ""}`} ref={searchContainerRef}>
            <div className="notez-search-input-wrapper">
              <FaSearch
                className="notez-search-icon"
                onClick={() => {
                  if (filteredResults.length > 0) executeResult(filteredResults[0]);
                  else if (searchQuery.trim() !== "") {
                    toast.info("😅 Hmm... NoteZ searched everywhere, but that isn't in the website.");
                  }
                }}
              />
              <input
                type="text"
                className="notez-search-input"
                placeholder="Search anything in NoteZ..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleKeyDown}
                aria-label="Search NoteZ"
              />
            </div>

            {isSearchFocused && searchQuery.trim() !== "" && (
              <div className="notez-search-results-panel">
                <div className="notez-search-results-header">
                  Search Results ({filteredResults.length})
                </div>

                {filteredResults.length > 0 ? (
                  filteredResults.map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <div
                        key={idx}
                        className="notez-search-result-item"
                        onClick={() => executeResult(item)}
                      >
                        <div className="notez-search-result-content">
                          <div className="notez-search-result-icon"><IconComponent /></div>
                          <div className="notez-search-result-text">
                            <h4>{item.title}</h4>
                            <p>{item.description}</p>
                          </div>
                        </div>
                        <span className="notez-search-result-badge">{item.type}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="notez-search-no-results">
                    No matching website tools found. Press Enter or click search.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <div className="notez-features-grid">
          <Link to="/AI" className="notez-feature-card">
            <FaBrain className="notez-feature-icon" />
            <h3>AI Summary</h3>
            <p>Turn your documents and images into clear summaries and mind maps.</p>
          </Link>

          <Link to="/note" className="notez-feature-card">
            <FaStickyNote className="notez-feature-icon" />
            <h3>Notes</h3>
            <p>Capture thoughts instantly.</p>
          </Link>

          <Link to="/calender" className="notez-feature-card">
            <FaCalendarAlt className="notez-feature-icon" />
            <h3>Calendar</h3>
            <p>Plan schedule & events.</p>
          </Link>

          <Link to="/task" className="notez-feature-card">
            <FaCheckSquare className="notez-feature-icon" />
            <h3>Tasks</h3>
            <p>Manage daily to-dos.</p>
          </Link>

          <Link to="/chat" className="notez-feature-card">
            <FaComments className="notez-feature-icon" />
            <h3>Chat</h3>
            <p>Collaborate with peers.</p>
          </Link>

          <Link to="/Planning" className="notez-feature-card">
            <FaCalendarAlt className="notez-feature-icon" />
            <h3>Planner</h3>
            <p>Plan your workflow.</p>
          </Link>

         

          <Link to="/WORKS" className="notez-feature-card">
            <FaCalendarAlt className="notez-feature-icon" />
            <h3>WORK-SPACE</h3>
            <p>For your make workflow simple.</p>
          </Link>

           <Link to="/list" className="notez-feature-card">
            <FaCalendarAlt className="notez-feature-icon" />
            <h3>LIST</h3>
            <p>this is for list </p>
          </Link>


           <Link to="/codesee" className="notez-feature-card">
           <FaCheckSquare className="notez-feature-icon" />
            <h3>vertual-anser</h3>
            <p>simple anser flow.</p>
          </Link>

         

          <a
            href="https://sakshamthaku.github.io/OSline/"
            target="_blank"
            rel="noopener noreferrer"
            className="notez-feature-card"
          >
            <FaFilePdf className="notez-feature-icon" />
            <h3>OSLine PDF Generator</h3>
            <p>Generate PDF easily.</p>
          </a>

          <a
            href="https://timene.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="notez-feature-card"
          >
            <FaCalendarAlt className="notez-feature-icon" />
            <h3>TIME-TABLE</h3>
            <p>Create timetable here!</p>
          </a>

          <Link to="/MENU" className="notez-feature-card">
            <div className="social-link-card-icon">
              <div className="social-chat-logo"></div>
            </div>
            <h3>Social-link</h3>
            <p>Make a your beautiful group of your friends.</p>
          </Link>
          
        </div>

        <div className="notez-grid-split">
          <div className="notez-panel">
            <div className="notez-panel-header">
              <span>Recent Discussions</span>
              <button className="notez-btn-sm" onClick={() => navigate("/chat")}>View All</button>
            </div>

            {recentChats.length === 0 ? (
              <p style={{ color: "var(--nz-muted)", fontSize: "0.88rem", margin: 0 }}>
                No recent discussions found.
              </p>
            ) : (
              <div>
                {recentChats.map((chat) => (
                  <div key={chat.chatId} className="notez-list-item">
                    <div>
                      <span style={{ fontWeight: 700, display: "block" }}>
                        Discussion #{chat.chatId.slice(0, 6)}
                      </span>
                      <small style={{ color: "var(--nz-muted)" }}>
                        {chat.lastMessage || "No messages yet"}
                      </small>
                    </div>
                    <button className="notez-btn-sm" onClick={() => navigate("/chat")}>Open</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notez-panel">
            <div className="notez-panel-header">
              <span>Study Buddies</span>
            </div>

            {suggestions.length === 0 ? (
              <p style={{ color: "var(--nz-muted)", fontSize: "0.88rem", margin: 0 }}>
                No suggestions available.
              </p>
            ) : (
              <div>
                {suggestions.map((user) => (
                  <div key={user.uid} className="notez-list-item">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <img
                        src={user.photoURL || "https://via.placeholder.com/32"}
                        alt="avatar"
                        className="notez-avatar"
                      />
                      <div>
                        <span style={{ fontWeight: 700, display: "block" }}>{user.username}</span>
                        <OnlineStatus isOnline={user.online} lastSeen={user.lastSeen} />
                      </div>
                    </div>
                    <button className="notez-btn-sm" onClick={() => handleStartChat(user)}>Chat</button>
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

export default Home;