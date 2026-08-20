import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


load_dotenv()


# Use PostgreSQL if DATABASE_URL exists,
# otherwise fall back to local SQLite.
DATABASE_URL = (
    os.getenv("DATABASE_URL")
    or f"sqlite:///{Path(__file__).with_name('internveri_demo.db')}"
)


# SQLite needs this option; PostgreSQL does not.
engine_args = (
    {"connect_args": {"check_same_thread": False}}
    if DATABASE_URL.startswith("sqlite")
    else {}
)


engine = create_engine(
    DATABASE_URL,
    **engine_args
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()