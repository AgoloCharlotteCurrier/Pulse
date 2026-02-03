from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    XAI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    ALLOWED_DOMAIN: str = "yourdomain.com"
    JWT_SECRET: str = "change-me"
    DATABASE_URL: str = "sqlite:///./pulse.db"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
