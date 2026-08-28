from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


from app.routes import auth
from app.routes import resume
from app.routes import jobs
from app.routes import career
from app.routes import match
from app.routes import interview
from app.routes import applications
from app.routes import networking


app = FastAPI(
    title="FYND - Find Your Next Destination",
    description="AI powered career navigation platform",
    version="1.0"
)



# Allow React frontend (dynamic production origins + localhost defaults)
import os

DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

_env_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
if _frontend_url and _frontend_url not in _env_origins:
    _env_origins.append(_frontend_url)

ALLOWED_ORIGINS = list(set(DEFAULT_ORIGINS + _env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — ensures CORS headers are present even on 500 errors.
# FastAPI's CORSMiddleware cannot intercept raw unhandled exceptions, so without
# this handler the browser sees a network error instead of a proper error response.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in ALLOWED_ORIGINS or "*" in ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers=headers,
    )

from app.routes import skill_gap

app.include_router(skill_gap.router)

app.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

app.include_router(
    match.router
)

app.include_router(
    interview.router
)

app.include_router(
    applications.router
)

app.include_router(
    resume.router,

    tags=["Resume"]
)


app.include_router(
    jobs.router,
    
    tags=["Jobs"]
)


app.include_router(
    career.router,
    prefix="/career",
    tags=["Career"]
)

app.include_router(
    networking.router
)



@app.get("/")
def home():

    return {
        "app":"FYND",
        "message":"Find Your Next Destination API running"
    }