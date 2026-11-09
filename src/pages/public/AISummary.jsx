import React, { useEffect, useRef, useState } from "react";
import {
  askDocumentQuestion,
  getSavedConversations,
  saveConversation,
  deleteConversation,
} from "../../services/aiSummaryService";
import "./AISummary.css";

const modes = [
  { id: "quick", name: "Quick summary", desc: "A concise overview", icon: "⚡" },
  { id: "detailed", name: "Detailed report", desc: "Topics, sections and explanations", icon: "✦" },
  { id: "study", name: "Study notes", desc: "Revision-friendly learning points", icon: "▤" },
];

const MAX_SIZE = 20 * 1024 * 1024;
const newId = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getPointText = (point) =>
  typeof point === "string" ? point : point?.text || point?.title || point?.point || "";

function normalizeSummary(response) {
  const raw = response?.summary && typeof response.summary === "object"
    ? response.summary
    : response || {};

  return {
    overview: raw.overview || raw.summary || "",
    keyPoints: Array.isArray(raw.key_points) ? raw.key_points
      : Array.isArray(raw.keyPoints) ? raw.keyPoints : [],
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    definitions: Array.isArray(raw.definitions) ? raw.definitions : [],
    conclusion: raw.conclusion || raw.conclusions || "",
  };
}

/* Live Gemini streaming connection */
const API_BASE = (import.meta.env.VITE_AI_API_BASE_URL || "").replace(/\/$/, "");

async function createDocumentSummaryLive(file, mode, onChunk) {
  const body = new FormData();
  body.append("file", file);
  body.append("mode", mode);

  const response = await fetch(`${API_BASE}/api/ai-summary/summarize-stream`, {
    method: "POST",
    body,
    headers: { Accept: "text/event-stream" },
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      detail.detail || detail.error ||
      `Live AI endpoint failed (${response.status}). Add /api/ai-summary/summarize-stream to FastAPI.`
    );
  }

  if (!response.body) {
    throw new Error("This browser does not support live AI streaming.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalSummary = null;
  let serverError = "";

  const handleEvent = (eventText) => {
    const line = eventText.split("\n").find((item) => item.startsWith("data:"));
    if (!line) return;

    let payload;
    try {
      payload = JSON.parse(line.slice(5).trim());
    } catch {
      return;
    }

    if (payload.type === "chunk") {
      onChunk?.(payload.text || "");
    }

    if (payload.type === "done") {
      finalSummary = payload.summary || null;
    }

    if (payload.type === "error") {
      serverError = payload.message || "The AI stream failed.";
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    events.forEach(handleEvent);

    if (serverError) {
      await reader.cancel().catch(() => {});
      throw new Error(serverError);
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    handleEvent(buffer);
  }

  if (serverError) throw new Error(serverError);

  if (!finalSummary) {
    throw new Error(
      "The AI stream ended without a completed summary. Check your FastAPI streaming endpoint."
    );
  }

  return { success: true, summary: finalSummary };
}

export default function AISummary() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("detailed");
  const [summary, setSummary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [streamingSummary, setStreamingSummary] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Preparing your document");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fileRef = useRef(null);
  const summaryRef = useRef(null);
  const messagesRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    try {
      setHistory(getSavedConversations() || []);
    } catch {
      setHistory([]);
    }

    return () => window.clearTimeout(toastTimer.current);
  }, []);

  // Estimated activity indicator. The live text itself comes from Gemini.
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return undefined;
    }

    setProgress(7);

    const interval = window.setInterval(() => {
      setProgress((current) =>
        Math.min(92, current + Math.max(1, (92 - current) * 0.075))
      );
    }, 450);

    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const clearError = () => setError("");

  const reset = () => {
    setFile(null);
    setSummary(null);
    setMessages([]);
    setQuestion("");
    setActiveId(null);
    setError("");
    setProgress(0);
    setLiveText("");
    setStreamingSummary(false);
    setSidebarOpen(false);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const uploadFile = (selected) => {
    if (!selected) return;

    const extension = `.${selected.name.split(".").pop().toLowerCase()}`;
    const allowed = [".pdf", ".docx", ".txt", ".pptx"];

    if (!allowed.includes(extension)) {
      setError(
        "Please choose a PDF, DOCX, TXT or PPTX file. DOC files are not supported by the current backend."
      );
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("This file is larger than 20 MB. Please choose a smaller document.");
      return;
    }

    if (selected.size === 0) {
      setError("This file is empty. Please choose another document.");
      return;
    }

    setFile(selected);
    setSummary(null);
    setMessages([]);
    setActiveId(null);
    setLiveText("");
    setError("");
    notify("Document added and ready for analysis.");
  };

  const generateSummary = async () => {
    if (!file || loading) return;

    setLoading(true);
    setStreamingSummary(true);
    setLiveText("");
    setProgress(7);
    setBusyLabel("Connecting to NoteZ AI...");
    setError("");

    try {
      setBusyLabel("Reading your document");

      const response = await createDocumentSummaryLive(
        file,
        mode,
        (chunk) => {
          setLiveText((current) => current + chunk);
          setBusyLabel("NoteZ AI is generating your report...");
          setProgress((current) => Math.min(96, current + 0.25));
        }
      );

      setProgress(100);
      setBusyLabel("Preparing your preview");

      const data = normalizeSummary(response);

      if (!data.overview && !data.keyPoints.length && !data.sections.length) {
        throw new Error(
          "The AI returned an empty summary. Try another document or summary style."
        );
      }

      setSummary(data);

      const conversation = {
        id: newId(),
        fileName: file.name,
        mode,
        summary: data,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActiveId(conversation.id);
      setHistory(saveConversation(conversation) || []);
      notify("Your live AI summary is ready.");
    } catch (err) {
      setError(err?.message || "Summary generation failed. Please try again.");
    } finally {
      setLoading(false);
      setStreamingSummary(false);
    }
  };

  const sendQuestion = async (event) => {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed || !file || !summary || loading) return;

    const userMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);
    setBusyLabel("Finding an answer in your document");
    setError("");

    try {
      const response = await askDocumentQuestion({
        file,
        question: trimmed,
        conversationId: activeId,
        history: nextMessages,
      });

      const assistantMessage = {
        id: newId(),
        role: "assistant",
        content: response?.answer || response?.response || "No answer was returned.",
        sources: response?.sources || [],
      };

      const finalMessages = [...nextMessages, assistantMessage];
      setMessages(finalMessages);

      const previous = history.find((item) => item.id === activeId);

      if (previous) {
        setHistory(saveConversation({
          ...previous,
          summary,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        }) || []);
      }

      notify("Answer received.");
    } catch (err) {
      setError(err?.message || "Could not answer your question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openHistory = (item) => {
    setActiveId(item.id);
    setFile(null);
    setSummary(item.summary);
    setMessages(item.messages || []);
    setError("");
    setSidebarOpen(false);
  };

  const removeHistory = (id) => {
    const updated = deleteConversation(id) || [];
    setHistory(updated);

    if (activeId === id) reset();

    notify("Saved conversation deleted.");
  };

  const exportPDF = async () => {
    if (!summary) return;

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();
      let y = 20;

      const addText = (text, size = 11) => {
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(String(text || ""), 170);

        if (y + lines.length * 7 > 280) {
          pdf.addPage();
          y = 20;
        }

        pdf.text(lines, 20, y);
        y += lines.length * 7 + 7;
      };

      addText("NoteZ AI Summary", 18);
      addText(
        file?.name ||
        history.find((item) => item.id === activeId)?.fileName ||
        "Saved document",
        12
      );
      addText("OVERVIEW", 14);
      addText(summary.overview);
      addText("IMPORTANT POINTS", 14);

      summary.keyPoints.forEach((point, index) => {
        addText(`${index + 1}. ${getPointText(point)}`);
      });

      summary.sections.forEach((section) => {
        addText(section.title || "Section", 13);
        addText(section.content || section.summary || "");
      });

      summary.definitions.forEach((item) => {
        addText(item.term || "Definition", 12);
        addText(item.meaning || item.definition || "");
      });

      addText("CONCLUSION", 14);
      addText(summary.conclusion);

      if (messages.length) {
        addText("AI CONVERSATION", 14);
        messages.forEach((message) => {
          addText(`${message.role}: ${message.content}`);
        });
      }

      pdf.save("NoteZ-AI-Summary.pdf");
      notify("PDF export downloaded.");
    } catch {
      setError("PDF export needs jsPDF. Install it with: npm install jspdf");
    }
  };

  const exportPNG = async () => {
    if (!summaryRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: "#0d1511",
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = "NoteZ-AI-Summary.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      notify("Image preview exported.");
    } catch {
      setError("Image export needs html2canvas. Install it with: npm install html2canvas");
    }
  };

  const activeFileName =
    file?.name ||
    history.find((item) => item.id === activeId)?.fileName ||
    "Saved document";

  return (
    <div className="ai-page">
      {sidebarOpen && (
        <button
          className="ai-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`ai-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="ai-brand">
          <div className="ai-brand-mark">N</div>
          <div>
            <strong>NoteZ</strong>
            <span>INTELLIGENCE</span>
          </div>
          <button
            className="ai-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <button className="ai-new" onClick={reset}>
          <span>＋</span> New document
        </button>

        <div className="ai-side-label">YOUR WORKSPACE</div>
        <button className="ai-side-link active" onClick={reset}>
          <span>⌂</span> AI Summary
        </button>

        <div className="ai-side-label ai-history-label">
          RECENT DOCUMENTS <span>{history.length}</span>
        </div>

        <div className="ai-history-list">
          {history.map((item) => (
            <div
              className={`ai-history ${activeId === item.id ? "active" : ""}`}
              key={item.id}
            >
              <button
                className="ai-history-open"
                onClick={() => openHistory(item)}
                title={item.fileName}
              >
                <span className="ai-file-mini">▤</span>
                <span>{item.fileName}</span>
              </button>

              <button
                className="ai-history-delete"
                onClick={() => removeHistory(item.id)}
                aria-label={`Delete ${item.fileName}`}
              >
                ×
              </button>
            </div>
          ))}

          {!history.length && (
            <p className="ai-empty-history">
              Your saved summaries will appear here.
            </p>
          )}
        </div>

        <div className="ai-sidebar-footer">
          <span className="ai-status-dot" /> AI workspace ready
          <small>Private document workspace</small>
        </div>
      </aside>

      <main className="ai-main">
        <header className="ai-topbar">
          <div className="ai-top-left">
            <button
              className="ai-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <span className="ai-breadcrumb">
              Workspace <i>/</i> <b>AI Summary</b>
            </span>
          </div>

          <div className="ai-top-status">
            <span className="ai-status-dot" /> Gemini-powered workspace
          </div>
        </header>

        <section className="ai-content">
          <div className="ai-heading">
            <div className="ai-eyebrow">
              <span className="ai-spark">✦</span> NOTEZ INTELLIGENCE
            </div>
            <h1>
              Understand more.
              <br />
              <em>In less time.</em>
            </h1>
            <p>
              Turn your documents into clear summaries, useful study notes and answers.
            </p>
            <div className="ai-feature-pills">
              <span>✦ AI-powered insights</span>
              <span>⌁ Document chat</span>
              <span>↗ Export-ready</span>
            </div>
          </div>

          {error && (
            <div className="ai-error" role="alert">
              <span className="ai-error-icon">!</span>
              <span>{error}</span>
              <button onClick={clearError} aria-label="Dismiss error">×</button>
            </div>
          )}

          {!file && !summary && (
            <div
              className={`ai-upload-card ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDragging(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                uploadFile(event.dataTransfer.files?.[0]);
              }}
            >
              <div className="ai-upload-glow" />
              <div className="ai-upload-icon"><span>↑</span></div>
              <div className="ai-upload-kicker">START WITH A DOCUMENT</div>
              <h2>Drop your file here</h2>
              <p>or choose a document from your device to get started.</p>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.pptx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                hidden
                onChange={(event) => {
                  uploadFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />

              <button
                className="ai-primary"
                onClick={() => fileRef.current?.click()}
              >
                <span>＋</span> Choose document
              </button>

              <div className="ai-upload-meta">
                <span>PDF</span>
                <span>DOCX</span>
                <span>TXT</span>
                <span>PPTX</span>
                <i>Up to 20 MB</i>
              </div>

              <div className="ai-secure-note">
                ⌑ Your document is sent to the configured AI backend for analysis.
              </div>
            </div>
          )}

          {file && !summary && (
            <div className="ai-setup-card">
              <div className="ai-file-preview">
                <div className="ai-file-icon">▤</div>
                <div className="ai-file-info">
                  <strong>{file.name}</strong>
                  <span>
                    {formatBytes(file.size)} <i>•</i>{" "}
                    {file.name.split(".").pop().toUpperCase()} document
                  </span>
                </div>
                <button className="ai-remove-file" onClick={reset}>Remove</button>
              </div>

              <div className="ai-section-heading">
                <div>
                  <span className="ai-step">01</span>
                  <h2>Choose your output</h2>
                </div>
                <p>Select the way NoteZ should understand your document.</p>
              </div>

              <div className="ai-modes">
                {modes.map((item) => (
                  <button
                    key={item.id}
                    className={`ai-mode ${mode === item.id ? "selected" : ""}`}
                    onClick={() => setMode(item.id)}
                  >
                    <span className="ai-mode-icon">{item.icon}</span>
                    <span className="ai-mode-copy">
                      <b>{item.name}</b>
                      <small>{item.desc}</small>
                    </span>
                    <span className="ai-mode-check">
                      {mode === item.id ? "✓" : ""}
                    </span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="ai-progress-card" aria-live="polite">
                  <div className="ai-progress-top">
                    <span className="ai-spinner" />
                    <div>
                      <strong>{busyLabel}</strong>
                      <small>Keep this page open while NoteZ processes your file.</small>
                    </div>
                    <b>{Math.round(progress)}%</b>
                  </div>

                  <div className="ai-progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  <div className="ai-progress-foot">
                    <span>AI analysis in progress</span>
                    <span>Estimated activity</span>
                  </div>

                  {streamingSummary && (
                    <div className="ai-live-workspace" aria-live="polite">
                      <div className="ai-live-header">
                        <div>
                          <span className="ai-live-kicker">
                            NOTEZ INTELLIGENCE · LIVE
                          </span>
                          <h3>Building your document report</h3>
                          <p>New AI output appears here as it is received.</p>
                        </div>
                        <span className="ai-live-indicator"><i /> LIVE</span>
                      </div>

                      <div className="ai-live-activity">
                        <span className="ai-live-pulse" />
                        <span>{busyLabel}</span>
                        <span className="ai-live-percent">
                          {Math.round(progress)}%
                        </span>
                      </div>

                      <div className="ai-progress-track">
                        <span style={{ width: `${progress}%` }} />
                      </div>

                      <div className="ai-live-output">
                        {liveText ? (
                          <pre>{liveText}</pre>
                        ) : (
                          <div className="ai-live-placeholder">
                            <span className="ai-spinner" />
                            <p>Waiting for the first AI response...</p>
                            <small>Your live analysis will appear here.</small>
                          </div>
                        )}

                        {liveText && <span className="ai-live-cursor" />}
                      </div>

                      <div className="ai-live-footer">
                        <span>✦ Live generation</span>
                        <span>
                          {liveText.length.toLocaleString()} characters received
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  className="ai-primary ai-generate"
                  onClick={generateSummary}
                >
                  <span>✦</span> Generate AI summary <i>→</i>
                </button>
              )}

              <p className="ai-processing-note">
                The time required depends on document size and AI service response.
              </p>
            </div>
          )}

          {summary && (
            <div className="ai-workspace">
              <div className="ai-result-toolbar">
                <div className="ai-result-file">
                  <span className="ai-file-icon small">▤</span>
                  <div>
                    <strong>{activeFileName}</strong>
                    <small>AI analysis preview</small>
                  </div>
                </div>

                <div className="ai-export-actions">
                  <button onClick={exportPNG}>↧ <span>PNG</span></button>
                  <button onClick={exportPDF}>↧ <span>PDF</span></button>
                  <button className="ai-new-inline" onClick={reset}>＋ New</button>
                </div>
              </div>

              <div className="ai-result-banner">
                <div>
                  <span className="ai-eyebrow">✦ ANALYSIS COMPLETE</span>
                  <h2>Your document, simplified.</h2>
                  <p>
                    Review the generated insights or ask NoteZ a follow-up question.
                  </p>
                </div>
                <div className="ai-complete-mark">✓</div>
              </div>

              <div className="ai-panels">
                <section className="ai-summary-panel" ref={summaryRef}>
                  <div className="ai-panel-heading">
                    <div>
                      <span className="ai-panel-icon">✦</span>
                      <div>
                        <h2>Document insights</h2>
                        <small>Generated by NoteZ AI</small>
                      </div>
                    </div>
                    <span className="ai-live-tag">PREVIEW</span>
                  </div>

                  <div className="ai-overview-block">
                    <h3>Overview</h3>
                    <p>{summary.overview || "No overview was returned."}</p>
                  </div>

                  {!!summary.keyPoints.length && (
                    <div className="ai-result-section">
                      <h3><span>01</span> Key takeaways</h3>
                      <ol className="ai-key-points">
                        {summary.keyPoints.map((point, index) => (
                          <li key={index}>
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <p>{getPointText(point)}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {!!summary.sections.length && (
                    <div className="ai-result-section">
                      <h3><span>02</span> Document sections</h3>
                      {summary.sections.map((section, index) => (
                        <article className="ai-detail-item" key={index}>
                          <h4>{section.title || `Section ${index + 1}`}</h4>
                          <p>
                            {section.content || section.summary || section.description || ""}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}

                  {!!summary.definitions.length && (
                    <div className="ai-result-section">
                      <h3><span>03</span> Important definitions</h3>
                      {summary.definitions.map((item, index) => (
                        <article className="ai-definition" key={index}>
                          <b>{item.term || `Term ${index + 1}`}</b>
                          <p>
                            {item.meaning || item.definition || item.description || ""}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}

                  {summary.conclusion && (
                    <div className="ai-conclusion">
                      <span>✦</span>
                      <div>
                        <h3>Conclusion</h3>
                        <p>{summary.conclusion}</p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="ai-chat-panel">
                  <div className="ai-panel-heading">
                    <div>
                      <span className="ai-panel-icon chat">✧</span>
                      <div>
                        <h2>Ask your document</h2>
                        <small>Continue exploring your file</small>
                      </div>
                    </div>
                    <span className="ai-chat-online"><i /> AI ready</span>
                  </div>

                  <div className="ai-chat-intro">
                    <div className="ai-chat-avatar">N</div>
                    <div>
                      <b>Hi, I'm NoteZ AI.</b>
                      <p>
                        Ask me to explain a concept, find a detail or clarify something
                        from this document.
                      </p>
                    </div>
                  </div>

                  <div className="ai-messages" ref={messagesRef} aria-live="polite">
                    {messages.map((message) => (
                      <div className={`ai-message ${message.role}`} key={message.id}>
                        <span className="ai-message-role">
                          {message.role === "user" ? "YOU" : "NOTEZ AI"}
                        </span>
                        <p>{message.content}</p>
                        {message.sources?.map((source, index) => (
                          <small key={index}>
                            {source.page ? `Page ${source.page}` : source.section || ""}
                          </small>
                        ))}
                      </div>
                    ))}

                    {loading && (
                      <div className="ai-thinking">
                        <span /><span /><span />
                        <small>NoteZ is thinking…</small>
                      </div>
                    )}

                    {!messages.length && (
                      <div className="ai-chat-empty">
                        Your document conversation will appear here.
                      </div>
                    )}
                  </div>

                  {loading && (
                    <div className="ai-chat-progress">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  )}

                  <form onSubmit={sendQuestion} className="ai-chat-form">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Ask anything about your document…"
                      rows={2}
                      disabled={!file || loading}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading || !question.trim() || !file}
                      aria-label="Send question"
                    >
                      ↑
                    </button>
                  </form>

                  <div className="ai-chat-hint">
                    AI responses can make mistakes. Verify important information.
                  </div>
                </section>
              </div>
            </div>
          )}
        </section>

        <footer className="ai-footer">
          <span>NoteZ Intelligence</span>
          <span>Built to make learning clearer.</span>
        </footer>
      </main>

      {toast && (
        <div className="ai-toast" role="status">
          <span>✓</span>{toast}
        </div>
      )}
    </div>
  );
}