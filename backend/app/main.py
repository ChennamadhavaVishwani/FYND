from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from app.routes import auth
from app.routes import resume
from app.routes import jobs
from app.routes import career
from app.routes import match
from app.routes import interview
from app.routes import applications


app = FastAPI(
    title="FYND - Find Your Next Destination",
    description="AI powered career navigation platform",
    version="1.0"
)



# Allow React frontend

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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



@app.get("/")
def home():

    return {
        "app":"FYND",
        "message":"Find Your Next Destination API running"
    }