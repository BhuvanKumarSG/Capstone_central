from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend (React) to talk to backend (FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],   # allow all methods (GET, POST, etc.)
    allow_headers=["*"],   # allow all headers
)

@app.get("/")
def root():
    return {"message": "FastAPI is running 🚀"}
