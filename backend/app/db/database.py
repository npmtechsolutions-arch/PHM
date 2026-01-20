"""
Database connection and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Create database engine with high-concurrency pool settings
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=50,           # Increased from 10 for high concurrency
    max_overflow=100,       # Increased from 20 - allows burst traffic
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_timeout=30,        # Wait max 30 seconds for connection
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
