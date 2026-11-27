from importlib import import_module
from typing import Any
from app.config import get_settings

class RuntimeNotReady(RuntimeError):
    pass

class VtonRuntime:
    """Fail-closed adapter for a pinned local model runtime."""
    def __init__(self) -> None:
        self._runtime: Any | None = None

    def load(self) -> None:
        module_path = get_settings().llh_vton_runtime_module.strip()
        if not module_path:
            raise RuntimeNotReady("Local VTON runtime has not been installed")
        try:
            module_name, class_name = module_path.rsplit(":", 1)
            runtime_class = getattr(import_module(module_name), class_name)
            runtime = runtime_class()
            runtime.load()
            if not runtime.is_ready():
                raise RuntimeNotReady("Local VTON runtime reports not-ready")
            self._runtime = runtime
        except RuntimeNotReady:
            raise
        except Exception as exc:
            raise RuntimeNotReady("Local VTON runtime failed to load") from exc

    @property
    def is_ready(self) -> bool:
        return self._runtime is not None

    def generate(self, *, input_image: bytes, garment_image: bytes, category: str) -> bytes:
        if self._runtime is None:
            raise RuntimeNotReady("Local VTON runtime is not loaded")
        return self._runtime.generate(input_image=input_image,
                                      garment_image=garment_image, category=category)
