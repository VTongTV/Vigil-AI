"""SQLAlchemy database engine and session management.

Uses SQLite for simplicity — no external database server needed.
The database file is created at outputs/vigilai.db on first run.
"""

import logging
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.config import settings

logger = logging.getLogger(__name__)

DATABASE_URL = f"sqlite:///{settings.db_path}"


def _ensure_db_directory() -> None:
    """Create the database directory if it doesn't exist."""
    db_dir = settings.db_path.parent
    if not db_dir.exists():
        db_dir.mkdir(parents=True, exist_ok=True)
        logger.info("Created database directory: %s", db_dir)


_ensure_db_directory()

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite: allow cross-thread usage
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models."""

    pass


def get_db():
    """FastAPI dependency that yields a database session.

    Yields:
        SQLAlchemy Session instance.

    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all database tables from ORM models.

    Called during FastAPI lifespan startup.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified at %s", settings.db_path)
