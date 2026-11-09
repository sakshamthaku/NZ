import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("API KEY NOT FOUND")
else:
    try:
        client = genai.Client(
            api_key=api_key,
            http_options={"timeout": 120000}
        )

        print("Connecting to Gemini...", flush=True)

        response = client.interactions.create(
            model="gemini-3.8-flash",
            input="Reply with exactly: NoteZ AI connected!",
            timeout=120
        )

        print("SUCCESS!", flush=True)
        print(response.output_text, flush=True)

    except Exception as error:
        print("GEMINI ERROR:", flush=True)
        print(repr(error), flush=True)