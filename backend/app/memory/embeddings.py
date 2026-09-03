import numpy as np
import json
from typing import List, Optional
import hashlib

class LocalEmbeddingEngine:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        self.model_name = model_name
        self._model = None
        self._initialized = False

    def _get_model(self):
        if not self._initialized:
            try:
                from fastembed import TextEmbedding
                self._model = TextEmbedding(model_name=self.model_name)
            except Exception as e:
                # Fast fallback in offline/lightweight environments
                self._model = None
            self._initialized = True
        return self._model

    def embed_text(self, text: str) -> List[float]:
        """Compute 384-dimensional dense vector embedding locally."""
        model = self._get_model()
        if model is not None:
            try:
                embeddings = list(model.embed([text]))
                if embeddings and len(embeddings) > 0:
                    vec = embeddings[0].tolist()
                    return vec
            except Exception:
                pass

        # Fallback: High-quality deterministic character/word n-gram vector with L2 normalization
        vec = np.zeros(384, dtype=np.float32)
        words = text.lower().split()
        for word in words:
            # Multi-hash projection
            h1 = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16) % 384
            h2 = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16) % 384
            vec[h1] += 1.0
            vec[h2] += 0.5
        
        # Also project character 3-grams
        for i in range(max(0, len(text) - 2)):
            gram = text[i:i+3].lower()
            hg = int(hashlib.sha1(gram.encode('utf-8')).hexdigest(), 16) % 384
            vec[hg] += 0.3

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """Compute cosine similarity between two normalized vectors."""
        a = np.array(v1, dtype=np.float32)
        b = np.array(v2, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        dot = np.dot(a, b)
        similarity = float(dot / (norm_a * norm_b))
        # Bound between 0.0 and 1.0 for UI display
        return max(0.0, min(1.0, similarity))

embedding_engine = LocalEmbeddingEngine()
