from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "AU Inc. 시험평가팀 시스템"
    database_url: str = "sqlite:///./au_test_system.db"
    secret_key: str = "au-inc-secret-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8시간
    upload_dir: str = "./uploads"

settings = Settings()
