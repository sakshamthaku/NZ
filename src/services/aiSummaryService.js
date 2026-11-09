
const STORAGE_KEY = "notez_intelligence_history";

const API_BASE = (
  import.meta.env.VITE_AI_API_BASE_URL || ""
).replace(/\/$/, "");

// ==========================================
// API REQUEST HANDLER
// ==========================================

async function sendFile(endpoint, fields) {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (value instanceof Blob) {
      formData.append(key, value);
    } else if (typeof value === "string") {
      formData.append(key, value);
    } else {
      formData.append(key, JSON.stringify(value));
    }
  });

  let response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      body: formData
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to NoteZ AI backend. Check whether your Python server is running."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  // Show FastAPI's actual error instead of hiding it.
  if (!response.ok) {
    const message =
      result.detail ||
      result.error ||
      result.message ||
      `Server error: ${response.status}`;

    throw new Error(
      typeof message === "string"
        ? message
        : JSON.stringify(message)
    );
  }

  return result;
}

// ==========================================
// DOCUMENT SUMMARY
// ==========================================

export async function createDocumentSummary(file, mode = "detailed") {
  if (!file) {
    throw new Error("Please select a document first.");
  }

  return sendFile("/api/ai-summary/summarize", {
    file,
    mode
  });
}

// ==========================================
// DOCUMENT AI CHAT
// ==========================================

export async function askDocumentQuestion({
  file,
  question,
  conversationId,
  history
}) {
  if (!file) {
    throw new Error("Please upload a document first.");
  }

  if (!question || !question.trim()) {
    throw new Error("Please enter your question.");
  }

  return sendFile("/api/ai-summary/chat", {
    file,
    question,
    conversationId,
    history
  });
}

// ==========================================
// LOCAL CONVERSATION HISTORY
// ==========================================

export function getSavedConversations() {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
  } catch {
    return [];
  }
}

export function saveConversation(conversation) {
  const existing = getSavedConversations();

  const index = existing.findIndex(
    item => item.id === conversation.id
  );

  if (index >= 0) {
    existing[index] = conversation;
  } else {
    existing.unshift(conversation);
  }

  existing.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt)
  );

  const limited = existing.slice(0, 40);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(limited)
  );

  return limited;
}

export function deleteConversation(id) {
  const updated = getSavedConversations().filter(
    item => item.id !== id
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated)
  );

  return updated;
}
export async function createDocumentSummaryStream(file, mode, onChunk) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  const response = await fetch(
    `${API_BASE}/api/ai-summary/summarize-stream`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || error.error || `Server error: ${response.status}`
    );
  }

  if (!response.body) {
    throw new Error("Streaming is not supported by this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalSummary = null;

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event
        .split("\n")
        .find((part) => part.startsWith("data:"));

      if (!line) continue;

      const payload = JSON.parse(line.slice(5).trim());

      if (payload.type === "chunk") {
        onChunk?.(payload.text || "");
      }

      if (payload.type === "done") {
        finalSummary = payload.summary;
      }

      if (payload.type === "error") {
        throw new Error(payload.message || "AI streaming failed.");
      }
    }
  }

  if (!finalSummary) {
    throw new Error("The AI stream ended before the summary was completed.");
  }

  return {
    success: true,
    summary: finalSummary,
  };
}