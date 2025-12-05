import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env explicitly
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from app.db import engine
from sqlalchemy import text

def migrate():
    print(f"Connecting to: {os.getenv('DATABASE_URL')}")
    with engine.connect() as conn:
        try:
            # Add parent_id
            conn.execute(text("ALTER TABLE phase_details ADD COLUMN parent_id INT NULL;"))
            conn.execute(text("ALTER TABLE phase_details ADD CONSTRAINT fk_phase_details_parent FOREIGN KEY (parent_id) REFERENCES phase_details(id) ON DELETE CASCADE;"))
            
            # Add item_type
            conn.execute(text("ALTER TABLE phase_details ADD COLUMN item_type VARCHAR(20) DEFAULT 'task';"))
            
            conn.commit()
            print("Successfully added parent_id and item_type columns.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
