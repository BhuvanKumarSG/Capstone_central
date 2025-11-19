from fastapi import FastAPI, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import logging
import subprocess
import sys
import os
import uuid
import time

# Configure basic logging to ensure messages appear on the server terminal
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')


# Which Python executable should be used to run the inference script.
# Priority: INFER_PYTHON env var -> project-specific venv -> current sys.executable
DEFAULT_INFER_PYTHON = r"D:/Danush/Capstone_central/backend/capstone2/Scripts/python.exe"
INFER_PYTHON = os.environ.get("INFER_PYTHON", DEFAULT_INFER_PYTHON if os.path.exists(DEFAULT_INFER_PYTHON) else sys.executable)

app = FastAPI()

# Allow frontend (React) to talk to backend (FastAPI)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],  # frontend URL
#     allow_credentials=True,
#     allow_methods=["*"],   # allow all methods (GET, POST, etc.)
#     allow_headers=["*"],   # allow all headers
#     expose_headers=["Content-Disposition", "Content-Length"],)

# Allow frontend (React) to talk to backend (FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000"], # Allows localhost AND all other domains
    allow_credentials=True,
    allow_methods=["*"],  # allow all methods (GET, POST, etc.)
    allow_headers=["*"], 
    expose_headers=["Content-Disposition", "Content-Length"],
)


@app.get("/")
def root():
    return {"message": "FastAPI is running 🚀"}

# API endpoint for audio generation
@app.post("/api/audio-gen")
async def audio_gen(background_tasks: BackgroundTasks, audio: UploadFile = File(...), script: str = Form("")):
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
        # include ref-audio only if present
        if saved_audio:
            cmd += ['--ref-audio', saved_audio]
        # Always pass --gen-text (may be empty) to ensure the inference
        # script receives the intended generation text instead of falling
        # back to internal defaults.
        cmd += ['--gen-text', script or ""]
        cmd += ['--out-wav', out_wav]

        logging.info("Invoking run_infer (audio-gen): %s", " ".join(cmd))

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
async def video_gen(background_tasks: BackgroundTasks, video: UploadFile = File(...), audio: UploadFile | str | None = File(None), script: str = Form("")):
    """Accept a video plus either (audio + script) or (script only).

    Cases:
    1) video + audio + script: send audio+script to the audio-gen flow (run_infer.py) to produce a generated audio, then run LatentSync with the provided video and generated audio.
    2) video + script (no audio): extract audio from the uploaded video (ffmpeg), send that extracted audio + script to audio-gen flow, then run LatentSync with the video + generated audio.

    The endpoint waits for both audio generation and latent-sync inference to finish and then returns the final MP4 as a streamed file.
    """
    logging.info("Video generation API called.")

    # Coerce incorrectly-typed multipart fields: some clients may send an
    # empty string for the `audio` form field which FastAPI parses as a
    # str. Normalize that to None so downstream code treats it as "no audio".
    if isinstance(audio, str):
        logging.info("Received audio field as string; treating as no file (audio=None)")
        audio = None

    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    os.makedirs(runs_root, exist_ok=True)
    run_id = uuid.uuid4().hex
    run_dir = os.path.join(runs_root, run_id)
    os.makedirs(run_dir, exist_ok=True)

    # Save uploaded video
    try:
        video_ext = os.path.splitext(video.filename)[1] or ".mp4"
        saved_video = os.path.join(run_dir, "input_video" + video_ext)
        with open(saved_video, "wb") as vf:
            vf.write(await video.read())
    except Exception as e:
        logging.exception("Failed to save uploaded video: %s", e)
        return {"error": "failed to save uploaded video"}

    # If audio uploaded, save it; otherwise we'll extract from video
    saved_input_audio = None
    if audio:
        try:
            audio_ext = os.path.splitext(audio.filename)[1] or ".wav"
            saved_input_audio = os.path.join(run_dir, "input_audio" + audio_ext)
            logging.info("Saving uploaded audio to %s", saved_input_audio)
            with open(saved_input_audio, "wb") as af:
                data = await audio.read()
                af.write(data)
            logging.info("Saved uploaded audio (%d bytes)", os.path.getsize(saved_input_audio))
        except Exception as e:
            logging.exception("Failed to save uploaded audio: %s", e)
            return {"error": "failed to save uploaded audio"}

    # If no input audio, extract from video using ffmpeg
    extracted_audio = os.path.join(run_dir, "extracted_audio.wav")
    if saved_input_audio is None:
        # Call ffmpeg to extract audio. Requires ffmpeg to be installed and in PATH.
        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            saved_video,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "44100",
            "-ac",
            "2",
            extracted_audio,
        ]
        try:
            logging.info("Extracting audio from video using ffmpeg: %s", " ".join(ffmpeg_cmd))
            proc = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            logging.info("ffmpeg returncode=%s", proc.returncode)
            if proc.stdout:
                logging.info("ffmpeg stdout: %s", proc.stdout)
            if proc.stderr:
                logging.info("ffmpeg stderr: %s", proc.stderr)
            if proc.returncode != 0:
                logging.error("ffmpeg audio extraction failed (returncode %s)", proc.returncode)
                return {"error": "failed to extract audio from video (ffmpeg error)", "details": proc.stderr}
            saved_input_audio = extracted_audio
            logging.info("Extracted audio saved to %s (size=%d bytes)", saved_input_audio, os.path.getsize(saved_input_audio))
        except FileNotFoundError:
            logging.exception("ffmpeg not found; required to extract audio from video.")
            return {"error": "ffmpeg not found on server; cannot extract audio"}
        except Exception as e:
            logging.exception("Audio extraction failed: %s", e)
            return {"error": "audio extraction failed", "details": str(e)}

    # Start a background job to do any needed extraction/audio generation and
    # then run LatentSync. Return immediately with a run_id so the frontend
    # can poll /api/jobs/{run_id}/video for the final MP4.
    script_path = os.path.join(os.path.dirname(__file__), "run_infer.py")
    out_wav = os.path.join(run_dir, "generated_out.wav")
    out_mp4 = os.path.join(run_dir, "final_output.mp4")

    def _run_video_job():
        logging.info("Background video job started: %s", run_id)

        # If we don't have an input audio (client didn't send), extract it
        local_input_audio = saved_input_audio
        if local_input_audio is None:
            # extract audio using ffmpeg
            try:
                logging.info("(bg) extracting audio from %s", saved_video)
                proc = subprocess.run([
                    "ffmpeg", "-y", "-i", saved_video, "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", extracted_audio
                ], capture_output=True, text=True)
                logging.info("(bg) ffmpeg rc=%s stdout=%s stderr=%s", proc.returncode, proc.stdout, proc.stderr)
                if proc.returncode != 0:
                    logging.error("(bg) ffmpeg failed for run %s", run_id)
                    return
                local_input_audio = extracted_audio
            except Exception:
                logging.exception("(bg) audio extraction failed for run %s", run_id)
                return

        # Call run_infer.py to generate the final audio if needed (if the
        # provided audio is not already the final generated file). In our
        # integration the client normally uploads a generated audio blob so
        # this step is a no-op when audio was provided.
        try:
            audio_cmd = [INFER_PYTHON, script_path, "--ref-audio", local_input_audio, "--out-wav", out_wav]
            if script:
                audio_cmd += ["--gen-text", script]
            logging.info("(bg) running audio gen: %s", " ".join(audio_cmd))
            proc = subprocess.run(audio_cmd, cwd=os.path.dirname(__file__), capture_output=True, text=True)
            logging.info("(bg) run_infer rc=%s stdout=%s stderr=%s", proc.returncode, proc.stdout, proc.stderr)
            if proc.returncode != 0:
                logging.error("(bg) audio generation failed for run %s", run_id)
                return
            if not os.path.exists(out_wav):
                logging.error("(bg) expected out_wav not found for run %s", run_id)
                return
        except Exception:
            logging.exception("(bg) audio generation subprocess failed for run %s", run_id)
            return

        # Run LatentSync
        latentsync_script = os.path.join(os.path.dirname(__file__), "latentsync", "run_inference_hardcoded.py")
        latentsync_venv_py = os.path.join(os.path.dirname(__file__), "latentsync", "latentsync-venv", "Scripts", "python.exe")
        latentsync_python = latentsync_venv_py if os.path.exists(latentsync_venv_py) else (INFER_PYTHON if INFER_PYTHON else sys.executable)
        latentsync_cwd = os.path.join(os.path.dirname(__file__), "latentsync")
        latentsync_cmd = [latentsync_python, latentsync_script, "--video-path", saved_video, "--audio-path", out_wav, "--video-out-path", out_mp4]
        try:
            logging.info("(bg) running latentsync: %s (cwd=%s)", " ".join(latentsync_cmd), latentsync_cwd)
            # Stream latentsync stdout/stderr to the server terminal in real-time
            proc2 = subprocess.Popen(latentsync_cmd, cwd=latentsync_cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            try:
                if proc2.stdout is not None:
                    for line in proc2.stdout:
                        logging.info("(bg) latentsync: %s", line.rstrip())
                proc2.wait()
            except Exception:
                logging.exception("(bg) error while streaming latentsync output for run %s", run_id)
                try:
                    proc2.kill()
                except Exception:
                    pass

            logging.info("(bg) latentsync rc=%s", proc2.returncode)
            if proc2.returncode != 0:
                logging.error("(bg) latentsync failed for run %s", run_id)
                return

            logging.info("(bg) latentsync finished for run %s, output=%s", run_id, out_mp4)
        except Exception:
            logging.exception("(bg) latentsync subprocess failed for run %s", run_id)
            return

    # start the background task and return immediately
    background_tasks.add_task(_run_video_job)

    return {"message": "Video generation started.", "run_id": run_id, "job_id": run_id}


# API endpoint to retrieve generated audio for a run (returns 404 until file exists)
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import HTTPException, Response

@app.get("/api/jobs/{job_id}/audio")
def get_job_audio(job_id: str):
    """Serve the generated_out.wav for the provided run_id when available.
    Returns 404 if the file is not yet present.
    """
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    run_dir = os.path.join(runs_root, job_id)
    out_wav = os.path.join(run_dir, 'generated_out.wav')

    if os.path.exists(out_wav) and os.path.isfile(out_wav):
        # Stream the file back to the client. Set Content-Disposition to
        # inline and add CORS expose headers so browsers can fetch the blob
        # via XHR/fetch and access it from JavaScript.
        resp = FileResponse(out_wav, media_type='audio/wav', filename='generated_out.wav')
        # prefer explicit inline so browsers don't force a download when
        # navigating to the URL; fetch() still works either way but some
        # clients are sensitive to attachment vs inline semantics.
        resp.headers['Content-Disposition'] = 'inline; filename="generated_out.wav"'
        # Ensure frontend can access the response when fetched cross-origin.
        resp.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Expose-Headers'] = 'Content-Disposition,Content-Length'
        return resp
    else:
        # Let the client poll until the file appears
        raise HTTPException(status_code=404, detail="not ready")


@app.get("/api/jobs/{job_id}/video")
def get_job_video(job_id: str):
    """Serve the final output mp4 for the provided run_id when available.
    Returns 404 until the file exists.
    """
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    run_dir = os.path.join(runs_root, job_id)
    out_mp4 = os.path.join(run_dir, 'final_output.mp4')

    if os.path.exists(out_mp4) and os.path.isfile(out_mp4):
        # Ensure the file is fully written (avoid serving a partially-written file)
        # Some tools write files atomically, others write progressively; polling clients
        # may observe the file as "exists" while it's still being written which can
        # lead to Content-Length mismatches in the browser. Wait for the file size to
        # stabilize before returning it.
        stable_checks = 5
        stable_interval = 0.2
        last_size = -1
        for i in range(stable_checks):
            try:
                size = os.path.getsize(out_mp4)
            except Exception:
                size = -1
            logging.info("get_job_video: check %d/%d size=%d", i + 1, stable_checks, size)
            if size == last_size and size > 0:
                logging.info("get_job_video: file size stable (%d bytes) after %d checks", size, i + 1)
                break
            last_size = size
            time.sleep(stable_interval)

        resp = FileResponse(out_mp4, media_type='video/mp4', filename='final_output.mp4')
        resp.headers['Content-Disposition'] = 'inline; filename="final_output.mp4"'
        # CORS is configured globally via middleware; keep these for legacy clients
        resp.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Expose-Headers'] = 'Content-Disposition,Content-Length'
        return resp
    else:
        raise HTTPException(status_code=404, detail="not ready")


@app.get("/api/jobs/{job_id}/video/fallback")
def get_job_video_fallback(job_id: str):
    """Fallback endpoint: directly read the run folder and return any MP4 found.

    Use this when the primary `/api/jobs/{job_id}/video` path errors but the
    video file exists on disk. This is a pragmatic patch for development and
    debugging; consider removing or restricting it in production.
    """
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    run_dir = os.path.join(runs_root, job_id)
    if not os.path.exists(run_dir) or not os.path.isdir(run_dir):
        raise HTTPException(status_code=404, detail="run not found")

    # Serve exactly the run's final_output.mp4. This fallback intentionally
    # avoids guessing or picking other files — the run directory for the
    # provided job_id must contain final_output.mp4.
    final_mp4 = os.path.join(run_dir, 'final_output.mp4')
    if not (os.path.exists(final_mp4) and os.path.isfile(final_mp4)):
        raise HTTPException(status_code=404, detail="final_output.mp4 not found for run")

    try:
        size = os.path.getsize(final_mp4)
    except Exception:
        size = None

    logging.info("Fallback video serve for run %s -> %s (size=%s) ", job_id, final_mp4, size)

    # Use FileResponse which supports Range requests and HEAD automatically.
    resp = FileResponse(final_mp4, media_type='video/mp4', filename=os.path.basename(final_mp4))
    resp.headers['Content-Disposition'] = f'inline; filename="{os.path.basename(final_mp4)}"'
    resp.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    resp.headers['Access-Control-Allow-Credentials'] = 'true'
    resp.headers['Access-Control-Expose-Headers'] = 'Content-Disposition,Content-Length'
    if size is not None:
        resp.headers['Content-Length'] = str(size)
    return resp


@app.head("/api/jobs/{job_id}/video/fallback")
def head_job_video_fallback(job_id: str):
    """Respond to HEAD requests for the fallback video URL. Some clients
    prefer to probe existence via HEAD. Return 200 with the same headers
    (Content-Length, Content-Disposition) when the file exists, otherwise 404.
    """
    runs_root = os.path.join(os.path.dirname(__file__), "runs")
    run_dir = os.path.join(runs_root, job_id)
    if not os.path.exists(run_dir) or not os.path.isdir(run_dir):
        raise HTTPException(status_code=404, detail="run not found")

    final_mp4 = os.path.join(run_dir, 'final_output.mp4')
    if not (os.path.exists(final_mp4) and os.path.isfile(final_mp4)):
        raise HTTPException(status_code=404, detail="final_output.mp4 not found for run")

    try:
        size = os.path.getsize(final_mp4)
    except Exception:
        size = None

    headers = {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Expose-Headers': 'Content-Disposition,Content-Length',
    }
    if size is not None:
        headers['Content-Length'] = str(size)
    headers['Content-Disposition'] = f'inline; filename="{os.path.basename(final_mp4)}"'

    return Response(status_code=200, headers=headers)


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
