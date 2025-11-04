import os
import sys
import pathlib
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv
from app.db import Base, SQLALCHEMY_DATABASE_URL
# --- Proje kökünü PYTHONPATH'e ekle (backend klasörü) ---
BASE_DIR = pathlib.Path(__file__).resolve().parents[1]  # .../backend
sys.path.append(str(BASE_DIR))

# FastAPI modellerini yükle (metadata için)
from app.db import Base
from app import models  # noqa: F401  (tablolar meta'ya kaydolur)

# Alembic config objesi

config = context.config

# URL boşsa otomatik ayarla
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", SQLALCHEMY_DATABASE_URL)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 🟩 hangi modeller izlenecek?
target_metadata = Base.metadata


# .env'i yükle ve DB_URL'i ayarla
load_dotenv(BASE_DIR / ".env")
db_url = os.getenv("DB_URL", "mysql+pymysql://trex:trexpass@127.0.0.1:3306/trexdb")
config.set_main_option("sqlalchemy.url", db_url)

# autogenerate için metadata
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()