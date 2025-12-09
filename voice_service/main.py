"""
Modal VibeVoice TTS Service

Serverless text-to-speech using Microsoft VibeVoice-Realtime-0.5B model.
Deploy with: modal deploy voice_service/main.py
"""

import modal
import base64
import io

# Create Modal app
app = modal.App("qualia-vibevoice")

# Define the container image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install(
        "torch>=2.0.0",
        "torchaudio>=2.0.0",
        "transformers>=4.36.0",
        "soundfile",
        "numpy",
    )
)


@app.cls(
    image=image,
    gpu="T4",  # Use T4 for cost-effective inference
    timeout=60,
    container_idle_timeout=300,  # Keep warm for 5 minutes
    allow_concurrent_inputs=10,
)
class VibeVoiceService:
    """Text-to-Speech service using VibeVoice model."""

    @modal.enter()
    def load_model(self):
        """Load the model on container startup."""
        import torch
        from transformers import AutoProcessor, AutoModelForTextToWaveform

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading VibeVoice model on {self.device}...")

        # Use Microsoft's VibeVoice-Realtime model
        model_id = "microsoft/VibeVoice-Realtime-0.5B"

        try:
            self.processor = AutoProcessor.from_pretrained(model_id)
            self.model = AutoModelForTextToWaveform.from_pretrained(
                model_id,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            ).to(self.device)
            print("VibeVoice model loaded successfully!")
        except Exception as e:
            print(f"Failed to load VibeVoice, falling back to SpeechT5: {e}")
            # Fallback to SpeechT5 if VibeVoice isn't available yet
            from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
            from datasets import load_dataset

            self.processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
            self.model = SpeechT5ForTextToSpeech.from_pretrained(
                "microsoft/speecht5_tts"
            ).to(self.device)
            self.vocoder = SpeechT5HifiGan.from_pretrained(
                "microsoft/speecht5_hifigan"
            ).to(self.device)
            # Load speaker embeddings
            embeddings_dataset = load_dataset(
                "Matthijs/cmu-arctic-xvectors", split="validation"
            )
            self.speaker_embeddings = torch.tensor(
                embeddings_dataset[7306]["xvector"]
            ).unsqueeze(0).to(self.device)
            self.use_fallback = True
            print("Using SpeechT5 fallback")

    @modal.method()
    def synthesize(self, text: str) -> dict:
        """
        Synthesize speech from text.

        Args:
            text: The text to convert to speech

        Returns:
            dict with base64-encoded WAV audio
        """
        import torch
        import soundfile as sf
        import numpy as np

        if not text or not text.strip():
            return {"error": "No text provided"}

        try:
            # Clean up text
            text = text.strip()[:1000]  # Limit length

            if hasattr(self, "use_fallback") and self.use_fallback:
                # SpeechT5 fallback path
                inputs = self.processor(text=text, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    speech = self.model.generate_speech(
                        inputs["input_ids"],
                        self.speaker_embeddings,
                        vocoder=self.vocoder
                    )
                audio_np = speech.cpu().numpy()
                sample_rate = 16000
            else:
                # VibeVoice path
                inputs = self.processor(text=text, return_tensors="pt").to(self.device)
                with torch.no_grad():
                    output = self.model.generate(**inputs)
                audio_np = output.cpu().numpy().squeeze()
                sample_rate = self.processor.sampling_rate

            # Convert to WAV bytes
            buffer = io.BytesIO()
            sf.write(buffer, audio_np, sample_rate, format="WAV")
            buffer.seek(0)

            # Encode as base64
            audio_base64 = base64.b64encode(buffer.read()).decode("utf-8")

            return {
                "audio": audio_base64,
                "sample_rate": sample_rate,
                "duration": len(audio_np) / sample_rate,
            }

        except Exception as e:
            return {"error": str(e)}


@app.function(image=image)
@modal.web_endpoint(method="POST")
def tts(request: dict) -> dict:
    """
    HTTP endpoint for text-to-speech.

    POST body: {"text": "Hello world"}
    Returns: {"audio": "<base64>", "sample_rate": 16000, "duration": 1.5}
    """
    text = request.get("text", "")
    service = VibeVoiceService()
    return service.synthesize.remote(text)


@app.function(image=image)
@modal.web_endpoint(method="GET")
def health() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "qualia-vibevoice"}


if __name__ == "__main__":
    # For local testing
    print("Deploy with: modal deploy voice_service/main.py")
    print("Test locally with: modal run voice_service/main.py")
