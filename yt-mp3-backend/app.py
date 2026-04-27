import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

COBALT_API = "https://api.cobalt.tools"
COBALT_KEY = os.getenv("COBALT_API_KEY", "")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/convert")
async def convert(url: str):
    if not url or ("youtube.com" not in url and "youtu.be" not in url):
        raise HTTPException(400, "Invalid YouTube URL")

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if COBALT_KEY:
        headers["Authorization"] = f"Api-Key {COBALT_KEY}"

    payload = {
        "url": url,
        "downloadMode": "audio",
        "audioFormat": "mp3",
        "audioBitrate": "192",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(COBALT_API, json=payload, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(502, f"Cobalt API error: {resp.status_code} — {resp.text}")

    data = resp.json()
    status = data.get("status")

    if status == "redirect" or status == "stream" or status == "tunnel":
        return JSONResponse({"download_url": data.get("url"), "filename": data.get("filename", "audio.mp3")})
    elif status == "picker":
        # cobalt returns multiple options; take the first audio one
        for item in data.get("picker", []):
            if item.get("type") == "audio":
                return JSONResponse({"download_url": item["url"]})
        return JSONResponse({"download_url": data["picker"][0]["url"]})
    elif status == "error":
        raise HTTPException(400, data.get("error", {}).get("code", "Unknown cobalt error"))
    else:
        raise HTTPException(502, f"Unexpected cobalt response: {data}")
