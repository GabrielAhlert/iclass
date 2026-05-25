from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://iclass:iclass@db:5432/iclass"
    secret_key: str = "changeme"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"
    public_web_url: str = "http://localhost"

    class Config:
        env_file = ".env"


settings = Settings()
