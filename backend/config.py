from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    environment: str = "development"  # development | production — start-prod.bat이 production으로 오버라이드
    app_name: str = "AU Inc. 시험평가팀 시스템"
    database_url: str = "sqlite:///./au_test_system.db"
    secret_key: str = "au-inc-secret-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8시간
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20

settings = Settings()
