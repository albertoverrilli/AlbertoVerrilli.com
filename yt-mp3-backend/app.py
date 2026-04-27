import os
import re
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

RAPIDAPI_KEY  = os.getenv("RAPIDAPI_KEY", "")
RAPIDAPI_HOST = "youtube-mp36.p.rapidapi.com"


def extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/convert")
async def convert(url: str):
    if not url or ("youtube.com" not in url and "youtu.be" not in url):
        raise HTTPException(400, "Invalid YouTube URL")

    if not RAPIDAPI_KEY:
        raise HTTPException(500, "RAPIDAPI_KEY environment variable not set on the server")

    video_id = extract_video_id(url)
    if not video_id:
        raise HTTPException(400, "Could not extract video ID from URL")

    headers = {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"https://{RAPIDAPI_HOST}/dl",
            params={"id": video_id},
            headers=headers,
        )

    if resp.status_code != 200:
        raise HTTPException(502, f"RapidAPI error {resp.status_code}: {resp.text}")

    data = resp.json()
    status = data.get("status")

    if status == "ok":
        return JSONResponse({
            "download_url": data["link"],
            "filename": f"{data.get('title', 'audio')}.mp3",
        })
    elif status == "processing":
        raise HTTPException(503, "Still processing — please try again in a few seconds")
    else:
        raise HTTPException(502, f"API returned: {data}")
