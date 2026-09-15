from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    zhipu_api_key: str = ""
    zhipu_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    zhipu_chat_model: str = "glm-4-flash"
    zhipu_embedding_model: str = "embedding-2"
    asr_endpoint: str = ""
    chroma_persist_dir: str = "./chroma_data"
    java_backend_url: str = "http://localhost:8080"
    app_name: str = "enterprise-pilot-ai"
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
