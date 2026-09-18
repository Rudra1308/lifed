import pytest
import io
import subprocess

def test_voice_empty_audio(client):
    res = client.post("/api/voice/transcribe", files={"file": ("empty.wav", b"", "audio/wav")})
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "empty_audio"

def test_voice_valid_wav_silent(client):
    # Generate 1-second silence WAV with ffmpeg
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "1", "-f", "wav", "pipe:1"]
    conv = subprocess.run(cmd, capture_output=True)
    wav_bytes = conv.stdout
    assert len(wav_bytes) > 100

    res = client.post("/api/voice/transcribe", files={"file": ("test.wav", wav_bytes, "audio/wav")})
    assert res.status_code == 200
    data = res.json()
    # Since it's silence, it shouldn't crash and should return no_speech_detected or empty text
    assert "text" in data
