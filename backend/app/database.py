"""SQLAlchemy engine + session factory. Supports SQLite and Postgres."""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import get_settings

settings = get_settings()


def _get_engine():
    url = settings.DATABASE_URL
    # Fix for Render/Heroku postgres:// URLs
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        
    if url.startswith("sqlite"):
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
        )
        # Enable WAL mode for better concurrent writes
        @event.listens_for(engine, "connect")
        def set_wal(dbapi_con, _):
            dbapi_con.execute("PRAGMA journal_mode=WAL")
            dbapi_con.execute("PRAGMA foreign_keys=ON")
        return engine
    else:
        return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)


engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
