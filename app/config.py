from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_name: str = "LLH AI Engine"
    app_env: str = "development"
    log_level: str = "INFO"
    llh_engine_shared_secret: str = ""
    llh_engine_allowed_callback_hosts: str = "top-fashion-leather.hatchable.site"
    llh_vton_runtime_module: str = ""
    redis_url: str = "redis://localhost:6379/0"
    max_queue_depth: int = Field(default=8, ge=1, le=64)
    job_ttl_seconds: int = Field(default=3600, ge=60, le=86400)
    max_image_pixels: int = Field(default=24_000_000, ge=1_000_000)
    max_image_bytes: int = Field(default=12_582_912, ge=1024, le=50_000_000)
    request_max_skew_seconds: int = Field(default=300, ge=30, le=900)

    @property
    def callback_hosts(self) -> set[str]:
        return {h.strip().lower() for h in self.llh_engine_allowed_callback_hosts.split(",") if h.strip()}

@lru_cache
def get_settings() -> Settings:
    return Settings()
