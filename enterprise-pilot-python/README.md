# Enterprise Pilot AI Service

Install dependencies with `python -m pip install -r requirements.txt`, copy `.env.example` to `.env`, then run `uvicorn app.main:app --reload --port 8001`.

The API is available at `/docs`. `POST /api/v1/rag/documents` ingests text, `POST /api/v1/rag/ask` answers from indexed context, `POST /api/v1/meetings/summary` summarizes a supplied transcript, and `POST /api/v1/agent/chat` provides AI chat. The Agent forwards the incoming `Authorization` header to the Java backend when it queries a user's bookings.
