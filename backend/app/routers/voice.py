import io
import json
import base64
import logging
import httpx
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.storage.repository import LifedRepository
from backend.app.config import settings

logger = logging.getLogger("lifed.voice")

router = APIRouter(prefix="/api/voice", tags=["Voice"])

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 100:
        return {"text": "", "status": "empty_audio"}

    content_type = file.content_type or "audio/wav"

    repo = LifedRepository(db)
    user = repo.get_default_user()
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}

    gemini_key = prefs.get("gemini_api_key") or settings.gemini_api_key

    # 1. Try Gemini Multimodal Speech Transcription
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
                                return {"text": text, "source": "gemini"}
        except Exception as e:
            logger.warning(f"Gemini voice transcription error: {e}")

    # 2. Try SpeechRecognition with AudioFile
    try:
        import speech_recognition as sr
        recognizer = sr.Recognizer()
        with io.BytesIO(audio_bytes) as audio_file:
            try:
                with sr.AudioFile(audio_file) as source:
                    audio_data = recognizer.record(source)
                    text = recognizer.recognize_google(audio_data)
                    if text:
                        return {"text": text, "source": "speech_recognition"}
            except Exception as e:
                logger.debug(f"SpeechRecognition note: {e}")
    except Exception as e:
        logger.warning(f"Local speech recognition failed: {e}")

    return {"text": "", "status": "no_speech_detected"}
