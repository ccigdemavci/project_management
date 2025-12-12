import sqlite3
import os

"""
This script adds new columns to the 'phase_details' table in the SQLite database if they don't exist.
It is intended to be run manually to migrate the database schema.
"""

DB_PATH = "trex.db"

def add_column(cursor, table, column, type_def):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print(f"Column {column} already exists in {table}")
        else:
            print(f"Error adding {column}: {e}")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    add_column(cursor, "phase_details", "scope", "TEXT")
    add_column(cursor, "phase_details", "reference", "TEXT")
    add_column(cursor, "phase_details", "responsible", "TEXT")
    add_column(cursor, "phase_details", "effort", "REAL")
    add_column(cursor, "phase_details", "unit", "TEXT DEFAULT 'Saat'")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
