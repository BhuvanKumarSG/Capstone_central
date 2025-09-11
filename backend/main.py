from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

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

# API endpoint for audio generation
@app.post("/api/audio-gen")
async def audio_gen():
    logging.info("Audio generation API called.")
    return {"message": "Audio generation API connection successful."}

# API endpoint for video generation
@app.post("/api/video-gen")
async def video_gen():
    logging.info("Video generation API called.")
    return {"message": "Video generation API connection successful."}

# API endpoint for AI check
@app.post("/api/ai-check")
async def ai_check():
    logging.info("AI check API called.")
    return {"message": "AI check API connection successful."}
