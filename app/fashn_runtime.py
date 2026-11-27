from io import BytesIO
from pathlib import Path
from PIL import Image
from fashn_vton import TryOnPipeline

class FashnRuntime:
    """Local FASHN VTON v1.5 inference adapter. No remote API calls."""
    def __init__(self) -> None:
        self.pipeline = None
        self.weights_dir = Path("weights")

    def load(self) -> None:
        if not self.weights_dir.exists():
            raise RuntimeError("Model weights directory is missing")
        self.pipeline = TryOnPipeline(weights_dir=str(self.weights_dir))

    def is_ready(self) -> bool:
        return self.pipeline is not None

    def generate(self, *, input_image: bytes, garment_image: bytes, category: str) -> bytes:
        if self.pipeline is None:
            raise RuntimeError("Model is not loaded")
        if category not in {"tops", "bottoms", "one-pieces"}:
            raise ValueError("This model does not support accessory-only try-on")
        with Image.open(BytesIO(input_image)) as source:
            person = source.convert("RGB")
        with Image.open(BytesIO(garment_image)) as source:
            garment = source.convert("RGB")
        result = self.pipeline(person_image=person, garment_image=garment, category=category)
        if not result.images:
            raise RuntimeError("Model returned no images")
        output = BytesIO()
        result.images[0].save(output, format="PNG", optimize=True)
        return output.getvalue()
