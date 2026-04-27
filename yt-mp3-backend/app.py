import os
import json
import uuid
import threading
import time
from pathlib import Path
from queue import Queue, Empty

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp

app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

TMP_DIR = Path("/tmp/yt-mp3")
TMP_DIR.mkdir(exist_ok=True)

# job_id -> {"path": str, "title": str, "created": float}
file_registry: dict = {}
registry_lock = threading.Lock()


def _cleanup_loop():
    while True:
        time.sleep(300)
        now = time.time()
        with registry_lock:
            expired = [jid for jid, info in file_registry.items()
                       if now - info["created"] > 7200]
        for jid in expired:
            with registry_lock:
                info = file_registry.pop(jid, None)
            if info:
                p = Path(info["path"])
                if p.exists():
                    p.unlink(missing_ok=True)


threading.Thread(target=_cleanup_loop, daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/status/{job_id}")
def status(job_id: str):
    with registry_lock:
        info = file_registry.get(job_id)
    if not info:
        return {"status": "not_found"}
    if not Path(info["path"]).exists():
        return {"status": "not_found"}
    return {"status": "ready", "title": info["title"]}


@app.get("/api/convert")
def convert(url: str):
    if not url or ("youtube.com" not in url and "youtu.be" not in url):
        raise HTTPException(400, "Invalid YouTube URL")

    job_id = str(uuid.uuid4())
    output_template = str(TMP_DIR / f"{job_id}.%(ext)s")
    mp3_path = TMP_DIR / f"{job_id}.mp3"
    progress_queue: Queue = Queue()

    def run_download():
        def on_progress(d):
            if d["status"] == "downloading":
                downloaded = d.get("downloaded_bytes", 0)
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                speed = d.get("speed") or 0
                eta = d.get("eta") or 0
                pct = round(downloaded / total * 100, 1) if total else 0
                speed_str = f"{speed / 1024 / 1024:.1f} MB/s" if speed else ""
                eta_str = f"{int(eta) // 60}m {int(eta) % 60}s" if eta else ""
                progress_queue.put({
                    "phase": "downloading",
                    "percent": pct,
                    "speed": speed_str,
                    "eta": eta_str,
                })
            elif d["status"] == "finished":
                progress_queue.put({"phase": "converting", "percent": 0})

        def on_postprocessor(d):
            if d.get("status") == "finished":
                progress_queue.put({"phase": "done", "percent": 100})

        ydl_opts = {
            "format": "bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "outtmpl": output_template,
            "noplaylist": True,
            "progress_hooks": [on_progress],
            "postprocessor_hooks": [on_postprocessor],
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get("title", "audio")
            with registry_lock:
                file_registry[job_id] = {
                    "path": str(mp3_path),
                    "title": title,
                    "created": time.time(),
                }
            progress_queue.put({"phase": "ready", "job_id": job_id, "title": title})
        except Exception as exc:
            progress_queue.put({"phase": "error", "message": str(exc)})

    threading.Thread(target=run_download, daemon=True).start()

    def generate():
        # Send the job_id immediately so clients can reconnect if needed
        yield f"data: {json.dumps({'phase': 'started', 'job_id': job_id})}\n\n"

        while True:
            try:
                item = progress_queue.get(timeout=30)
            except Empty:
                yield "data: {\"phase\": \"heartbeat\"}\n\n"
                continue

            yield f"data: {json.dumps(item)}\n\n"

            if item["phase"] in ("ready", "error"):
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/download/{job_id}")
def download(job_id: str):
    with registry_lock:
        info = file_registry.get(job_id)

    if not info:
        raise HTTPException(404, "Job not found or expired (files are kept for 2 hours)")

    path = Path(info["path"])
    if not path.exists():
        raise HTTPException(404, "File missing — it may have been cleaned up")

    safe_title = "".join(c for c in info["title"] if c.isalnum() or c in " -_").strip()
    filename = f"{safe_title or 'audio'}.mp3"

    return FileResponse(
        path,
        media_type="audio/mpeg",
        filename=filename,
    )
