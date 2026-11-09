import os
import json
import asyncio
from pathlib import Path
from io import BytesIO

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from google import genai
from google.genai import types


# =========================================================
# 1. ENVIRONMENT AND GEMINI CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. Add it to ai-backend/.env"
    )

GEMINI_MODEL = "gemini-3.8-flash"

client = genai.Client(
    api_key=GEMINI_API_KEY,
    http_options=types.HttpOptions(timeout=180000)
)

MAX_FILE_SIZE = 20 * 1024 * 1024
MAX_TEXT_LENGTH = 250000


# =========================================================
# 2. FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="NoteZ AI",
    description="NoteZ AI Document Summary, Live Streaming and Chat",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sakshamthaku.github.io",
        "https://notez-b1322.web.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 3. DOCUMENT TEXT EXTRACTION
# =========================================================

async def extract_text(file: UploadFile) -> str:
    """
    Extract text from PDF, DOCX, TXT and PPTX documents.

    Returns:
        Extracted document text as a string.
    """

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Maximum file size is 20 MB."
        )

    filename = (file.filename or "").lower()
    extension = Path(filename).suffix

    try:

        # TXT
        if extension == ".txt":

            text = data.decode(
                "utf-8",
                errors="replace"
            )

        # PDF
        elif extension == ".pdf":

            from pypdf import PdfReader

            reader = PdfReader(BytesIO(data))

            text = "\n\n".join(
                page.extract_text() or ""
                for page in reader.pages
            )

            if not text.strip():
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "No readable text found in this PDF. "
                        "Scanned PDFs require OCR."
                    )
                )

        # DOCX
        elif extension == ".docx":

            from docx import Document

            document = Document(BytesIO(data))

            parts = [
                paragraph.text
                for paragraph in document.paragraphs
                if paragraph.text.strip()
            ]

            for table in document.tables:
                for row in table.rows:
                    parts.append(
                        " | ".join(
                            cell.text for cell in row.cells
                        )
                    )

            text = "\n".join(parts)

        # PPTX
        elif extension == ".pptx":

            from pptx import Presentation

            presentation = Presentation(BytesIO(data))
            slides = []

            for number, slide in enumerate(
                presentation.slides,
                start=1
            ):

                slide_parts = [
                    shape.text
                    for shape in slide.shapes
                    if hasattr(shape, "text")
                    and shape.text.strip()
                ]

                if slide_parts:
                    slides.append(
                        f"Slide {number}\n"
                        + "\n".join(slide_parts)
                    )

            text = "\n\n".join(slides)

        else:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported file format. "
                    "Supported formats: PDF, DOCX, TXT and PPTX."
                )
            )

    except HTTPException:
        raise

    except Exception as error:

        print("Document extraction error:", repr(error))

        raise HTTPException(
            status_code=400,
            detail=f"Document extraction failed: {str(error)[:300]}"
        )

    if not text.strip():

        raise HTTPException(
            status_code=400,
            detail="No readable document text found."
        )

    return text[:MAX_TEXT_LENGTH]


# =========================================================
# 4. GEMINI AI GENERATION
# =========================================================

def generate_ai_response(prompt: str) -> str:
    """
    Normal non-streaming Gemini generation.
    """

    try:

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt
        )

        if not response.text:
            raise RuntimeError(
                "Gemini returned an empty response."
            )

        return response.text.strip()

    except Exception as error:

        print("Gemini API error:", repr(error))

        message = str(error).lower()

        if "timeout" in message or "timed out" in message:

            raise HTTPException(
                status_code=504,
                detail=(
                    "Gemini timed out. "
                    "Try again or upload a smaller document."
                )
            )

        if (
            "429" in message
            or "resource_exhausted" in message
            or "quota" in message
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini quota or rate limit reached. "
                    "Please try again later."
                )
            )

        raise HTTPException(
            status_code=502,
            detail=f"Gemini generation failed: {str(error)[:400]}"
        )


async def generate_ai_response_async(prompt: str) -> str:
    """
    Run synchronous Gemini generation without blocking
    FastAPI's async event loop.
    """

    return await asyncio.to_thread(
        generate_ai_response,
        prompt
    )


# =========================================================
# 5. JSON RESPONSE HELPERS
# =========================================================

def clean_json_response(answer: str) -> str:
    """
    Remove Markdown code fences if Gemini includes them.
    """

    cleaned = answer.strip()

    if cleaned.startswith("```"):

        cleaned = cleaned.split("\n", 1)[-1]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    return cleaned


def parse_summary_json(answer: str) -> dict:
    """
    Parse Gemini summary JSON.
    """

    cleaned = clean_json_response(answer)

    try:

        result = json.loads(cleaned)

        if not isinstance(result, dict):
            raise ValueError("Summary must be a JSON object.")

        return result

    except (json.JSONDecodeError, ValueError):

        # Preserve the generated response instead of losing it.
        return {
            "overview": answer,
            "key_points": [],
            "sections": [],
            "definitions": [],
            "conclusion": ""
        }


# =========================================================
# 6. SUMMARY PROMPTS
# =========================================================

SUMMARY_MODES = {

    "quick": """
Create a short and clear summary.

Focus on:
- Main ideas
- Important facts
- Essential information
- Main conclusion

Avoid unnecessary details.
""",

    "detailed": """
Create a detailed document report.

Include:
- A clear overview
- Important key points
- Main sections and explanations
- Important definitions
- Important facts
- A useful conclusion

Explain the important topics clearly.
""",

    "study": """
Create student-friendly study notes.

Include:
- Simple explanations
- Important concepts
- Definitions
- Revision points
- Key facts
- Important topics for exams
- A clear conclusion

Use easy-to-understand language.
"""
}


def create_summary_prompt(
    document_text: str,
    mode: str
) -> str:

    instruction = SUMMARY_MODES.get(
        mode,
        SUMMARY_MODES["detailed"]
    )

    return f"""
You are NoteZ AI, an intelligent document assistant.

Analyze the uploaded document carefully.

IMPORTANT RULES:
1. Use information from the supplied document.
2. Do not invent facts.
3. Do not add unsupported information.
4. Keep the output clear and useful.
5. Follow the selected summary style.

TASK:
{instruction}

DOCUMENT CONTENT:
{document_text}

Return ONLY valid JSON using this structure:

{{
    "overview": "Document overview",
    "key_points": [
        "Important point 1",
        "Important point 2"
    ],
    "sections": [
        {{
            "title": "Section title",
            "content": "Section explanation"
        }}
    ],
    "definitions": [
        {{
            "term": "Important term",
            "meaning": "Definition"
        }}
    ],
    "conclusion": "Document conclusion"
}}

Use empty arrays if information is unavailable.
Do not use Markdown code fences.
"""


# =========================================================
# 7. HOME AND HEALTH ROUTES
# =========================================================

@app.get("/")
async def home():

    return {
        "status": "online",
        "service": "NoteZ AI Summary",
        "version": "3.0.0",
        "model": GEMINI_MODEL,
        "features": [
            "Document summary",
            "Live AI streaming",
            "Document chat",
            "PDF support",
            "DOCX support",
            "TXT support",
            "PPTX support"
        ]
    }


@app.get("/health")
async def health():

    return {
        "status": "healthy",
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL
    }


# =========================================================
# 8. NORMAL DOCUMENT SUMMARY
# =========================================================

@app.post("/api/ai-summary/summarize")
async def summarize_document(
    file: UploadFile = File(...),
    mode: str = Form("detailed")
):

    document_text = await extract_text(file)

    prompt = create_summary_prompt(
        document_text,
        mode
    )

    answer = await generate_ai_response_async(prompt)

    result = parse_summary_json(answer)

    return {
        "success": True,
        "summary": result
    }


# =========================================================
# 9. LIVE DOCUMENT SUMMARY STREAMING
# =========================================================

@app.post("/api/ai-summary/summarize-stream")
async def summarize_stream(
    file: UploadFile = File(...),
    mode: str = Form("detailed")
):

    # IMPORTANT:
    # Use the existing extraction function.
    # It returns text, not a data/mime tuple.
    document_text = await extract_text(file)

    prompt = create_summary_prompt(
        document_text,
        mode
    )

    async def event_stream():

        collected = ""
        stream_error = None

        try:

            # Start Gemini's streaming generation in a worker thread.
            # This avoids blocking the FastAPI event loop.
            stream = await asyncio.to_thread(
                lambda: client.models.generate_content_stream(
                    model=GEMINI_MODEL,
                    contents=prompt
                )
            )

            # The Gemini SDK stream is synchronous.
            # Read each chunk in a worker thread.
            sentinel = object()

            def get_next_chunk():

                try:
                    return next(stream)
                except StopIteration:
                    return sentinel

            while True:

                chunk = await asyncio.to_thread(
                    get_next_chunk
                )

                if chunk is sentinel:
                    break

                text_chunk = getattr(
                    chunk,
                    "text",
                    None
                )

                if text_chunk:

                    collected += text_chunk

                    payload = json.dumps(
                        {
                            "type": "chunk",
                            "text": text_chunk
                        },
                        ensure_ascii=False
                    )

                    yield f"data: {payload}\n\n"

                # Give the event loop an opportunity to process
                # other requests and send the generated output.
                await asyncio.sleep(0)

            if not collected.strip():

                raise RuntimeError(
                    "Gemini returned an empty streaming response."
                )

            # Parse the complete JSON report.
            result = parse_summary_json(collected)

            done_payload = json.dumps(
                {
                    "type": "done",
                    "summary": result
                },
                ensure_ascii=False
            )

            yield f"data: {done_payload}\n\n"

        except Exception as error:

            print(
                "Gemini streaming error:",
                repr(error)
            )

            stream_error = str(error)

            error_payload = json.dumps(
                {
                    "type": "error",
                    "message": stream_error[:500]
                },
                ensure_ascii=False
            )

            yield f"data: {error_payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# =========================================================
# 10. DOCUMENT AI CHAT
# =========================================================

@app.post("/api/ai-summary/chat")
async def chat_with_document(
    file: UploadFile = File(...),
    question: str = Form(...),
    conversationId: str = Form(""),
    history: str = Form("[]")
):

    if not question.strip():

        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    document_text = await extract_text(file)

    try:

        history_data = json.loads(history)

        if not isinstance(history_data, list):
            history_data = []

        history_text = json.dumps(
            history_data,
            ensure_ascii=False
        )

    except Exception:

        history_text = "[]"

    prompt = f"""
You are NoteZ AI, a helpful document assistant.

Answer the user's question using the uploaded document.

RULES:
1. Answer clearly and accurately.
2. Prefer information from the document.
3. Do not invent document facts.
4. If the answer is not available in the document,
   clearly say that.
5. Use previous conversation messages for context.

DOCUMENT:
{document_text}

PREVIOUS CHAT:
{history_text[:10000]}

USER QUESTION:
{question}

Give a clear, useful and understandable answer.
"""

    answer = await generate_ai_response_async(prompt)

    return {
        "success": True,
        "conversationId": conversationId,
        "answer": answer,
        "source": "Uploaded document"
    }


# =========================================================
# 11. SERVER STARTUP MESSAGE
# =========================================================

@app.on_event("startup")
async def startup_event():

    print("========================================")
    print("          NoteZ AI Backend Online       ")
    print("========================================")

    print("Version:", "3.0.0")
    print("Gemini Model:", GEMINI_MODEL)
    print("API Key Loaded:", bool(GEMINI_API_KEY))

    print("----------------------------------------")
    print("Home: /")
    print("Health: /health")
    print("Summary: /api/ai-summary/summarize")
    print("Live Summary: /api/ai-summary/summarize-stream")
    print("Document Chat: /api/ai-summary/chat")

    print("========================================")