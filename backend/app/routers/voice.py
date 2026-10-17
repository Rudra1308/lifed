import io
import os
import json
import base64
import logging
import tempfile
import subprocess
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Header
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.config import settings

logger = logging.getLogger("lifed.voice")

router = APIRouter(prefix="/api/voice", tags=["Voice"])

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    x_gemini_key: str | None = Header(None, alias="X-Gemini-Key"),
    db: Session = Depends(get_db)
):
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 100:
        return {"text": "", "status": "empty_audio"}

    content_type = file.content_type or "audio/webm"

    repo = LifedRepository(db)
    user = repo.get_default_user()
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}

    gemini_key = x_gemini_key or prefs.get("gemini_api_key") or settings.gemini_api_key

    # 1. Try Gemini Multimodal Speech Transcription if key available
    if gemini_key and gemini_key.strip():
        try:
            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key.strip()}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": content_type,
                                    "data": b64_audio
                                }
                            },
                            {
                                "text": "Transcribe this audio recording verbatim into clear text. Do not add any explanation, metadata, timestamps, or quotes. Output ONLY the transcribed words."
                            }
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "").strip()
                            if text:
                                return {"text": text, "source": "gemini", "status": "success"}
        except Exception as e:
            logger.warning(f"Gemini voice transcription error: {e}")

    # 2. Local/Free SpeechRecognition via ffmpeg conversion & Google Speech API
    temp_in_path = None
    temp_out_path = None
    try:
        import speech_recognition as sr

        # Determine input file extension
        suffix = ".webm"
        if "wav" in content_type:
            suffix = ".wav"
        elif "ogg" in content_type:
            suffix = ".ogg"
        elif "mp4" in content_type or "m4a" in content_type:
            suffix = ".mp4"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_in:
            temp_in.write(audio_bytes)
            temp_in_path = temp_in.name

        temp_out_path = temp_in_path + "_converted.wav"

        # Convert any audio format to 16kHz mono 16-bit PCM WAV using ffmpeg
        cmd = [
            "ffmpeg", "-y",
            "-i", temp_in_path,
            "-ar", "16000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            temp_out_path
        ]
        conv = subprocess.run(cmd, capture_output=True)
        if conv.returncode != 0:
            logger.warning(f"FFmpeg conversion error: {conv.stderr.decode('utf-8', errors='ignore')}")
            # Try piping fallback
            cmd_pipe = ["ffmpeg", "-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", "-f", "wav", "pipe:1"]
            conv_pipe = subprocess.run(cmd_pipe, input=audio_bytes, capture_output=True)
            if conv_pipe.returncode == 0 and len(conv_pipe.stdout) > 44:
                with open(temp_out_path, "wb") as f_out:
                    f_out.write(conv_pipe.stdout)

        if os.path.exists(temp_out_path) and os.path.getsize(temp_out_path) > 100:
            recognizer = sr.Recognizer()
            with sr.AudioFile(temp_out_path) as source:
                recognizer.adjust_for_ambient_noise(source, duration=0.1)
                audio_data = recognizer.record(source)

            try:
                text = recognizer.recognize_google(audio_data, language="en-US")
                if text and text.strip():
                    return {"text": text.strip(), "source": "speech_recognition", "status": "success"}
            except sr.UnknownValueError:
                logger.debug("Speech recognition: No speech could be recognized.")
                return {"text": "", "status": "no_speech_detected"}
            except sr.RequestError as e:
                logger.warning(f"Google speech recognition network error: {e}")
                return {"text": "", "status": "speech_api_error", "detail": str(e)}
    except Exception as e:
        logger.error(f"Speech recognition pipeline error: {e}")
    finally:
        if temp_in_path and os.path.exists(temp_in_path):
            try:
                os.unlink(temp_in_path)
            except Exception:
                pass
        if temp_out_path and os.path.exists(temp_out_path):
            try:
                os.unlink(temp_out_path)
            except Exception:
                pass

    return {"text": "", "status": "no_speech_detected"}
