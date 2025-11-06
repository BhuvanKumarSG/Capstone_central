from fastapi import FastAPI, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import logging
import subprocess
import sys
import os
import uuid


# Which Python executable should be used to run the inference script.
# Priority: INFER_PYTHON env var -> project-specific venv -> current sys.executable
DEFAULT_INFER_PYTHON = r"D:/Danush/Capstone_central/backend/capstone2/Scripts/python.exe"
INFER_PYTHON = os.environ.get("INFER_PYTHON", DEFAULT_INFER_PYTHON if os.path.exists(DEFAULT_INFER_PYTHON) else sys.executable)

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
async def audio_gen(background_tasks: BackgroundTasks, audio: UploadFile | None = File(None), script: str = Form("")):
    """Accept an uploaded audio file and a script, save them to a per-run
    temp directory, spawn `run_infer.py` with CLI args pointing to the
    saved audio and requested output path, and return immediately.
    """
    logging.info("Audio generation API called; saving uploaded assets and launching inference.")

    script_path = os.path.join(os.path.dirname(__file__), "run_infer.py")

    # create a unique run directory to hold uploaded file and output
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    os.makedirs(runs_root, exist_ok=True)
    run_id = uuid.uuid4().hex
    run_dir = os.path.join(runs_root, run_id)
    os.makedirs(run_dir, exist_ok=True)

    saved_audio = None
    try:
        if audio:
            # sanitize filename minimally by using a fixed name inside run dir
            saved_audio = os.path.join(run_dir, 'input_audio' + os.path.splitext(audio.filename)[1])
            with open(saved_audio, 'wb') as f:
                f.write(await audio.read())
    except Exception as e:
        logging.exception("Failed to save uploaded audio: %s", e)
        return {"error": "failed to save uploaded audio"}

    out_wav = os.path.join(run_dir, 'generated_out.wav')

    def _run_infer_subprocess():
        # Build the command line to forward the saved audio and script to run_infer
        cmd = [INFER_PYTHON, script_path]
        if saved_audio:
            cmd += ['--ref-audio', saved_audio]
        if script:
            cmd += ['--gen-text', script]
        cmd += ['--out-wav', out_wav]

        try:
            proc = subprocess.run(cmd, cwd=os.path.dirname(__file__), capture_output=True, text=True)
            logging.info("run_infer finished with returncode=%s", proc.returncode)
            if proc.stdout:
                logging.info("run_infer stdout: %s", proc.stdout)
            if proc.stderr:
                logging.error("run_infer stderr: %s", proc.stderr)
        except Exception as e:
            logging.exception("Failed to run inference subprocess: %s", e)

    # start the background task and return immediately
    background_tasks.add_task(_run_infer_subprocess)

    # Return both run_id and job_id for compatibility with clients that expect either name.
    # Both values are identical (the UUID used for the run directory).
    return {"message": "Audio generation started.", "run_id": run_id, "job_id": run_id}


# Note: status polling endpoint removed in simple mode.

# API endpoint for video generation
@app.post("/api/video-gen")
async def video_gen():
    logging.info("Video generation API called.")
    return {"message": "Video generation API connection successful."}


# API endpoint to retrieve generated audio for a run (returns 404 until file exists)
from fastapi.responses import FileResponse
from fastapi import HTTPException

@app.get("/api/jobs/{job_id}/audio")
def get_job_audio(job_id: str):
    """Serve the generated_out.wav for the provided run_id when available.
    Returns 404 if the file is not yet present.
    """
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    run_dir = os.path.join(runs_root, job_id)
    out_wav = os.path.join(run_dir, 'generated_out.wav')

    if os.path.exists(out_wav) and os.path.isfile(out_wav):
        # Stream the file back to the client
        return FileResponse(out_wav, media_type='audio/wav', filename='generated_out.wav')
    else:
        # Let the client poll until the file appears
        raise HTTPException(status_code=404, detail="not ready")


# Debug endpoint: list recent run IDs (useful for diagnosing client/server id mismatches)
@app.get("/api/debug/runs")
def list_runs():
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    if not os.path.exists(runs_root):
        return {"runs": []}
    items = []
    for name in sorted(os.listdir(runs_root)):
        path = os.path.join(runs_root, name)
        if os.path.isdir(path):
            items.append({
                "id": name,
                "has_output": os.path.exists(os.path.join(path, 'generated_out.wav'))
            })
    return {"runs": items}

# API endpoint for AI check
@app.post("/api/ai-check")
async def ai_check():
    logging.info("AI check API called.")
    return {"message": "AI check API connection successful."}
