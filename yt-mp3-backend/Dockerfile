FROM python:3.11-slim

# ffmpeg is required by yt-dlp for MP3 conversion
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
