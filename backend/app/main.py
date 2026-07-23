from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import complaints, ai_assistant

# Simple create_all for the assignment; use Alembic migrations in production.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA Complaint Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(ai_assistant.router)


@app.get("/health")
def health():
    return {"status": "ok"}
