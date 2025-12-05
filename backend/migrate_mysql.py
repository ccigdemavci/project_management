import sys
import os
from sqlalchemy import text

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from app.db import engine

def migrate():
    print("Starting migration...")
    with engine.connect() as conn:
        # List of columns to add
        columns = [
            ("scope", "VARCHAR(100) NULL"),
            ("reference", "VARCHAR(100) NULL"),
            ("responsible", "VARCHAR(100) NULL"),
            ("effort", "DECIMAL(10, 2) NULL"),
            ("unit", "VARCHAR(20) DEFAULT 'Saat'"),
            ("start_date", "DATETIME NULL"),
            ("end_date", "DATETIME NULL"),
        ]

        for col_name, col_def in columns:
            try:
                # Check if column exists
                check_sql = text(f"""
                    SELECT count(*) 
                    FROM information_schema.columns 
                    WHERE table_name = 'phase_details' 
                    AND column_name = '{col_name}'
                    AND table_schema = DATABASE()
                """)
                result = conn.execute(check_sql).scalar()
                
                if result == 0:
                    print(f"Adding column {col_name}...")
                    alter_sql = text(f"ALTER TABLE phase_details ADD COLUMN {col_name} {col_def}")
                    conn.execute(alter_sql)
                    print(f"Column {col_name} added.")
                else:
                    print(f"Column {col_name} already exists.")
            except Exception as e:
                print(f"Error processing column {col_name}: {e}")

        conn.commit()
    print("Migration finished.")

if __name__ == "__main__":
    migrate()
