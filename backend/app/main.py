from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import init_db
from app.api import customers, tasks, engagements, users, partners, use_cases, health, roadmaps, admin, auth, risks, assessments, lookups, meeting_notes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.app_name,
    description="Customer Status Tracker API - Track and manage customer success",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.app_name}


# API routes
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["Customers"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(engagements.router, prefix="/api/v1/engagements", tags=["Engagements"])
app.include_router(partners.router, prefix="/api/v1/partners", tags=["Partners"])
app.include_router(use_cases.router, prefix="/api/v1/use-cases", tags=["Use Cases"])
app.include_router(roadmaps.router, prefix="/api/v1/roadmaps", tags=["Roadmaps"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(risks.router, prefix="/api/v1/risks", tags=["Risks"])
app.include_router(assessments.router, prefix="/api/v1/assessments", tags=["Assessments"])
app.include_router(lookups.router, prefix="/api/v1/lookups", tags=["Lookups"])
app.include_router(meeting_notes.router, prefix="/api/v1/meeting-notes", tags=["Meeting Notes"])

# Serve static files (prototype)
prototype_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prototype")
if os.path.exists(prototype_path):
    app.mount("/prototype", StaticFiles(directory=prototype_path, html=True), name="prototype")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
