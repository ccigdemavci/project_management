from app.db import engine, Base
from app.models import PhaseDetailNote
from sqlalchemy import text

def migrate():
    print("Migrating database...")
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
